/**
 * Application state.
 *
 * Zustand keeps the store flat and selector driven. Side effects that belong to
 * the domain (fetching, socket wiring, GPS lifecycle, offline SOS queue) live
 * here so components stay presentational.
 */
import { create } from 'zustand';
import api, { ApiError, getToken, setToken } from './api.js';
import { getSocket, SOCKET_EVENTS } from './socket.js';
import { rankShelters } from './lib/ranking.js';
import { metresBetween } from './lib/geo.js';
import { filterActiveHazards } from './lib/hazards.js';
import { raiseAlarm } from './lib/alarm.js';
import { readJson, writeJson, readString, writeString } from './lib/storage.js';
import { CHENNAI, GPS_OPTIONS, RERANK_DISTANCE_M, STORAGE_KEYS } from './lib/constants.js';

function initialTheme() {
  const stored = readString(STORAGE_KEYS.theme, '');
  if (stored === 'dark' || stored === 'light') return stored;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function applyThemeClass(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

let toastId = 0;
let watchId = null;
let socketBound = false;

export const useStore = create((set, get) => ({
  /* ----------------------------------------------------------- appearance */
  theme: initialTheme(),
  toggleTheme: () => {
    const theme = get().theme === 'dark' ? 'light' : 'dark';
    writeString(STORAGE_KEYS.theme, theme);
    applyThemeClass(theme);
    set({ theme });
  },

  baseLayer: 'street',
  setBaseLayer: (baseLayer) => set({ baseLayer }),

  /* --------------------------------------------------------------- toasts */
  toasts: [],
  pushToast: (message, variant = 'info', timeout = 4200) => {
    toastId += 1;
    const id = toastId;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    if (timeout > 0) {
      setTimeout(() => get().dismissToast(id), timeout);
    }
    return id;
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  /* ------------------------------------------------------------ connection */
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  setOnline: (online) => set({ online }),
  socketConnected: false,

  /* ------------------------------------------------------------------- gps */
  position: null,
  gpsStatus: 'idle', // idle | prompt | searching | active | denied | demo
  gpsError: null,
  followMode: false,
  usingDemoLocation: false,
  locationPrompted: false,

  setFollowMode: (followMode) => set({ followMode }),
  markLocationPrompted: () => set({ locationPrompted: true, gpsStatus: 'prompt' }),

  useDemoLocation: () => {
    get().stopWatching();
    set({
      position: { ...CHENNAI, accuracy: 40, heading: null, timestamp: Date.now() },
      gpsStatus: 'demo',
      usingDemoLocation: true,
      gpsError: null,
      locationPrompted: true
    });
    get().pushToast('Using the demo location in Chennai', 'info');
    get().refreshRanking(true);
  },

  startWatching: () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      get().pushToast('This browser does not provide location services', 'error');
      get().useDemoLocation();
      return;
    }

    set({ gpsStatus: 'searching', gpsError: null, locationPrompted: true });
    get().stopWatching();

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading:
            typeof pos.coords.heading === 'number' && !Number.isNaN(pos.coords.heading)
              ? pos.coords.heading
              : null,
          timestamp: pos.timestamp
        };
        const previous = get().position;
        set({
          position: next,
          gpsStatus: 'active',
          usingDemoLocation: false,
          gpsError: null
        });

        // Re-rank only after meaningful movement to avoid needless work.
        if (!previous || metresBetween(previous, next) > RERANK_DISTANCE_M) {
          get().refreshRanking();
        }
      },
      (error) => {
        if (error.code === 1) {
          set({
            gpsStatus: 'denied',
            gpsError:
              'Location permission was denied. Enable it in the browser site settings, or continue with the demo location.'
          });
          get().pushToast('Location denied, falling back to the demo location', 'error');
          get().useDemoLocation();
          return;
        }
        if (error.code === 2) {
          set({ gpsStatus: 'denied', gpsError: 'Position unavailable on this device.' });
          get().pushToast('Position unavailable, using the demo location', 'error');
          get().useDemoLocation();
          return;
        }
        if (error.code === 3) {
          set({ gpsStatus: 'searching', gpsError: 'Location request timed out, retrying.' });
          get().pushToast('Location timed out, retrying', 'info');
          setTimeout(() => {
            if (get().gpsStatus === 'searching') get().startWatching();
          }, 2000);
        }
      },
      GPS_OPTIONS
    );
  },

  stopWatching: () => {
    if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
    watchId = null;
  },

  /** Pauses GPS while the tab is hidden to save battery, resumes on return. */
  handleVisibility: () => {
    if (typeof document === 'undefined') return;
    const { gpsStatus, usingDemoLocation } = get();
    if (document.hidden) {
      if (gpsStatus === 'active' || gpsStatus === 'searching') {
        get().stopWatching();
        set({ gpsStatus: 'idle' });
      }
    } else if (!usingDemoLocation && get().locationPrompted && get().gpsStatus === 'idle') {
      get().startWatching();
    }
  },

  /* -------------------------------------------------------------- domain */
  shelters: [],
  hazards: [],
  alerts: [],
  reports: [],
  contacts: [],
  ranked: [],
  loading: { shelters: false, hazards: false, alerts: false, reports: false, contacts: false },
  errors: {},

  selectedDisaster: null,
  setSelectedDisaster: (type) => {
    set((state) => ({ selectedDisaster: state.selectedDisaster === type ? null : type }));
    get().refreshRanking(true);
  },

  activeHazards: () => {
    const { hazards, selectedDisaster } = get();
    return filterActiveHazards(hazards, selectedDisaster);
  },

  setLoading: (key, value) => set((state) => ({ loading: { ...state.loading, [key]: value } })),
  setError: (key, value) => set((state) => ({ errors: { ...state.errors, [key]: value } })),

  loadShelters: async () => {
    get().setLoading('shelters', true);
    try {
      const data = await api.getShelters();
      set({ shelters: data.shelters ?? [] });
      get().setError('shelters', null);
      get().refreshRanking(true);
    } catch (error) {
      get().setError('shelters', error.message);
    } finally {
      get().setLoading('shelters', false);
    }
  },

  loadHazards: async () => {
    get().setLoading('hazards', true);
    try {
      const data = await api.getHazards();
      set({ hazards: data.hazards ?? [] });
      get().setError('hazards', null);
      get().refreshRanking(true);
    } catch (error) {
      get().setError('hazards', error.message);
    } finally {
      get().setLoading('hazards', false);
    }
  },

  loadAlerts: async () => {
    get().setLoading('alerts', true);
    try {
      const data = await api.getAlerts();
      set({ alerts: data.alerts ?? [] });
      get().setError('alerts', null);
    } catch (error) {
      get().setError('alerts', error.message);
    } finally {
      get().setLoading('alerts', false);
    }
  },

  loadReports: async () => {
    get().setLoading('reports', true);
    try {
      const data = await api.getReports();
      set({ reports: data.reports ?? [] });
      get().setError('reports', null);
    } catch (error) {
      get().setError('reports', error.message);
    } finally {
      get().setLoading('reports', false);
    }
  },

  loadContacts: async () => {
    get().setLoading('contacts', true);
    try {
      const data = await api.getContacts();
      set({ contacts: data.contacts ?? [] });
      get().setError('contacts', null);
    } catch (error) {
      get().setError('contacts', error.message);
    } finally {
      get().setLoading('contacts', false);
    }
  },

  /**
   * Recomputes the shelter ranking.
   * Uses the server when online for authoritative scoring and falls back to the
   * identical offline algorithm when the request fails.
   */
  refreshRanking: async (immediate = false) => {
    const { position, selectedDisaster, shelters } = get();
    if (!position) return;

    const localRanked = rankShelters(
      shelters,
      position.lat,
      position.lng,
      get().activeHazards(),
      3
    );
    if (immediate || localRanked.length > 0) {
      set({ ranked: localRanked });
    }

    if (!get().online) return;

    try {
      const data = await api.getNearestShelters({
        lat: position.lat,
        lng: position.lng,
        disaster: selectedDisaster ?? undefined,
        limit: 3
      });
      if (Array.isArray(data.shelters)) {
        set({ ranked: data.shelters });
      }
    } catch {
      // Offline ranking already applied above, so nothing further is needed.
    }
  },

  /* ----------------------------------------------------------------- auth */
  user: null,
  authLoading: false,
  authError: null,

  login: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const data = await api.login(email, password);
      setToken(data.token);
      set({ user: data.user, authLoading: false });
      get().pushToast(`Signed in as ${data.user.name}`, 'success');
      return data.user;
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Sign in failed, please try again';
      set({ authError: message, authLoading: false });
      throw error;
    }
  },

  restoreSession: async () => {
    if (!getToken()) return;
    try {
      const data = await api.me();
      set({ user: data.user });
    } catch {
      setToken(null);
      set({ user: null });
    }
  },

  logout: () => {
    setToken(null);
    set({ user: null });
    get().pushToast('Signed out', 'info');
  },

  /* ------------------------------------------------------- offline SOS queue */
  sosQueue: readJson(STORAGE_KEYS.sosQueue, []),

  queueSos: (payload) => {
    const queue = [...get().sosQueue, { ...payload, queuedAt: new Date().toISOString() }];
    writeJson(STORAGE_KEYS.sosQueue, queue);
    set({ sosQueue: queue });
  },

  /** Attempts to deliver every queued SOS, keeping the ones that still fail. */
  flushSosQueue: async () => {
    const queue = get().sosQueue;
    if (queue.length === 0) return;

    const remaining = [];
    let delivered = 0;
    for (const item of queue) {
      try {
        await api.createSos({
          name: item.name ?? '',
          phone: item.phone ?? '',
          lat: item.lat,
          lng: item.lng,
          message: item.message ?? ''
        });
        delivered += 1;
      } catch {
        remaining.push(item);
      }
    }

    writeJson(STORAGE_KEYS.sosQueue, remaining);
    set({ sosQueue: remaining });
    if (delivered > 0) {
      get().pushToast(
        delivered === 1
          ? 'A queued SOS was delivered'
          : `${delivered} queued SOS messages delivered`,
        'success'
      );
    }
  },

  /* ---------------------------------------------------------------- socket */
  bindSocket: () => {
    if (socketBound) return;
    socketBound = true;
    const socket = getSocket();

    socket.on('connect', () => set({ socketConnected: true }));
    socket.on('disconnect', () => set({ socketConnected: false }));
    socket.on('connect_error', () => set({ socketConnected: false }));

    socket.on(SOCKET_EVENTS.shelterUpdated, ({ shelter }) => {
      if (!shelter) return;
      set((state) => {
        const exists = state.shelters.some((item) => item.id === shelter.id);
        return {
          shelters: exists
            ? state.shelters.map((item) => (item.id === shelter.id ? shelter : item))
            : [...state.shelters, shelter]
        };
      });
      get().refreshRanking();
    });

    socket.on(SOCKET_EVENTS.shelterDeleted, ({ id }) => {
      set((state) => ({ shelters: state.shelters.filter((item) => item.id !== id) }));
      get().refreshRanking(true);
    });

    socket.on(SOCKET_EVENTS.alertNew, ({ alert }) => {
      if (!alert) return;
      set((state) => ({ alerts: [alert, ...state.alerts] }));
      if (alert.severity === 'critical') {
        raiseAlarm();
        get().pushToast(alert.title, 'error', 8000);
      } else {
        get().pushToast(alert.title, 'info');
      }
    });

    socket.on(SOCKET_EVENTS.sosNew, ({ sos }) => {
      if (!sos) return;
      set((state) => ({ sosEvents: [sos, ...(state.sosEvents ?? [])] }));
    });

    socket.on(SOCKET_EVENTS.sosUpdated, ({ sos }) => {
      if (!sos) return;
      set((state) => ({
        sosEvents: (state.sosEvents ?? []).map((item) => (item.id === sos.id ? sos : item))
      }));
    });

    socket.on(SOCKET_EVENTS.reportNew, ({ report }) => {
      if (!report) return;
      set((state) => ({ reports: [report, ...state.reports] }));
    });

    socket.on(SOCKET_EVENTS.reportUpdated, ({ report }) => {
      if (!report) return;
      set((state) => ({
        reports: state.reports.map((item) => (item.id === report.id ? report : item))
      }));
    });

    socket.on(SOCKET_EVENTS.hazardUpdated, () => {
      get().loadHazards();
    });

    socket.on(SOCKET_EVENTS.disasterSimulate, ({ disasterType }) => {
      if (disasterType) {
        set({ selectedDisaster: disasterType });
      }
      get().loadHazards();
      get().refreshRanking(true);
    });
  },

  /* ----------------------------------------------- admin live SOS listing */
  sosEvents: [],
  loadSosEvents: async () => {
    try {
      const data = await api.getSos();
      set({ sosEvents: data.sos ?? [] });
      get().setError('sos', null);
    } catch (error) {
      get().setError('sos', error.message);
    }
  }
}));

/** One-time browser wiring, called from main.jsx. */
export function initialiseApp() {
  const store = useStore.getState();
  applyThemeClass(store.theme);

  store.bindSocket();
  store.restoreSession();
  store.loadShelters();
  store.loadHazards();
  store.loadAlerts();
  store.loadReports();
  store.loadContacts();

  window.addEventListener('online', () => {
    useStore.getState().setOnline(true);
    useStore.getState().flushSosQueue();
  });
  window.addEventListener('offline', () => useStore.getState().setOnline(false));
  document.addEventListener('visibilitychange', () => useStore.getState().handleVisibility());

  if (navigator.onLine) {
    store.flushSosQueue();
  }
}

export default useStore;

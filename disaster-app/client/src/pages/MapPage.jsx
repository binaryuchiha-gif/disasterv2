/**
 * Primary operational view: live map, disaster filters, live feeds and the
 * safest-shelter workflow with routing.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import api from '../api.js';
import MapView from '../components/MapView.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import DisasterChips from '../components/DisasterChips.jsx';
import ShelterCard from '../components/ShelterCard.jsx';
import RoutePanel from '../components/RoutePanel.jsx';
import SosButton from '../components/SosButton.jsx';
import SafetyTipsSheet from '../components/SafetyTipsSheet.jsx';
import LocationGate from '../components/LocationGate.jsx';
import { EarthquakeList, WeatherCard } from '../components/LiveDataCards.jsx';
import { ShelterCardSkeleton } from '../components/Skeleton.jsx';
import { planRoute } from '../lib/routing.js';
import { filterActiveHazards } from '../lib/hazards.js';
import { CHENNAI } from '../lib/constants.js';

export default function MapPage() {
  const { t } = useTranslation();

  const shelters = useStore((state) => state.shelters);
  const reports = useStore((state) => state.reports);
  const ranked = useStore((state) => state.ranked);
  const position = useStore((state) => state.position);
  const selectedDisaster = useStore((state) => state.selectedDisaster);
  const allHazards = useStore((state) => state.hazards);
  const loadingShelters = useStore((state) => state.loading.shelters);
  const refreshRanking = useStore((state) => state.refreshRanking);
  const pushToast = useStore((state) => state.pushToast);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [tipsFor, setTipsFor] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeTarget, setRouteTarget] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [showPanels, setShowPanels] = useState(false);

  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const [quakes, setQuakes] = useState(null);
  const [quakeError, setQuakeError] = useState(null);
  const [quakeLoading, setQuakeLoading] = useState(false);

  const hazards = useMemo(
    () => filterActiveHazards(allHazards, selectedDisaster),
    [allHazards, selectedDisaster]
  );

  const loadWeather = useCallback(async (coords) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      setWeather(await api.getWeather({ lat: coords.lat, lng: coords.lng }));
    } catch (error) {
      setWeatherError(error.message);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const loadQuakes = useCallback(async () => {
    setQuakeLoading(true);
    setQuakeError(null);
    try {
      setQuakes(await api.getEarthquakes());
    } catch (error) {
      setQuakeError(error.message);
    } finally {
      setQuakeLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuakes();
  }, [loadQuakes]);

  /**
   * Weather follows the user, but the position is rounded to two decimals
   * (roughly one kilometre) so a moving GPS fix does not trigger a request on
   * every single update.
   */
  const weatherKey = position ? `${position.lat.toFixed(2)},${position.lng.toFixed(2)}` : null;

  useEffect(() => {
    if (!weatherKey) return;
    const [lat, lng] = weatherKey.split(',').map(Number);
    loadWeather({ lat, lng });
  }, [weatherKey, loadWeather]);

  const handleFindSafest = async () => {
    if (!position) {
      pushToast('Enable location or choose the demo location first', 'info');
      return;
    }
    setSheetOpen(true);
    setRoute(null);
    setRouteTarget(null);
    await refreshRanking(true);
  };

  const handleNavigate = async (shelter) => {
    if (!position) {
      pushToast('A location is required to plan a route', 'info');
      return;
    }
    setRouteTarget(shelter);
    setRouteLoading(true);
    setSheetOpen(true);
    try {
      const planned = await planRoute(
        { lat: position.lat, lng: position.lng },
        { lat: shelter.lat, lng: shelter.lng },
        hazards
      );
      setRoute(planned);
      if (planned.warning) pushToast(planned.warning, 'info', 6000);
      if (planned.latLngs.length >= 2) {
        const lats = planned.latLngs.map(([lat]) => lat);
        const lngs = planned.latLngs.map(([, lng]) => lng);
        setFlyTarget({
          bounds: [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)]
          ]
        });
      }
    } catch {
      pushToast('The route could not be planned', 'error');
    } finally {
      setRouteLoading(false);
    }
  };

  const handleShelterSelect = (shelter) => {
    setFlyTarget({ lat: shelter.lat, lng: shelter.lng, zoom: 16 });
  };

  return (
    <div className="flex h-full flex-col">
      <DisasterChips onSelect={setTipsFor} />

      <div className="relative flex min-h-0 flex-1 lg:flex-row">
        <div className="relative min-h-0 flex-1">
          <MapView
            shelters={shelters}
            hazards={hazards}
            reports={reports}
            earthquakes={quakes?.events ?? []}
            route={route}
            flyTarget={flyTarget}
            onShelterSelect={handleShelterSelect}
            resizeKey={`${sheetOpen}-${showPanels}`}
          >
            <LocationGate />

            {/* Live data panels, collapsible on small screens */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[600] p-3 lg:inset-auto lg:bottom-3 lg:left-3 lg:w-80 lg:p-0">
              <div className="pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setShowPanels((value) => !value)}
                  aria-expanded={showPanels}
                  className="btn-secondary mb-2 w-full shadow-float lg:w-auto"
                >
                  <SlidersHorizontal size={15} aria-hidden="true" />
                  {showPanels ? 'Hide live data' : 'Show live data'}
                </button>

                {showPanels && (
                  <div className="scroll-area max-h-[42vh] space-y-2 overflow-y-auto lg:max-h-[60vh]">
                    <WeatherCard
                      weather={weather}
                      loading={weatherLoading}
                      error={weatherError}
                      onRetry={() => loadWeather(position ?? CHENNAI)}
                    />
                    <EarthquakeList
                      feed={quakes}
                      loading={quakeLoading}
                      error={quakeError}
                      onRetry={loadQuakes}
                      limit={4}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Find safest shelter */}
            <div className="absolute bottom-3 left-1/2 z-[650] w-[min(92%,22rem)] -translate-x-1/2 lg:left-auto lg:right-24 lg:translate-x-0">
              <button
                type="button"
                onClick={handleFindSafest}
                className="btn-primary w-full shadow-float"
              >
                <Search size={17} aria-hidden="true" />
                {t('shelters.findSafest')}
              </button>
            </div>

            <div className="absolute bottom-20 right-3 z-[700] lg:bottom-3">
              <SosButton />
            </div>
          </MapView>
        </div>

        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={t('shelters.title')}
          initialHeight={0.55}
        >
          {loadingShelters && ranked.length === 0 ? (
            <div className="space-y-2">
              <ShelterCardSkeleton />
              <ShelterCardSkeleton />
            </div>
          ) : ranked.length === 0 ? (
            <p className="py-6 text-center text-sm text-navy-500 dark:text-navy-300">
              {t('shelters.empty')}
            </p>
          ) : (
            <div className="space-y-2.5">
              {ranked.map((shelter, index) => (
                <ShelterCard
                  key={shelter.id}
                  shelter={shelter}
                  rank={index + 1}
                  showRecommended
                  showBreakdown
                  onNavigate={handleNavigate}
                  onSelect={handleShelterSelect}
                />
              ))}
            </div>
          )}

          <RoutePanel route={route} destination={routeTarget} loading={routeLoading} />
        </BottomSheet>
      </div>

      <SafetyTipsSheet
        disasterType={tipsFor}
        open={Boolean(tipsFor)}
        onClose={() => setTipsFor(null)}
      />
    </div>
  );
}

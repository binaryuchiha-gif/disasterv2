/**
 * Application chrome: glass header, desktop sidebar and mobile bottom
 * navigation. The map page opts out of page padding so it can fill the frame.
 */
import { NavLink, useLocation } from 'react-router-dom';
import {
  Flag,
  HeartHandshake,
  LayoutDashboard,
  LogIn,
  LogOut,
  Map,
  Moon,
  Phone,
  ShieldAlert,
  Sun,
  Warehouse
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import { changeLanguage, LANGUAGES } from '../i18n.js';
import StatusChips from './StatusChips.jsx';
import AlertBanner from './AlertBanner.jsx';

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.map', Icon: Map },
  { to: '/shelters', labelKey: 'nav.shelters', Icon: Warehouse },
  { to: '/reports', labelKey: 'nav.reports', Icon: Flag },
  { to: '/contacts', labelKey: 'nav.contacts', Icon: Phone },
  { to: '/checkin', labelKey: 'nav.checkin', Icon: HeartHandshake }
];

function LanguagePicker() {
  const { i18n } = useTranslation();
  return (
    <label className="relative">
      <span className="sr-only">Language</span>
      <select
        value={i18n.language}
        onChange={(event) => changeLanguage(event.target.value)}
        className="min-h-[40px] rounded-lg border border-white/20 bg-white/10 px-2 text-xs font-semibold text-white focus-visible:ring-offset-navy-900"
        aria-label="Language"
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code} className="text-navy-900">
            {language.short}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Layout({ children }) {
  const { t } = useTranslation();
  const location = useLocation();
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);

  const isMapPage = location.pathname === '/';
  const navItems =
    user?.role === 'admin'
      ? [...NAV_ITEMS, { to: '/admin', labelKey: 'nav.admin', Icon: LayoutDashboard }]
      : NAV_ITEMS;

  return (
    <div className="flex h-full flex-col">
      <header className="glass-header sticky top-0 z-[1000] shrink-0">
        <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-600">
              <ShieldAlert size={17} aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-bold sm:text-base">{t('app.name')}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden md:block">
              <StatusChips />
            </div>
            <div className="md:hidden">
              <StatusChips compact />
            </div>
            <LanguagePicker />
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-icon text-white hover:bg-white/15"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun size={18} aria-hidden="true" />
              ) : (
                <Moon size={18} aria-hidden="true" />
              )}
            </button>
            {user ? (
              <button
                type="button"
                onClick={logout}
                className="btn-icon text-white hover:bg-white/15"
                aria-label={t('nav.logout')}
                title={`${user.name} (${user.role})`}
              >
                <LogOut size={18} aria-hidden="true" />
              </button>
            ) : (
              <NavLink
                to="/login"
                className="btn-icon text-white hover:bg-white/15"
                aria-label={t('nav.login')}
              >
                <LogIn size={18} aria-hidden="true" />
              </NavLink>
            )}
          </div>
        </div>
        <AlertBanner />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <nav
          className="hidden w-56 shrink-0 flex-col gap-1 border-r border-navy-100 bg-white p-3 dark:border-navy-700 dark:bg-navy-900 lg:flex"
          aria-label="Main navigation"
        >
          {navItems.map(({ to, labelKey, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-navy-900 text-white dark:bg-blue-600'
                    : 'text-navy-700 hover:bg-navy-50 dark:text-navy-100 dark:hover:bg-navy-800'
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <main
          className={`min-h-0 min-w-0 flex-1 ${isMapPage ? '' : 'overflow-y-auto scroll-area'}`}
        >
          {isMapPage ? (
            children
          ) : (
            <div className="mx-auto max-w-5xl p-4 pb-24 lg:pb-6">{children}</div>
          )}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="z-[1000] flex shrink-0 border-t border-navy-100 bg-white dark:border-navy-700 dark:bg-navy-900 lg:hidden"
        aria-label="Main navigation"
      >
        {navItems.map(({ to, labelKey, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-navy-900 dark:text-blue-400' : 'text-navy-400 dark:text-navy-400'
              }`
            }
          >
            <Icon size={19} aria-hidden="true" />
            <span className="truncate px-0.5">{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

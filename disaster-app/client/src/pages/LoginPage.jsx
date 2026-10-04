import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';

const DEMO_ACCOUNTS = [
  { role: 'Administrator', email: 'admin@demo.com', password: 'Admin@123' },
  { role: 'Volunteer', email: 'volunteer@demo.com', password: 'Volunteer@123' }
];

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const login = useStore((state) => state.login);
  const authLoading = useStore((state) => state.authLoading);
  const authError = useStore((state) => state.authError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const roleRequired = location.state?.roleRequired;

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const user = await login(email.trim(), password);
      // Volunteers have no dashboard of their own, so send them to the map.
      navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch {
      // The error message is surfaced from the store below.
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <header className="text-center">
        <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-white dark:bg-blue-600">
          <ShieldAlert size={22} aria-hidden="true" />
        </span>
        <h1 className="text-xl font-bold">{t('auth.title')}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-300">{t('auth.subtitle')}</p>
      </header>

      {roleRequired && (
        <p className="rounded-xl bg-warn-50 p-3 text-sm text-warn-700 dark:bg-warn-500/10 dark:text-warn-400">
          {t('auth.adminOnly')}
        </p>
      )}

      <form onSubmit={handleSubmit} className="card space-y-3 p-5">
        <div>
          <label htmlFor="login-email" className="label">
            {t('auth.email')}
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="login-password" className="label">
            {t('auth.password')}
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            required
          />
        </div>

        {authError && (
          <p
            role="alert"
            className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700 dark:bg-danger-700/10 dark:text-danger-400"
          >
            {authError}
          </p>
        )}

        <button type="submit" disabled={authLoading} className="btn-primary w-full">
          <LogIn size={16} aria-hidden="true" />
          {authLoading ? t('common.loading') : t('auth.submit')}
        </button>
      </form>

      <section className="card p-4">
        <h2 className="text-sm font-bold">{t('auth.demoCredentials')}</h2>
        <ul className="mt-2 space-y-2">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold">{account.role}</p>
                <p className="truncate font-mono text-[11px] text-navy-500 dark:text-navy-300">
                  {account.email} / {account.password}
                </p>
              </div>
              <button
                type="button"
                onClick={() => fillDemo(account)}
                className="btn-secondary min-h-[40px] shrink-0 px-3 text-xs"
              >
                Use
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Phone, Trash2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store.js';
import { EmptyState, ErrorState } from '../components/LiveDataCards.jsx';
import { SkeletonText } from '../components/Skeleton.jsx';
import { STORAGE_KEYS } from '../lib/constants.js';
import { readJson, writeJson } from '../lib/storage.js';

/** Official helplines from the API plus personal contacts held on the device. */
export default function ContactsPage() {
  const { t } = useTranslation();
  const contacts = useStore((state) => state.contacts);
  const loading = useStore((state) => state.loading.contacts);
  const error = useStore((state) => state.errors.contacts);
  const loadContacts = useStore((state) => state.loadContacts);
  const pushToast = useStore((state) => state.pushToast);

  const [personal, setPersonal] = useState([]);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');

  useEffect(() => {
    setPersonal(readJson(STORAGE_KEYS.personalContacts, []));
  }, []);

  const persist = (next) => {
    setPersonal(next);
    writeJson(STORAGE_KEYS.personalContacts, next);
  };

  const handleAdd = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedNumber = number.trim();
    if (!trimmedName || !trimmedNumber) return;

    persist([...personal, { id: Date.now(), label: trimmedName, number: trimmedNumber }]);
    setName('');
    setNumber('');
    pushToast('Contact saved on this device', 'success');
  };

  const handleRemove = (id) => {
    persist(personal.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold">{t('contacts.title')}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-300">
          Official national and district helplines for India.
        </p>
      </header>

      {error && <ErrorState message={error} onRetry={loadContacts} />}

      {loading && contacts.length === 0 ? (
        <div className="card p-4">
          <SkeletonText lines={6} />
        </div>
      ) : (
        <ul className="space-y-2">
          {contacts.map((contact) => (
            <li key={contact.id} className="card flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{contact.label}</p>
                <p className="font-mono text-xs text-navy-500 dark:text-navy-300">
                  {contact.number}
                </p>
              </div>
              <a href={`tel:${contact.number}`} className="btn-safe shrink-0 px-4">
                <Phone size={15} aria-hidden="true" />
                {t('contacts.call')}
              </a>
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-bold">{t('contacts.personal')}</h2>

        {personal.length === 0 ? (
          <EmptyState icon={UserPlus} title={t('contacts.empty')} />
        ) : (
          <ul className="space-y-2">
            {personal.map((contact) => (
              <li key={contact.id} className="card flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{contact.label}</p>
                  <p className="font-mono text-xs text-navy-500 dark:text-navy-300">
                    {contact.number}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a href={`tel:${contact.number}`} className="btn-safe px-4">
                    <Phone size={15} aria-hidden="true" />
                    {t('contacts.call')}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemove(contact.id)}
                    className="btn-icon border border-navy-200 text-navy-500 hover:bg-navy-50 dark:border-navy-600 dark:text-navy-300 dark:hover:bg-navy-700"
                    aria-label={`Remove ${contact.label}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdd} className="card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="label">
                {t('contacts.name')}
              </label>
              <input
                id="contact-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="contact-number" className="label">
                {t('contacts.number')}
              </label>
              <input
                id="contact-number"
                type="tel"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                className="input"
                required
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">
            <UserPlus size={16} aria-hidden="true" />
            {t('contacts.addPersonal')}
          </button>
        </form>
      </section>
    </div>
  );
}

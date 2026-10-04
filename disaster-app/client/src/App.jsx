import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout.jsx';
import ToastHost from './components/Toast.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import MapPage from './pages/MapPage.jsx';
import SheltersPage from './pages/SheltersPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import CheckInPage from './pages/CheckInPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import QrCheckInPage from './pages/QrCheckInPage.jsx';
import SituationReportPage from './pages/SituationReportPage.jsx';

function NotFound() {
  return (
    <div className="card p-6 text-center">
      <h1 className="text-lg font-bold">Page not found</h1>
      <p className="mt-1 text-sm text-navy-500 dark:text-navy-300">
        The address you requested does not exist in this application.
      </p>
    </div>
  );
}

/**
 * Wraps a page in a fade and lift transition.
 * The map page opts out because animating a transform on the map container
 * causes Leaflet to mis-measure its size during the transition.
 */
function PageTransition({ children, animate = true }) {
  if (!animate) return children;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <>
      <Layout>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PageTransition animate={false}>
                  <MapPage />
                </PageTransition>
              }
            />
            <Route
              path="/shelters"
              element={
                <PageTransition>
                  <SheltersPage />
                </PageTransition>
              }
            />
            <Route
              path="/reports"
              element={
                <PageTransition>
                  <ReportsPage />
                </PageTransition>
              }
            />
            <Route
              path="/contacts"
              element={
                <PageTransition>
                  <ContactsPage />
                </PageTransition>
              }
            />
            <Route
              path="/checkin"
              element={
                <PageTransition>
                  <CheckInPage />
                </PageTransition>
              }
            />
            <Route
              path="/checkin/:shelterId"
              element={
                <PageTransition>
                  <QrCheckInPage />
                </PageTransition>
              }
            />
            <Route
              path="/login"
              element={
                <PageTransition>
                  <LoginPage />
                </PageTransition>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireRole="admin">
                  <PageTransition>
                    <AdminDashboard />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/report"
              element={
                <ProtectedRoute requireRole="admin">
                  <PageTransition>
                    <SituationReportPage />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <PageTransition>
                  <NotFound />
                </PageTransition>
              }
            />
          </Routes>
        </AnimatePresence>
      </Layout>
      <ToastHost />
    </>
  );
}

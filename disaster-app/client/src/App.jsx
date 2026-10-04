import { Route, Routes } from 'react-router-dom';
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

export default function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/shelters" element={<SheltersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/checkin" element={<CheckInPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
      <ToastHost />
    </>
  );
}

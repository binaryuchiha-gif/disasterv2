import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useStore from '../store.js';
import { getToken } from '../api.js';
import { SkeletonText } from './Skeleton.jsx';

/**
 * Guards administrator routes.
 * While a stored token is being validated a placeholder is shown so the user is
 * not bounced to the sign-in page during a page refresh.
 */
export default function ProtectedRoute({ children, requireRole = 'admin' }) {
  const user = useStore((state) => state.user);
  const location = useLocation();
  const [checking, setChecking] = useState(Boolean(getToken()) && !user);

  useEffect(() => {
    if (!getToken() || user) {
      setChecking(false);
      return undefined;
    }
    // restoreSession runs at start-up; wait briefly for it to settle.
    const timer = setTimeout(() => setChecking(false), 1200);
    return () => clearTimeout(timer);
  }, [user]);

  if (user && (!requireRole || user.role === requireRole)) {
    return children;
  }

  if (checking) {
    return (
      <div className="card p-6">
        <SkeletonText lines={4} />
      </div>
    );
  }

  if (user && requireRole && user.role !== requireRole) {
    return <Navigate to="/login" state={{ from: location.pathname, roleRequired: true }} replace />;
  }

  return <Navigate to="/login" state={{ from: location.pathname }} replace />;
}

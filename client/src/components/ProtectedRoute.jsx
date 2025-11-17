import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Loader from './shared/Loader.jsx';

const ProtectedRoute = () => {
  const { token, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="page-center">
        <Loader label="Preparing chat experience..." />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;




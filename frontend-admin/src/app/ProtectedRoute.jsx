import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }){
  const { user, loading } = useAuth();

  // Show nothing while loading 
  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;

  }

  return children; 
}

export default ProtectedRoute


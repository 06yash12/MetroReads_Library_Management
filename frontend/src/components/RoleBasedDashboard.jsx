import { useAuth } from '../contexts/AuthContext';
import AdminDashboard from '../pages/AdminDashboard';
import LibrarianDashboard from '../pages/LibrarianDashboard';
import LoadingSpinner from './LoadingSpinner';

const RoleBasedDashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (!user) {
    return <div>Please log in to access the dashboard.</div>;
  }

  // Route based on user role
  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'LIBRARIAN':
      return <LibrarianDashboard />;
    default:
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to access the admin dashboard.
            </p>
          </div>
        </div>
      );
  }
};

export default RoleBasedDashboard;
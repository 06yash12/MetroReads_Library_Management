import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Home from './pages/Home';
import BookDetails from './pages/BookDetails';
import Login from './pages/Login';
import LoginSelect from './pages/LoginSelect';
import AdminLogin from './pages/AdminLogin';
import LibrarianLogin from './pages/LibrarianLogin';
import Signup from './pages/Signup';
import MyLoans from './pages/MyLoans';
import AdminBookForm from './pages/AdminBookForm';
import RoleBasedDashboard from './components/RoleBasedDashboard';
import MemberDashboard from './pages/MemberDashboard';
import FAQ from './pages/FAQ';
import About from './pages/About';
import Cities from './pages/Cities';

const App = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/books/:id" element={<BookDetails />} />
          <Route path="/login-select" element={<LoginSelect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/librarian" element={<LibrarianLogin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/cities" element={<Cities />} />
          
          {/* Member Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <MemberDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-loans" 
            element={
              <ProtectedRoute>
                <MyLoans />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin/Librarian Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireAdminOrLibrarian={true}>
                <RoleBasedDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/books/new" 
            element={
              <ProtectedRoute requireAdminOrLibrarian={true}>
                <AdminBookForm />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/books/:id/edit" 
            element={
              <ProtectedRoute requireAdminOrLibrarian={true}>
                <AdminBookForm />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App
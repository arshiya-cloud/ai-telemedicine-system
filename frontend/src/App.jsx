import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import AdminDashboard from './pages/AdminDashboard';
import DoctorBooking from './pages/DoctorBooking';
import PaymentPage from './pages/PaymentPage';
import './index.css';

const PrivateRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2 style={{ color: 'red' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
        <a href="/dashboard">Return to Dashboard</a>
      </div>
    );
  }
  return children;
};

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  return (
    <nav>
      <h2>Trusted care, anytime anywhere </h2>
      {user && <button style={{ width: 'auto', background: 'white', color: '#007bff86' }} onClick={logout}>Logout</button>}
    </nav>
  );
};

const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="app-container" style={isAdminRoute ? { display: 'block', minHeight: '100vh' } : {}}>
      {!isAdminRoute && <Navbar />}
      <main style={isAdminRoute ? { padding: 0 } : {}}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/doctor/:doctorId/book" element={<PrivateRoute><DoctorBooking /></PrivateRoute>} />
          <Route path="/payment" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
          <Route path="/chat/:appointmentId" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;

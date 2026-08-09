import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VerifyVoice from './pages/VerifyVoice';

const ProtectedRoute = ({ children }) => {
  const { session, loading } = useAuth();

  // While session is being restored from storage, render nothing
  // to avoid a flash-redirect to /login on page reload
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#FDF5D7',       // surface — soft cream
              color: '#2A160D',            // primary — chocolate brown
              border: '1.5px solid #2A160D',
              borderRadius: '8px',
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '13px',
              fontWeight: '500',
              boxShadow: '3px 3px 0px #2A160D',  // brutalist hard shadow
              padding: '10px 14px',
            },
            success: {
              iconTheme: {
                primary: '#5A301E',   // accent — deep cocoa
                secondary: '#FDF5D7', // surface
              },
            },
            error: {
              iconTheme: {
                primary: '#B42318',   // danger — burnt red
                secondary: '#FDF5D7',
              },
              style: {
                border: '1.5px solid #B42318',
                boxShadow: '3px 3px 0px #B42318',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<VerifyVoice />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

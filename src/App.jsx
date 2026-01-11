import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Horses from './pages/Horses';
import HorseDetail from './pages/HorseDetail';
import Players from './pages/Players';
import Practices from './pages/Practices';
import PracticeDetail from './pages/PracticeDetail';
import PublicPractices from './pages/PublicPractices';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route - no login required */}
          <Route path="/proximas" element={<PublicPractices />} />
          
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/horses" replace />} />
            <Route path="horses" element={<Horses />} />
            <Route path="horses/:id" element={<HorseDetail />} />
            <Route path="players" element={<Players />} />
            <Route path="practices" element={<Practices />} />
            <Route path="practices/:id" element={<PracticeDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

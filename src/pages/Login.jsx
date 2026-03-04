import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Admin email - only this user can access admin panel
const ADMIN_EMAIL = 'lolibunge@gmail.com';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let userCred;
      if (isSignup) {
        userCred = await signup(email, password);
      } else {
        userCred = await login(email, password);
      }
      // Use authenticated user email for admin check
      const userEmail = userCred?.user?.email || email;
      if (userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        navigate('/horses');
      } else {
        if (from && typeof from === 'string' && from.startsWith('/proximas')) {
          navigate(from);
        } else {
          navigate('/proximas');
        }
      }
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/invalid-email':
        return 'Correo electrónico inválido.';
      case 'auth/user-disabled':
        return 'Esta cuenta ha sido deshabilitada.';
      case 'auth/user-not-found':
        return 'No existe una cuenta con este correo.';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta.';
      case 'auth/email-already-in-use':
        return 'Ya existe una cuenta con este correo.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/invalid-credential':
        return 'Correo o contraseña inválidos.';
      default:
        return 'Ocurrió un error. Intenta nuevamente.';
    }
  };

  // Show setup instructions if Firebase isn't configured
  if (!isFirebaseConfigured) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <span className="login-icon">🐎</span>
            <h1>Polo Planner</h1>
            <p>Gestión de prácticas, carga de trabajo y bienestar de caballos</p>
          </div>

          <div className="setup-instructions">
            <h3>⚙️ Firebase Setup Required</h3>
            <p>To get started, you need to configure Firebase:</p>
            <ol>
              <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
              <li>Create a new project (or use existing)</li>
              <li>Enable <strong>Authentication</strong> → Email/Password</li>
              <li>Create a <strong>Firestore Database</strong></li>
              <li>Go to Project Settings → Your apps → Web app</li>
              <li>Copy the config values to your <code>.env.local</code> file</li>
            </ol>
            <div className="env-example">
              <strong>.env.local file:</strong>
              <pre>{`VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123`}</pre>
            </div>
            <p className="setup-note">After updating <code>.env.local</code>, restart the dev server.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">🐎</span>
          <h1>Polo Planner</h1>
          <p>Gestión de prácticas, carga de trabajo y bienestar de caballos</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Por favor espera...' : (isSignup ? 'Crear cuenta' : 'Iniciar sesión')}
          </button>
        </form>

        <div className="login-footer">
          <button 
            type="button" 
            className="btn-link"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );
}

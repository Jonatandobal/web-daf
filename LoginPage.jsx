// LoginPage.jsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase.js';

const LoginPage = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // El usuario será redirigido automáticamente por onAuthStateChanged en App.jsx
    } catch (err) {
      setError('Error al iniciar sesión. Verifica tus credenciales.');
      console.error('Error de login:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ct-shell flex items-center justify-center p-4">
      <div className="ct-panel w-full max-w-sm">
        <div className="ct-bar">
          <span className="ct-title">Coffee Break</span>
          <span className="ct-label-inv">DAF</span>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 p-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-neutral-500">Ingresá con tu cuenta para armar un pedido.</p>
          </div>

          <label className="block">
            <span className="ct-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu-email@udesa.edu.ar"
              className="ct-input mt-2"
            />
          </label>

          <label className="block">
            <span className="ct-label">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="ct-input mt-2"
            />
          </label>

          {error && <p className="ct-note font-medium">{error}</p>}

          <button type="submit" disabled={loading} className="ct-btn-solid w-full">
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div className="border-t border-neutral-200 px-6 py-4 text-center">
          <p className="text-sm text-neutral-500">
            ¿No tenés cuenta?{' '}
            <button
              onClick={onSwitchToRegister}
              className="font-medium text-neutral-900 underline underline-offset-4 transition hover:text-neutral-600"
            >
              Registrate
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
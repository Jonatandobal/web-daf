// RegisterPage.jsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase.js';

const RegisterPage = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // El usuario será redirigido automáticamente por onAuthStateChanged en App.jsx
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email ya está registrado. Intenta iniciar sesión.');
      } else if (err.code === 'auth/invalid-email') {
        setError('El email no es válido.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña es muy débil. Debe tener al menos 6 caracteres.');
      } else {
        setError('Error al registrarse. Intenta nuevamente.');
      }
      console.error('Error de registro:', err);
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

        <form onSubmit={handleRegister} className="space-y-5 p-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Crear cuenta</h1>
            <p className="mt-1 text-sm text-neutral-500">Registrate para poder cargar pedidos.</p>
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
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="ct-input mt-2"
            />
          </label>

          <label className="block">
            <span className="ct-label">Repetir contraseña</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Repetí tu contraseña"
              className="ct-input mt-2"
            />
          </label>

          {error && <p className="ct-note font-medium">{error}</p>}

          <button type="submit" disabled={loading} className="ct-btn-solid w-full">
            {loading ? 'Registrando…' : 'Registrarme'}
          </button>
        </form>

        <div className="border-t border-neutral-200 px-6 py-4 text-center">
          <p className="text-sm text-neutral-500">
            ¿Ya tenés cuenta?{' '}
            <button
              onClick={onSwitchToLogin}
              className="font-medium text-neutral-900 underline underline-offset-4 transition hover:text-neutral-600"
            >
              Iniciá sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

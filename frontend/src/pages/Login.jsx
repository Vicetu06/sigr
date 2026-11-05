import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { usuario, login, registrar } = useAuth();
  const navegar = useNavigate();
  const [modoRegistro, setModoRegistro] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState('');

  if (usuario) return <Navigate to="/menu" replace />;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    try {
      if (modoRegistro) await registrar(form.nombre, form.email, form.password);
      else await login(form.email, form.password);
      navegar('/menu');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="tarjeta formulario" onSubmit={enviar}>
      <h1>{modoRegistro ? 'Crear cuenta de cliente' : 'Iniciar sesión'}</h1>
      {modoRegistro && (
        <label>Nombre
          <input name="nombre" value={form.nombre} onChange={cambiar} required />
        </label>
      )}
      <label>Correo
        <input name="email" type="email" value={form.email} onChange={cambiar} required />
      </label>
      <label>Contraseña
        <input name="password" type="password" minLength={8} value={form.password} onChange={cambiar} required />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit">{modoRegistro ? 'Registrarme' : 'Entrar'}</button>
      <button type="button" className="enlace" onClick={() => setModoRegistro(!modoRegistro)}>
        {modoRegistro ? 'Ya tengo cuenta' : 'No tengo cuenta: registrarme'}
      </button>
    </form>
  );
}

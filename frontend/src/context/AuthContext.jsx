import { createContext, useContext, useState } from 'react';
import { api, sesion } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => sesion.leer()?.usuario || null);

  async function entrar(ruta, cuerpo) {
    const datos = await api.post(ruta, cuerpo);
    sesion.guardar(datos);
    setUsuario(datos.usuario);
    return datos.usuario;
  }

  const login = (email, password) => entrar('/auth/login', { email, password });
  const registrar = (nombre, email, password) => entrar('/auth/register', { nombre, email, password });

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* si el token ya expiro, igual se limpia la sesion local */
    }
    sesion.borrar();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

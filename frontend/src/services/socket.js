import { io } from 'socket.io-client';
import { sesion } from './api.js';

// Conexion Socket.IO autenticada con el mismo JWT de la API
export function conectarSocket() {
  const datos = sesion.leer();
  return io({ auth: { token: datos?.token }, transports: ['websocket', 'polling'] });
}

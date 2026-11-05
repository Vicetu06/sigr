import { verificarToken } from '../middlewares/auth.js';

// Sala a la que se unen meseros y administradores (la "cocina" es una vista del personal)
const SALA_PERSONAL = 'personal';

export function configurarSockets(io) {
  // Autenticacion del socket con el mismo JWT de la API
  io.use((socket, next) => {
    try {
      socket.data.usuario = verificarToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('Token invalido'));
    }
  });

  io.on('connection', (socket) => {
    if (['mesero', 'administrador'].includes(socket.data.usuario.rol)) {
      socket.join(SALA_PERSONAL);
    }
  });
}

// Un pedido nuevo llega a cocina (todo el personal conectado)
export function emitirPedidoNuevo(io, pedido) {
  io?.to(SALA_PERSONAL).emit('pedido:nuevo', pedido);
}

// Cada cambio de estado se notifica, p. ej. 'listo' avisa al mesero
export function emitirPedidoEstado(io, pedido) {
  io?.to(SALA_PERSONAL).emit('pedido:estado', pedido);
}

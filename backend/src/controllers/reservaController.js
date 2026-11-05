import * as Reservas from '../models/reservaModel.js';
import { HttpError } from '../middlewares/errores.js';

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function validarFechaHora(fecha, hora) {
  if (!FECHA_RE.test(fecha || '')) throw new HttpError(400, 'fecha debe tener formato AAAA-MM-DD');
  if (!HORA_RE.test(hora || '')) throw new HttpError(400, 'hora debe tener formato HH:MM');
}

export async function disponibilidad(req, res) {
  const { fecha, hora, personas } = req.query;
  validarFechaHora(fecha, hora);
  const n = Number(personas);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'personas debe ser un entero mayor a 0');
  res.json(await Reservas.mesasDisponibles(fecha, hora, n));
}

export async function listar(req, res) {
  const esCliente = req.usuario.rol === 'cliente';
  res.json(await Reservas.listar({
    usuarioId: esCliente ? req.usuario.id : undefined,
    fecha: req.query.fecha,
  }));
}

export async function crear(req, res) {
  const { fecha, hora, personas, mesa_id: mesaId } = req.body || {};
  validarFechaHora(fecha, hora);
  if (!Number.isInteger(personas) || personas < 1) throw new HttpError(400, 'personas debe ser un entero mayor a 0');
  const reserva = await Reservas.crear({
    usuarioId: req.usuario.id,
    mesaId: mesaId ? Number(mesaId) : undefined,
    fecha,
    hora,
    personas,
  });
  res.status(201).json(reserva);
}

// Confirmar: solo administrador. Cancelar: administrador o el cliente dueno de la reserva.
export async function cambiarEstado(req, res) {
  const { estado } = req.body || {};
  if (!['confirmada', 'cancelada'].includes(estado)) {
    throw new HttpError(400, "estado debe ser 'confirmada' o 'cancelada'");
  }
  const id = Number(req.params.id);
  const reserva = await Reservas.obtener(id);
  if (!reserva) throw new HttpError(404, 'Reserva no encontrada');

  const admin = req.usuario.rol === 'administrador';
  const dueno = reserva.usuario_id === req.usuario.id;
  if (estado === 'confirmada' && !admin) throw new HttpError(403, 'Solo el administrador confirma reservas');
  if (estado === 'cancelada' && !admin && !dueno) throw new HttpError(403, 'No puede cancelar esta reserva');

  res.json(await Reservas.cambiarEstado(id, estado));
}

import { pool } from '../config/db.js';
import { HttpError } from '../middlewares/errores.js';

export async function obtener(id) {
  const [filas] = await pool.query(
    `SELECT r.*, m.numero AS mesa_numero, u.nombre AS cliente
     FROM reservas r JOIN mesas m ON m.id = r.mesa_id JOIN usuarios u ON u.id = r.usuario_id
     WHERE r.id = ?`,
    [id],
  );
  return filas[0] || null;
}

export async function listar({ usuarioId, fecha } = {}) {
  const condiciones = [];
  const valores = [];
  if (usuarioId) { condiciones.push('r.usuario_id = ?'); valores.push(usuarioId); }
  if (fecha) { condiciones.push('r.fecha = ?'); valores.push(fecha); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT r.*, m.numero AS mesa_numero, u.nombre AS cliente
     FROM reservas r JOIN mesas m ON m.id = r.mesa_id JOIN usuarios u ON u.id = r.usuario_id
     ${where} ORDER BY r.fecha, r.hora`,
    valores,
  );
  return filas;
}

// Mesas con capacidad suficiente y sin una reserva activa en la misma fecha y hora
export async function mesasDisponibles(fecha, hora, personas) {
  const [filas] = await pool.query(
    `SELECT m.* FROM mesas m
     WHERE m.capacidad >= ?
       AND NOT EXISTS (
         SELECT 1 FROM reservas r
         WHERE r.mesa_id = m.id AND r.fecha = ? AND r.estado <> 'cancelada'
           AND r.hora = ?
       )
     ORDER BY m.capacidad, m.numero`,
    [personas, fecha, hora],
  );
  return filas;
}

export async function crear({ usuarioId, mesaId, fecha, hora, personas }) {
  const libres = await mesasDisponibles(fecha, hora, personas);
  let mesa;
  if (mesaId) {
    mesa = libres.find((m) => m.id === mesaId);
    if (!mesa) throw new HttpError(409, 'La mesa no esta disponible en ese horario');
  } else {
    mesa = libres[0];
    if (!mesa) throw new HttpError(409, 'No hay mesas disponibles para esa fecha, hora y numero de personas');
  }
  const [r] = await pool.query(
    'INSERT INTO reservas (usuario_id, mesa_id, fecha, hora, personas) VALUES (?, ?, ?, ?, ?)',
    [usuarioId, mesa.id, fecha, hora, personas],
  );
  return obtener(r.insertId);
}

export async function cambiarEstado(id, estado) {
  const reserva = await obtener(id);
  if (!reserva) throw new HttpError(404, 'Reserva no encontrada');
  if (reserva.estado === 'cancelada') throw new HttpError(409, 'La reserva ya esta cancelada');
  await pool.query('UPDATE reservas SET estado = ? WHERE id = ?', [estado, id]);
  return obtener(id);
}

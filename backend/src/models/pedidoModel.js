import { pool } from '../config/db.js';
import { HttpError } from '../middlewares/errores.js';

export const ESTADOS = ['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado'];

// Transiciones permitidas del ciclo de vida de un pedido
export const TRANSICIONES = {
  pendiente: ['en_preparacion', 'cancelado'],
  en_preparacion: ['listo', 'cancelado'],
  listo: ['entregado'],
  entregado: [],
  cancelado: [],
};

export async function obtener(id) {
  const [pedidos] = await pool.query(
    `SELECT p.*, m.numero AS mesa_numero, u.nombre AS mesero
     FROM pedidos p JOIN mesas m ON m.id = p.mesa_id JOIN usuarios u ON u.id = p.mesero_id
     WHERE p.id = ?`,
    [id],
  );
  if (!pedidos[0]) return null;
  const [items] = await pool.query(
    `SELECT d.*, pl.nombre AS plato FROM detalle_pedido d
     JOIN platos pl ON pl.id = d.plato_id WHERE d.pedido_id = ?`,
    [id],
  );
  return { ...pedidos[0], items };
}

export async function listar({ estado, meseroId } = {}) {
  const condiciones = [];
  const valores = [];
  if (estado) { condiciones.push('p.estado = ?'); valores.push(estado); }
  if (meseroId) { condiciones.push('p.mesero_id = ?'); valores.push(meseroId); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT p.*, m.numero AS mesa_numero, u.nombre AS mesero
     FROM pedidos p JOIN mesas m ON m.id = p.mesa_id JOIN usuarios u ON u.id = p.mesero_id
     ${where} ORDER BY p.creado_en DESC`,
    valores,
  );
  return filas;
}

// Crea el pedido y su detalle en una sola transaccion; el total se calcula en el servidor
export async function crear({ mesaId, meseroId, items }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [mesas] = await conn.query('SELECT id FROM mesas WHERE id = ?', [mesaId]);
    if (!mesas[0]) throw new HttpError(404, 'La mesa no existe');

    const ids = [...new Set(items.map((i) => i.plato_id))];
    const [platos] = await conn.query(
      'SELECT id, precio, disponible FROM platos WHERE id IN (?)',
      [ids],
    );
    const porId = new Map(platos.map((p) => [p.id, p]));

    let total = 0;
    for (const it of items) {
      const plato = porId.get(it.plato_id);
      if (!plato) throw new HttpError(400, `El plato ${it.plato_id} no existe`);
      if (!plato.disponible) throw new HttpError(409, `El plato ${it.plato_id} no esta disponible`);
      total += plato.precio * it.cantidad;
    }

    const [r] = await conn.query(
      'INSERT INTO pedidos (mesa_id, mesero_id, total) VALUES (?, ?, ?)',
      [mesaId, meseroId, total],
    );
    for (const it of items) {
      await conn.query(
        `INSERT INTO detalle_pedido (pedido_id, plato_id, cantidad, precio_unitario, notas)
         VALUES (?, ?, ?, ?, ?)`,
        [r.insertId, it.plato_id, it.cantidad, porId.get(it.plato_id).precio, it.notas || null],
      );
    }
    await conn.query("UPDATE mesas SET estado = 'ocupada' WHERE id = ?", [mesaId]);

    await conn.commit();
    return obtener(r.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function cambiarEstado(id, nuevoEstado) {
  const pedido = await obtener(id);
  if (!pedido) throw new HttpError(404, 'Pedido no encontrado');
  if (!TRANSICIONES[pedido.estado].includes(nuevoEstado)) {
    throw new HttpError(409, `No se puede pasar de '${pedido.estado}' a '${nuevoEstado}'`);
  }
  await pool.query('UPDATE pedidos SET estado = ? WHERE id = ?', [nuevoEstado, id]);

  // Si el pedido termina y la mesa no tiene mas pedidos activos, se libera
  if (['entregado', 'cancelado'].includes(nuevoEstado)) {
    const [activos] = await pool.query(
      `SELECT COUNT(*) AS n FROM pedidos
       WHERE mesa_id = ? AND estado IN ('pendiente', 'en_preparacion', 'listo')`,
      [pedido.mesa_id],
    );
    if (activos[0].n === 0) {
      await pool.query("UPDATE mesas SET estado = 'libre' WHERE id = ?", [pedido.mesa_id]);
    }
  }
  return obtener(id);
}

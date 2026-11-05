import { pool } from '../config/db.js';
import { HttpError } from '../middlewares/errores.js';

export async function registrarPago({ pedidoId, metodo, valor }) {
  const [pedidos] = await pool.query('SELECT id, total, estado FROM pedidos WHERE id = ?', [pedidoId]);
  const pedido = pedidos[0];
  if (!pedido) throw new HttpError(404, 'Pedido no encontrado');
  if (pedido.estado === 'cancelado') throw new HttpError(409, 'No se puede pagar un pedido cancelado');

  const [pagado] = await pool.query('SELECT COALESCE(SUM(valor), 0) AS suma FROM pagos WHERE pedido_id = ?', [pedidoId]);
  if (pagado[0].suma + valor > pedido.total) {
    throw new HttpError(409, 'El pago excede el saldo pendiente del pedido');
  }
  const [r] = await pool.query(
    'INSERT INTO pagos (pedido_id, metodo, valor) VALUES (?, ?, ?)',
    [pedidoId, metodo, valor],
  );
  const [filas] = await pool.query('SELECT * FROM pagos WHERE id = ?', [r.insertId]);
  return filas[0];
}

// Totales del dia a partir de los pagos registrados
export async function resumenDia(fecha) {
  const [filas] = await pool.query(
    `SELECT COALESCE(SUM(valor), 0) AS total,
            COALESCE(SUM(CASE WHEN metodo = 'efectivo' THEN valor ELSE 0 END), 0) AS efectivo
     FROM pagos WHERE DATE(fecha) = ?`,
    [fecha],
  );
  return { total: filas[0].total, efectivo: filas[0].efectivo };
}

export async function cerrarCaja({ usuarioId, fecha, efectivoContado }) {
  const [existente] = await pool.query('SELECT id FROM cierres_caja WHERE fecha = ?', [fecha]);
  if (existente[0]) throw new HttpError(409, 'La caja de esa fecha ya fue cerrada');

  const { total, efectivo } = await resumenDia(fecha);
  const diferencia = Math.round((efectivoContado - efectivo) * 100) / 100;
  const [r] = await pool.query(
    `INSERT INTO cierres_caja (usuario_id, fecha, total_ventas, efectivo_contado, diferencia)
     VALUES (?, ?, ?, ?, ?)`,
    [usuarioId, fecha, total, efectivoContado, diferencia],
  );
  const [filas] = await pool.query('SELECT * FROM cierres_caja WHERE id = ?', [r.insertId]);
  return { ...filas[0], efectivo_esperado: efectivo };
}

export async function listarCierres() {
  const [filas] = await pool.query(
    `SELECT c.*, u.nombre AS responsable FROM cierres_caja c
     JOIN usuarios u ON u.id = c.usuario_id ORDER BY c.fecha DESC`,
  );
  return filas;
}

// Reporte de ventas diarias por plato y por mesero (pedidos no cancelados)
export async function reporteVentas(fecha) {
  const [porPlato] = await pool.query(
    `SELECT pl.id AS plato_id, pl.nombre AS plato,
            SUM(d.cantidad) AS unidades, SUM(d.cantidad * d.precio_unitario) AS ventas
     FROM detalle_pedido d
     JOIN pedidos p ON p.id = d.pedido_id
     JOIN platos pl ON pl.id = d.plato_id
     WHERE DATE(p.creado_en) = ? AND p.estado <> 'cancelado'
     GROUP BY pl.id, pl.nombre ORDER BY ventas DESC`,
    [fecha],
  );
  const [porMesero] = await pool.query(
    `SELECT u.id AS mesero_id, u.nombre AS mesero,
            COUNT(*) AS pedidos, SUM(p.total) AS ventas
     FROM pedidos p JOIN usuarios u ON u.id = p.mesero_id
     WHERE DATE(p.creado_en) = ? AND p.estado <> 'cancelado'
     GROUP BY u.id, u.nombre ORDER BY ventas DESC`,
    [fecha],
  );
  const totalVentas = porMesero.reduce((acc, f) => acc + f.ventas, 0);
  return { fecha, total_ventas: totalVentas, por_plato: porPlato, por_mesero: porMesero };
}

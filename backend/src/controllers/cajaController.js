import * as Caja from '../models/cajaModel.js';
import { HttpError } from '../middlewares/errores.js';

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const METODOS = ['efectivo', 'tarjeta', 'transferencia'];

function fechaValida(fecha) {
  if (!FECHA_RE.test(fecha || '')) throw new HttpError(400, 'fecha debe tener formato AAAA-MM-DD');
  return fecha;
}

// Fecha local del servidor (AAAA-MM-DD). No se usa toISOString porque devuelve la fecha en UTC
// y en Colombia (UTC-5) ya seria "manana" despues de las 7 p. m.
const hoy = () => new Date().toLocaleDateString('en-CA');

export async function registrarPago(req, res) {
  const { pedido_id: pedidoId, metodo, valor } = req.body || {};
  if (!pedidoId) throw new HttpError(400, 'pedido_id es obligatorio');
  if (!METODOS.includes(metodo)) throw new HttpError(400, `metodo debe ser uno de: ${METODOS.join(', ')}`);
  if (typeof valor !== 'number' || !(valor > 0)) throw new HttpError(400, 'valor debe ser un numero mayor a 0');
  res.status(201).json(await Caja.registrarPago({ pedidoId, metodo, valor }));
}

export async function resumen(req, res) {
  const fecha = fechaValida(req.query.fecha || hoy());
  res.json({ fecha, ...(await Caja.resumenDia(fecha)) });
}

export async function cerrar(req, res) {
  const { fecha = hoy(), efectivo_contado: efectivoContado } = req.body || {};
  fechaValida(fecha);
  if (typeof efectivoContado !== 'number' || efectivoContado < 0) {
    throw new HttpError(400, 'efectivo_contado debe ser un numero mayor o igual a 0');
  }
  res.status(201).json(await Caja.cerrarCaja({ usuarioId: req.usuario.id, fecha, efectivoContado }));
}

export async function listarCierres(req, res) {
  res.json(await Caja.listarCierres());
}

export async function reporte(req, res) {
  res.json(await Caja.reporteVentas(fechaValida(req.query.fecha || hoy())));
}

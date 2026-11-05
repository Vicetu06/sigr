import * as Pedidos from '../models/pedidoModel.js';
import { pool } from '../config/db.js';
import { HttpError } from '../middlewares/errores.js';
import { emitirPedidoNuevo, emitirPedidoEstado } from '../sockets/pedidosSocket.js';

export async function listarMesas(req, res) {
  const [mesas] = await pool.query('SELECT * FROM mesas ORDER BY numero');
  res.json(mesas);
}

export async function listar(req, res) {
  const { estado } = req.query;
  if (estado && !Pedidos.ESTADOS.includes(estado)) throw new HttpError(400, 'Estado invalido');
  res.json(await Pedidos.listar({ estado }));
}

export async function obtener(req, res) {
  const pedido = await Pedidos.obtener(Number(req.params.id));
  if (!pedido) throw new HttpError(404, 'Pedido no encontrado');
  res.json(pedido);
}

export async function crear(req, res) {
  const { mesa_id: mesaId, items } = req.body || {};
  if (!mesaId || !Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'mesa_id e items (al menos uno) son obligatorios');
  }
  for (const it of items) {
    if (!it.plato_id || !Number.isInteger(it.cantidad) || it.cantidad < 1) {
      throw new HttpError(400, 'Cada item requiere plato_id y una cantidad entera mayor a 0');
    }
  }
  const pedido = await Pedidos.crear({ mesaId, meseroId: req.usuario.id, items });
  emitirPedidoNuevo(req.app.get('io'), pedido);
  res.status(201).json(pedido);
}

export async function cambiarEstado(req, res) {
  const { estado } = req.body || {};
  if (!Pedidos.ESTADOS.includes(estado)) throw new HttpError(400, 'Estado invalido');
  const pedido = await Pedidos.cambiarEstado(Number(req.params.id), estado);
  emitirPedidoEstado(req.app.get('io'), pedido);
  res.json(pedido);
}

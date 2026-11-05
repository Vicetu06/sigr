import * as Menu from '../models/menuModel.js';
import { HttpError } from '../middlewares/errores.js';

const esAdmin = (req) => req.usuario?.rol === 'administrador';

// ---------- Categorias ----------
export async function listarCategorias(req, res) {
  res.json(await Menu.listarCategorias({ soloActivas: !esAdmin(req) }));
}

export async function crearCategoria(req, res) {
  if (!req.body?.nombre) throw new HttpError(400, 'El nombre es obligatorio');
  res.status(201).json(await Menu.crearCategoria(req.body));
}

export async function actualizarCategoria(req, res) {
  const id = Number(req.params.id);
  if (!(await Menu.obtenerCategoria(id))) throw new HttpError(404, 'Categoria no encontrada');
  res.json(await Menu.actualizarCategoria(id, req.body || {}));
}

export async function eliminarCategoria(req, res) {
  if (!(await Menu.eliminarCategoria(Number(req.params.id)))) throw new HttpError(404, 'Categoria no encontrada');
  res.status(204).end();
}

// ---------- Platos ----------
export async function listarPlatos(req, res) {
  res.json(await Menu.listarPlatos({
    categoriaId: req.query.categoria_id ? Number(req.query.categoria_id) : undefined,
    soloDisponibles: !esAdmin(req),
  }));
}

function validarPlato(d, { parcial }) {
  if (!parcial && (!d.nombre || d.precio === undefined || !d.categoria_id)) {
    throw new HttpError(400, 'nombre, precio y categoria_id son obligatorios');
  }
  if (d.precio !== undefined && (Number.isNaN(Number(d.precio)) || Number(d.precio) < 0)) {
    throw new HttpError(400, 'El precio debe ser un numero mayor o igual a 0');
  }
}

export async function crearPlato(req, res) {
  const d = req.body || {};
  validarPlato(d, { parcial: false });
  if (!(await Menu.obtenerCategoria(d.categoria_id))) throw new HttpError(400, 'La categoria no existe');
  res.status(201).json(await Menu.crearPlato(d));
}

export async function actualizarPlato(req, res) {
  const id = Number(req.params.id);
  const d = req.body || {};
  validarPlato(d, { parcial: true });
  if (!(await Menu.obtenerPlato(id))) throw new HttpError(404, 'Plato no encontrado');
  res.json(await Menu.actualizarPlato(id, d));
}

export async function eliminarPlato(req, res) {
  if (!(await Menu.eliminarPlato(Number(req.params.id)))) throw new HttpError(404, 'Plato no encontrado');
  res.status(204).end();
}

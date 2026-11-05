import { pool } from '../config/db.js';

// ---------- Categorias ----------
export async function listarCategorias({ soloActivas = false } = {}) {
  const [filas] = await pool.query(
    `SELECT * FROM categorias ${soloActivas ? 'WHERE activa = 1' : ''} ORDER BY nombre`,
  );
  return filas;
}

export async function crearCategoria({ nombre, descripcion = null, activa = 1 }) {
  const [r] = await pool.query(
    'INSERT INTO categorias (nombre, descripcion, activa) VALUES (?, ?, ?)',
    [nombre, descripcion, activa ? 1 : 0],
  );
  return obtenerCategoria(r.insertId);
}

export async function obtenerCategoria(id) {
  const [filas] = await pool.query('SELECT * FROM categorias WHERE id = ?', [id]);
  return filas[0] || null;
}

export async function actualizarCategoria(id, { nombre, descripcion, activa }) {
  await pool.query(
    `UPDATE categorias SET nombre = COALESCE(?, nombre),
       descripcion = COALESCE(?, descripcion), activa = COALESCE(?, activa) WHERE id = ?`,
    [nombre ?? null, descripcion ?? null, activa === undefined ? null : (activa ? 1 : 0), id],
  );
  return obtenerCategoria(id);
}

export async function eliminarCategoria(id) {
  const [r] = await pool.query('DELETE FROM categorias WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

// ---------- Platos ----------
export async function listarPlatos({ categoriaId, soloDisponibles = false } = {}) {
  const condiciones = [];
  const valores = [];
  if (categoriaId) {
    condiciones.push('p.categoria_id = ?');
    valores.push(categoriaId);
  }
  if (soloDisponibles) condiciones.push('p.disponible = 1');
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `SELECT p.*, c.nombre AS categoria FROM platos p
     JOIN categorias c ON c.id = p.categoria_id ${where} ORDER BY c.nombre, p.nombre`,
    valores,
  );
  return filas;
}

export async function obtenerPlato(id) {
  const [filas] = await pool.query('SELECT * FROM platos WHERE id = ?', [id]);
  return filas[0] || null;
}

export async function crearPlato({ categoria_id, nombre, descripcion = null, precio, imagen_url = null, disponible = 1 }) {
  const [r] = await pool.query(
    `INSERT INTO platos (categoria_id, nombre, descripcion, precio, imagen_url, disponible)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [categoria_id, nombre, descripcion, precio, imagen_url, disponible ? 1 : 0],
  );
  return obtenerPlato(r.insertId);
}

export async function actualizarPlato(id, d) {
  await pool.query(
    `UPDATE platos SET categoria_id = COALESCE(?, categoria_id), nombre = COALESCE(?, nombre),
       descripcion = COALESCE(?, descripcion), precio = COALESCE(?, precio),
       imagen_url = COALESCE(?, imagen_url), disponible = COALESCE(?, disponible)
     WHERE id = ?`,
    [
      d.categoria_id ?? null, d.nombre ?? null, d.descripcion ?? null, d.precio ?? null,
      d.imagen_url ?? null, d.disponible === undefined ? null : (d.disponible ? 1 : 0), id,
    ],
  );
  return obtenerPlato(id);
}

export async function eliminarPlato(id) {
  const [r] = await pool.query('DELETE FROM platos WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

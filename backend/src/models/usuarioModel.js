import { pool } from '../config/db.js';

export async function buscarPorEmail(email) {
  const [filas] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
  return filas[0] || null;
}

export async function buscarPorId(id) {
  const [filas] = await pool.query(
    'SELECT id, nombre, email, rol, activo, creado_en FROM usuarios WHERE id = ?',
    [id],
  );
  return filas[0] || null;
}

export async function crear({ nombre, email, passwordHash, rol }) {
  const [r] = await pool.query(
    'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
    [nombre, email, passwordHash, rol],
  );
  return buscarPorId(r.insertId);
}

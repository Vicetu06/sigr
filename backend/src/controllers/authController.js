import bcrypt from 'bcryptjs';
import * as Usuarios from '../models/usuarioModel.js';
import { firmarToken } from '../middlewares/auth.js';
import { HttpError } from '../middlewares/errores.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['cliente', 'mesero', 'administrador'];

function publico(u) {
  return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
}

// El registro publico siempre crea clientes. Solo un administrador autenticado puede asignar otro rol.
export async function registrar(req, res) {
  const { nombre, email, password, rol } = req.body || {};
  if (!nombre || !email || !password) throw new HttpError(400, 'nombre, email y password son obligatorios');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Email invalido');
  if (password.length < 8) throw new HttpError(400, 'La contrasena debe tener al menos 8 caracteres');

  let rolFinal = 'cliente';
  if (rol && rol !== 'cliente') {
    if (!ROLES.includes(rol)) throw new HttpError(400, 'Rol invalido');
    if (req.usuario?.rol !== 'administrador') {
      throw new HttpError(403, 'Solo un administrador puede crear usuarios con ese rol');
    }
    rolFinal = rol;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const usuario = await Usuarios.crear({ nombre, email: email.toLowerCase(), passwordHash, rol: rolFinal });
  res.status(201).json({ usuario: publico(usuario), token: firmarToken(usuario) });
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HttpError(400, 'email y password son obligatorios');

  const usuario = await Usuarios.buscarPorEmail(String(email).toLowerCase());
  const valido = usuario && usuario.activo && (await bcrypt.compare(password, usuario.password_hash));
  if (!valido) throw new HttpError(401, 'Credenciales invalidas');

  res.json({ usuario: publico(usuario), token: firmarToken(usuario) });
}

export async function perfil(req, res) {
  const usuario = await Usuarios.buscarPorId(req.usuario.id);
  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');
  res.json({ usuario });
}

// JWT es sin estado: el cierre de sesion consiste en descartar el token en el cliente.
export function logout(req, res) {
  res.json({ mensaje: 'Sesion cerrada' });
}

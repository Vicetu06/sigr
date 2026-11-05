import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    env.jwtSecret,
    { expiresIn: env.jwtExpira },
  );
}

export function verificarToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

// Exige un token JWT valido en el encabezado Authorization: Bearer <token>
export function autenticar(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.usuario = verificarToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

// Como autenticar, pero sin token continua como visitante (p. ej. registro publico)
export function autenticarOpcional(req, res, next) {
  if (!req.headers.authorization) return next();
  return autenticar(req, res, next);
}

// Control de acceso por rol
export function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tiene permiso para esta accion' });
    }
    return next();
  };
}

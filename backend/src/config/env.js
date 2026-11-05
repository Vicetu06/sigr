import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
// Busca el .env en la raiz del repositorio (ver .env.example)
dotenv.config({ path: path.join(raiz, '.env') });

export const env = {
  puerto: Number(process.env.PORT || 3000),
  clienteUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'cambiar-este-secreto',
  jwtExpira: process.env.JWT_EXPIRES_IN || '8h',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sigr',
  },
};

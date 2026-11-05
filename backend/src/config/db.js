import mysql from 'mysql2/promise';
import { env } from './env.js';

// Pool de conexiones compartido por todos los modelos
export const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: true,
});

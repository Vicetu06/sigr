import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import router from './routes/index.js';
import { manejarErrores, noEncontrado } from './middlewares/errores.js';

export function crearApp() {
  const app = express();
  app.use(cors({ origin: env.clienteUrl }));
  app.use(express.json());
  app.use('/api', router);
  app.use(noEncontrado);
  app.use(manejarErrores);
  return app;
}

export default crearApp();

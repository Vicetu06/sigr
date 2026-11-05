import http from 'node:http';
import { Server } from 'socket.io';
import app from './app.js';
import { env } from './config/env.js';
import { configurarSockets } from './sockets/pedidosSocket.js';

const servidor = http.createServer(app);
const io = new Server(servidor, { cors: { origin: env.clienteUrl } });

app.set('io', io);
configurarSockets(io);

servidor.listen(env.puerto, () => {
  console.log(`SIGR API escuchando en http://localhost:${env.puerto}`);
});

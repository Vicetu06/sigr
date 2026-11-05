// Pruebas de integracion de la linea base SIGR v1.0.0
// Se ejecutan con:  npm test --prefix backend
// Usan una base de datos APARTE (sigr_test) que se recrea en cada ejecucion,
// por lo que no tocan los datos de desarrollo de la base "sigr".
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';

process.env.DB_NAME = 'sigr_test';
process.env.JWT_SECRET = 'secreto-de-pruebas';

const { env } = await import('../backend/src/config/env.js');
const { pool } = await import('../backend/src/config/db.js');
const { default: app } = await import('../backend/src/app.js');

// mysql2 vive en backend/node_modules; se resuelve desde alli
const requireBackend = createRequire(new URL('../backend/package.json', import.meta.url));
const mysql = requireBackend('mysql2/promise');

const PASSWORD = 'Sigr2026!';
let servidor;
let base;

async function recrearBaseDePruebas() {
  const conexion = await mysql.createConnection({
    host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password,
    multipleStatements: true,
  });
  const apuntarAPruebas = (sql) => sql
    .replace(/CREATE DATABASE IF NOT EXISTS sigr/g, 'CREATE DATABASE IF NOT EXISTS sigr_test')
    .replace(/USE sigr;/g, 'USE sigr_test;');
  for (const archivo of ['schema.sql', 'seed.sql']) {
    const sql = fs.readFileSync(new URL(`../database/${archivo}`, import.meta.url), 'utf8');
    await conexion.query(apuntarAPruebas(sql));
  }
  await conexion.end();
}

async function llamar(metodo, ruta, { token, body } = {}) {
  const res = await fetch(`${base}/api${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  return { status: res.status, datos: texto ? JSON.parse(texto) : null };
}

async function iniciarSesion(email) {
  const r = await llamar('POST', '/auth/login', { body: { email, password: PASSWORD } });
  assert.equal(r.status, 200);
  return r.datos.token;
}

before(async () => {
  await recrearBaseDePruebas();
  servidor = http.createServer(app);
  await new Promise((ok) => servidor.listen(0, ok));
  base = `http://localhost:${servidor.address().port}`;
});

after(async () => {
  await new Promise((ok) => servidor.close(ok));
  await pool.end();
});

describe('M01 - Autenticacion y roles', () => {
  test('inicio de sesion correcto devuelve token y rol', async () => {
    const r = await llamar('POST', '/auth/login', { body: { email: 'admin@sigr.test', password: PASSWORD } });
    assert.equal(r.status, 200);
    assert.equal(r.datos.usuario.rol, 'administrador');
    assert.ok(r.datos.token);
    assert.equal(r.datos.usuario.password_hash, undefined);
  });

  test('credenciales incorrectas -> 401', async () => {
    const r = await llamar('POST', '/auth/login', { body: { email: 'admin@sigr.test', password: 'incorrecta' } });
    assert.equal(r.status, 401);
  });

  test('registro publico crea siempre un cliente', async () => {
    const r = await llamar('POST', '/auth/register', {
      body: { nombre: 'Nuevo', email: 'nuevo@sigr.test', password: PASSWORD },
    });
    assert.equal(r.status, 201);
    assert.equal(r.datos.usuario.rol, 'cliente');
  });

  test('registro publico NO permite elegirse administrador', async () => {
    const r = await llamar('POST', '/auth/register', {
      body: { nombre: 'Intruso', email: 'intruso@sigr.test', password: PASSWORD, rol: 'administrador' },
    });
    assert.equal(r.status, 403);
  });

  test('contrasena corta y email repetido se rechazan', async () => {
    const corta = await llamar('POST', '/auth/register', { body: { nombre: 'X', email: 'x@sigr.test', password: '123' } });
    assert.equal(corta.status, 400);
    const repetido = await llamar('POST', '/auth/register', {
      body: { nombre: 'Cliente', email: 'cliente@sigr.test', password: PASSWORD },
    });
    assert.equal(repetido.status, 409);
  });

  test('cada rol accede solo a sus vistas', async () => {
    const cliente = await iniciarSesion('cliente@sigr.test');
    const mesero = await iniciarSesion('mesero@sigr.test');
    const admin = await iniciarSesion('admin@sigr.test');

    assert.equal((await llamar('GET', '/pedidos')).status, 401); // sin token
    assert.equal((await llamar('GET', '/pedidos', { token: cliente })).status, 403);
    assert.equal((await llamar('GET', '/pedidos', { token: mesero })).status, 200);
    assert.equal((await llamar('GET', '/caja/resumen', { token: mesero })).status, 403);
    assert.equal((await llamar('GET', '/caja/resumen', { token: admin })).status, 200);
    assert.equal((await llamar('GET', '/reservas', { token: cliente })).status, 200);
    assert.equal((await llamar('POST', '/reservas', { token: mesero, body: {} })).status, 403);
  });
});

describe('M02 - Menu digital', () => {
  test('el administrador crea, edita y elimina un plato y el menu lo refleja', async () => {
    const admin = await iniciarSesion('admin@sigr.test');

    const creado = await llamar('POST', '/platos', {
      token: admin,
      body: { nombre: 'Sancocho', descripcion: 'De gallina', precio: 28000, categoria_id: 2 },
    });
    assert.equal(creado.status, 201);
    const id = creado.datos.id;

    const enMenu = await llamar('GET', '/platos');
    assert.ok(enMenu.datos.some((p) => p.id === id), 'el plato aparece en el menu publico');

    const editado = await llamar('PUT', `/platos/${id}`, { token: admin, body: { precio: 30000 } });
    assert.equal(editado.status, 200);
    assert.equal(editado.datos.precio, 30000);
    assert.equal(editado.datos.nombre, 'Sancocho');

    assert.equal((await llamar('DELETE', `/platos/${id}`, { token: admin })).status, 204);
    const despues = await llamar('GET', '/platos');
    assert.ok(!despues.datos.some((p) => p.id === id), 'el plato ya no aparece');
  });

  test('un mesero no puede modificar el menu; precio negativo se rechaza', async () => {
    const mesero = await iniciarSesion('mesero@sigr.test');
    const admin = await iniciarSesion('admin@sigr.test');
    const sinPermiso = await llamar('POST', '/platos', {
      token: mesero, body: { nombre: 'X', precio: 1, categoria_id: 1 },
    });
    assert.equal(sinPermiso.status, 403);
    const invalido = await llamar('POST', '/platos', {
      token: admin, body: { nombre: 'X', precio: -5, categoria_id: 1 },
    });
    assert.equal(invalido.status, 400);
  });

  test('los clientes no ven platos no disponibles', async () => {
    const publico = await llamar('GET', '/platos');
    assert.ok(publico.datos.every((p) => p.disponible === 1));
    const admin = await iniciarSesion('admin@sigr.test');
    const completo = await llamar('GET', '/platos', { token: admin });
    assert.ok(completo.datos.some((p) => p.disponible === 0), 'el admin si ve el plato agotado');
  });
});

describe('M03 - Pedidos y M05 - Caja (flujo login -> pedido -> pago -> cierre)', () => {
  test('ciclo completo de un pedido, pago y cierre de caja cuadrado', async () => {
    const mesero = await iniciarSesion('mesero@sigr.test');
    const admin = await iniciarSesion('admin@sigr.test');

    // Pedido en la mesa 1: 2 x Mojarra (32000) + 1 x Jugo (7000) = 71000
    const creado = await llamar('POST', '/pedidos', {
      token: mesero,
      body: { mesa_id: 1, items: [{ plato_id: 3, cantidad: 2 }, { plato_id: 6, cantidad: 1, notas: 'sin azucar' }] },
    });
    assert.equal(creado.status, 201);
    const pedido = creado.datos;
    assert.equal(pedido.estado, 'pendiente');
    assert.equal(pedido.total, 71000);
    assert.equal(pedido.items.length, 2);

    const mesas = await llamar('GET', '/mesas', { token: mesero });
    assert.equal(mesas.datos.find((m) => m.id === 1).estado, 'ocupada');

    // No se puede saltar estados
    const salto = await llamar('PATCH', `/pedidos/${pedido.id}/estado`, { token: mesero, body: { estado: 'listo' } });
    assert.equal(salto.status, 409);

    for (const estado of ['en_preparacion', 'listo', 'entregado']) {
      const r = await llamar('PATCH', `/pedidos/${pedido.id}/estado`, { token: mesero, body: { estado } });
      assert.equal(r.status, 200);
      assert.equal(r.datos.estado, estado);
    }

    const mesasDespues = await llamar('GET', '/mesas', { token: mesero });
    assert.equal(mesasDespues.datos.find((m) => m.id === 1).estado, 'libre');

    // Pago: no puede exceder el total; dos pagos (efectivo + tarjeta) suman el total
    const excede = await llamar('POST', '/pagos', {
      token: mesero, body: { pedido_id: pedido.id, metodo: 'efectivo', valor: 80000 },
    });
    assert.equal(excede.status, 409);
    assert.equal((await llamar('POST', '/pagos', {
      token: mesero, body: { pedido_id: pedido.id, metodo: 'efectivo', valor: 50000 },
    })).status, 201);
    assert.equal((await llamar('POST', '/pagos', {
      token: mesero, body: { pedido_id: pedido.id, metodo: 'tarjeta', valor: 21000 },
    })).status, 201);

    // La fecha se toma de la propia base de datos para no depender de zonas horarias
    const [[{ hoy }]] = await pool.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hoy");

    const resumen = await llamar('GET', `/caja/resumen?fecha=${hoy}`, { token: admin });
    assert.equal(resumen.datos.total, 71000, 'el total de ventas coincide con los pagos registrados');
    assert.equal(resumen.datos.efectivo, 50000);

    const reporte = await llamar('GET', `/reportes/ventas?fecha=${hoy}`, { token: admin });
    assert.equal(reporte.datos.total_ventas, 71000);
    const mojarra = reporte.datos.por_plato.find((f) => f.plato === 'Mojarra frita');
    assert.equal(mojarra.unidades, 2);
    assert.equal(reporte.datos.por_mesero[0].mesero, 'Mesero de Prueba');

    // Cierre: efectivo contado = efectivo esperado -> diferencia 0
    const cierre = await llamar('POST', '/caja/cierre', {
      token: admin, body: { fecha: hoy, efectivo_contado: 50000 },
    });
    assert.equal(cierre.status, 201);
    assert.equal(cierre.datos.total_ventas, 71000);
    assert.equal(cierre.datos.diferencia, 0);

    const repetido = await llamar('POST', '/caja/cierre', {
      token: admin, body: { fecha: hoy, efectivo_contado: 50000 },
    });
    assert.equal(repetido.status, 409, 'no se puede cerrar dos veces la misma fecha');
  });

  test('un pedido con plato no disponible o sin items se rechaza', async () => {
    const mesero = await iniciarSesion('mesero@sigr.test');
    const agotado = await llamar('POST', '/pedidos', {
      token: mesero, body: { mesa_id: 2, items: [{ plato_id: 10, cantidad: 1 }] },
    });
    assert.equal(agotado.status, 409);
    const vacio = await llamar('POST', '/pedidos', { token: mesero, body: { mesa_id: 2, items: [] } });
    assert.equal(vacio.status, 400);
  });

  test('un pedido cancelado libera la mesa y no se puede pagar', async () => {
    const mesero = await iniciarSesion('mesero@sigr.test');
    const creado = await llamar('POST', '/pedidos', {
      token: mesero, body: { mesa_id: 2, items: [{ plato_id: 7, cantidad: 1 }] },
    });
    const id = creado.datos.id;
    assert.equal((await llamar('PATCH', `/pedidos/${id}/estado`, { token: mesero, body: { estado: 'cancelado' } })).status, 200);
    const pago = await llamar('POST', '/pagos', { token: mesero, body: { pedido_id: id, metodo: 'efectivo', valor: 4500 } });
    assert.equal(pago.status, 409);
  });
});

describe('M04 - Reservas', () => {
  test('rechaza reserva duplicada o solapada y permite reservar de nuevo tras cancelar', async () => {
    const cliente = await iniciarSesion('cliente@sigr.test');
    const fecha = '2030-06-15';

    const primera = await llamar('POST', '/reservas', {
      token: cliente, body: { fecha, hora: '19:00', personas: 4, mesa_id: 3 },
    });
    assert.equal(primera.status, 201);
    assert.equal(primera.datos.estado, 'pendiente');

    const duplicada = await llamar('POST', '/reservas', {
      token: cliente, body: { fecha, hora: '19:00', personas: 4, mesa_id: 3 },
    });
    assert.equal(duplicada.status, 409, 'reservar una mesa ya ocupada se rechaza');

    const solapada = await llamar('POST', '/reservas', {
      token: cliente, body: { fecha, hora: '20:00', personas: 4, mesa_id: 3 },
    });
    assert.equal(solapada.status, 409, 'se solapa con la reserva de las 19:00');

    const otraHora = await llamar('POST', '/reservas', {
      token: cliente, body: { fecha, hora: '21:30', personas: 4, mesa_id: 3 },
    });
    assert.equal(otraHora.status, 201, 'fuera de la ventana de 2 horas si se permite');

    const cancelada = await llamar('PATCH', `/reservas/${primera.datos.id}/estado`, {
      token: cliente, body: { estado: 'cancelada' },
    });
    assert.equal(cancelada.status, 200);

    const denuevo = await llamar('POST', '/reservas', {
      token: cliente, body: { fecha, hora: '19:00', personas: 4, mesa_id: 3 },
    });
    assert.equal(denuevo.status, 201, 'la mesa vuelve a estar disponible tras cancelar');
  });

  test('asigna mesa automaticamente segun capacidad y valida formato', async () => {
    const cliente = await iniciarSesion('cliente@sigr.test');
    const auto = await llamar('POST', '/reservas', {
      token: cliente, body: { fecha: '2030-07-01', hora: '13:00', personas: 7 },
    });
    assert.equal(auto.status, 201);
    assert.equal(auto.datos.mesa_numero, 6, 'solo la mesa de 8 puestos cabe para 7 personas');

    const sinMesa = await llamar('POST', '/reservas', {
      token: cliente, body: { fecha: '2030-07-01', hora: '13:00', personas: 20 },
    });
    assert.equal(sinMesa.status, 409);

    const malFormato = await llamar('POST', '/reservas', {
      token: cliente, body: { fecha: '01/07/2030', hora: '13:00', personas: 2 },
    });
    assert.equal(malFormato.status, 400);
  });

  test('solo el administrador confirma; el cliente solo ve sus reservas', async () => {
    const cliente = await iniciarSesion('cliente@sigr.test');
    const admin = await iniciarSesion('admin@sigr.test');
    const otro = await llamar('POST', '/auth/register', {
      body: { nombre: 'Otro', email: 'otro@sigr.test', password: PASSWORD },
    });

    const reserva = await llamar('POST', '/reservas', {
      token: cliente, body: { fecha: '2030-08-10', hora: '12:00', personas: 2 },
    });
    const id = reserva.datos.id;

    const porCliente = await llamar('PATCH', `/reservas/${id}/estado`, { token: cliente, body: { estado: 'confirmada' } });
    assert.equal(porCliente.status, 403);
    const porAdmin = await llamar('PATCH', `/reservas/${id}/estado`, { token: admin, body: { estado: 'confirmada' } });
    assert.equal(porAdmin.datos.estado, 'confirmada');

    const ajenas = await llamar('GET', '/reservas', { token: otro.datos.token });
    assert.equal(ajenas.datos.length, 0, 'otro cliente no ve reservas ajenas');
    const cancelarAjena = await llamar('PATCH', `/reservas/${id}/estado`, {
      token: otro.datos.token, body: { estado: 'cancelada' },
    });
    assert.equal(cancelarAjena.status, 403);
  });
});

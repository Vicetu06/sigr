import { useCallback, useEffect, useState } from 'react';
import { api, dinero } from '../services/api.js';
import { conectarSocket } from '../services/socket.js';

const ETIQUETA = {
  pendiente: 'Pendiente', en_preparacion: 'En preparación', listo: 'Listo',
  entregado: 'Entregado', cancelado: 'Cancelado',
};
// Siguiente accion disponible para cada estado
const SIGUIENTE = {
  pendiente: { estado: 'en_preparacion', texto: 'Iniciar preparación' },
  en_preparacion: { estado: 'listo', texto: 'Marcar listo' },
  listo: { estado: 'entregado', texto: 'Marcar entregado' },
};

export default function Pedidos() {
  const [mesas, setMesas] = useState([]);
  const [platos, setPlatos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [mesaId, setMesaId] = useState('');
  const [carrito, setCarrito] = useState({});
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const cargarPedidos = useCallback(async () => {
    setPedidos(await api.get('/pedidos'));
  }, []);

  useEffect(() => {
    Promise.all([api.get('/mesas'), api.get('/platos'), cargarPedidos()])
      .then(([m, p]) => { setMesas(m); setPlatos(p); })
      .catch((e) => setError(e.message));

    // Tiempo real: pedidos nuevos y cambios de estado llegan por Socket.IO
    const socket = conectarSocket();
    socket.on('pedido:nuevo', cargarPedidos);
    socket.on('pedido:estado', (pedido) => {
      cargarPedidos();
      if (pedido.estado === 'listo') setAviso(`Pedido #${pedido.id} (mesa ${pedido.mesa_numero}) está LISTO`);
    });
    return () => socket.disconnect();
  }, [cargarPedidos]);

  const items = Object.entries(carrito).filter(([, n]) => n > 0);
  const total = items.reduce((acc, [id, n]) => acc + n * platos.find((p) => p.id === Number(id)).precio, 0);

  const cambiarCantidad = (id, delta) =>
    setCarrito((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + delta) }));

  async function enviarPedido() {
    setError('');
    try {
      await api.post('/pedidos', {
        mesa_id: Number(mesaId),
        items: items.map(([id, cantidad]) => ({ plato_id: Number(id), cantidad })),
      });
      setCarrito({});
      setMesaId('');
    } catch (e) {
      setError(e.message);
    }
  }

  async function avanzar(pedido) {
    setError('');
    try {
      await api.patch(`/pedidos/${pedido.id}/estado`, { estado: SIGUIENTE[pedido.estado].estado });
    } catch (e) {
      setError(e.message);
    }
  }

  async function cancelar(pedido) {
    setError('');
    try {
      await api.patch(`/pedidos/${pedido.id}/estado`, { estado: 'cancelado' });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section>
      <h1>Pedidos</h1>
      {aviso && <p className="aviso" onClick={() => setAviso('')}>{aviso} (clic para cerrar)</p>}
      {error && <p className="error">{error}</p>}

      <div className="dos-columnas">
        <div className="tarjeta">
          <h2>Nuevo pedido</h2>
          <label>Mesa
            <select value={mesaId} onChange={(e) => setMesaId(e.target.value)}>
              <option value="">Seleccione…</option>
              {mesas.map((m) => (
                <option key={m.id} value={m.id}>Mesa {m.numero} ({m.estado}, {m.capacidad} puestos)</option>
              ))}
            </select>
          </label>
          <ul className="lista">
            {platos.filter((p) => p.disponible).map((p) => (
              <li key={p.id}>
                <span>{p.nombre} - {dinero(p.precio)}</span>
                <span className="contador">
                  <button className="pequeno" onClick={() => cambiarCantidad(p.id, -1)}>−</button>
                  {carrito[p.id] || 0}
                  <button className="pequeno" onClick={() => cambiarCantidad(p.id, 1)}>+</button>
                </span>
              </li>
            ))}
          </ul>
          <p><strong>Total: {dinero(total)}</strong></p>
          <button disabled={!mesaId || items.length === 0} onClick={enviarPedido}>Enviar a cocina</button>
        </div>

        <div>
          <h2>Cocina / seguimiento</h2>
          {pedidos.filter((p) => p.estado !== 'entregado' && p.estado !== 'cancelado').length === 0 && (
            <p>No hay pedidos activos.</p>
          )}
          {pedidos.map((p) => (
            <article key={p.id} className={`tarjeta pedido estado-${p.estado}`}>
              <h3>#{p.id} · Mesa {p.mesa_numero} · {ETIQUETA[p.estado]}</h3>
              <p>Mesero: {p.mesero} · Total: {dinero(p.total)}</p>
              {SIGUIENTE[p.estado] && (
                <div className="acciones">
                  <button className="pequeno" onClick={() => avanzar(p)}>{SIGUIENTE[p.estado].texto}</button>
                  {['pendiente', 'en_preparacion'].includes(p.estado) && (
                    <button className="peligro pequeno" onClick={() => cancelar(p)}>Cancelar</button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

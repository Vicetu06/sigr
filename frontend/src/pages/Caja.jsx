import { useCallback, useEffect, useState } from 'react';
import { api, dinero } from '../services/api.js';

// Fecha local (AAAA-MM-DD); toISOString daria la fecha en UTC
const hoy = () => new Date().toLocaleDateString('en-CA');

export default function Caja() {
  const [fecha, setFecha] = useState(hoy());
  const [resumen, setResumen] = useState(null);
  const [reporte, setReporte] = useState(null);
  const [cierres, setCierres] = useState([]);
  const [pago, setPago] = useState({ pedido_id: '', metodo: 'efectivo', valor: '' });
  const [efectivo, setEfectivo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const [r, rep, c] = await Promise.all([
      api.get(`/caja/resumen?fecha=${fecha}`),
      api.get(`/reportes/ventas?fecha=${fecha}`),
      api.get('/caja/cierres'),
    ]);
    setResumen(r);
    setReporte(rep);
    setCierres(c);
  }, [fecha]);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  async function ejecutar(accion, textoOk) {
    setError('');
    setMensaje('');
    try {
      await accion();
      setMensaje(textoOk);
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  const registrarPago = (e) => {
    e.preventDefault();
    ejecutar(
      () => api.post('/pagos', { pedido_id: Number(pago.pedido_id), metodo: pago.metodo, valor: Number(pago.valor) }),
      'Pago registrado.',
    );
  };

  const cerrarCaja = (e) => {
    e.preventDefault();
    ejecutar(
      () => api.post('/caja/cierre', { fecha, efectivo_contado: Number(efectivo) }),
      'Caja cerrada.',
    );
  };

  return (
    <section>
      <h1>Caja y reportes</h1>
      {mensaje && <p className="aviso">{mensaje}</p>}
      {error && <p className="error">{error}</p>}

      <label>Fecha
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>

      {resumen && (
        <p className="tarjeta">
          Total pagos del día: <strong>{dinero(resumen.total)}</strong> · Efectivo esperado:{' '}
          <strong>{dinero(resumen.efectivo)}</strong>
        </p>
      )}

      <div className="dos-columnas">
        <form className="tarjeta formulario" onSubmit={registrarPago}>
          <h2>Registrar pago</h2>
          <label>N.º de pedido
            <input type="number" min="1" value={pago.pedido_id} onChange={(e) => setPago({ ...pago, pedido_id: e.target.value })} required />
          </label>
          <label>Método
            <select value={pago.metodo} onChange={(e) => setPago({ ...pago, metodo: e.target.value })}>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </label>
          <label>Valor
            <input type="number" min="1" value={pago.valor} onChange={(e) => setPago({ ...pago, valor: e.target.value })} required />
          </label>
          <button type="submit">Registrar</button>
        </form>

        <form className="tarjeta formulario" onSubmit={cerrarCaja}>
          <h2>Cierre de caja</h2>
          <label>Efectivo contado
            <input type="number" min="0" value={efectivo} onChange={(e) => setEfectivo(e.target.value)} required />
          </label>
          <button type="submit">Cerrar caja del {fecha}</button>
        </form>
      </div>

      {reporte && (
        <>
          <h2>Ventas del día: {dinero(reporte.total_ventas)}</h2>
          <div className="dos-columnas">
            <table>
              <caption>Por plato</caption>
              <thead><tr><th>Plato</th><th>Unidades</th><th>Ventas</th></tr></thead>
              <tbody>
                {reporte.por_plato.map((f) => (
                  <tr key={f.plato_id}><td>{f.plato}</td><td>{f.unidades}</td><td>{dinero(f.ventas)}</td></tr>
                ))}
              </tbody>
            </table>
            <table>
              <caption>Por mesero</caption>
              <thead><tr><th>Mesero</th><th>Pedidos</th><th>Ventas</th></tr></thead>
              <tbody>
                {reporte.por_mesero.map((f) => (
                  <tr key={f.mesero_id}><td>{f.mesero}</td><td>{f.pedidos}</td><td>{dinero(f.ventas)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2>Cierres anteriores</h2>
      <table>
        <thead><tr><th>Fecha</th><th>Total ventas</th><th>Efectivo contado</th><th>Diferencia</th><th>Responsable</th></tr></thead>
        <tbody>
          {cierres.map((c) => (
            <tr key={c.id}>
              <td>{c.fecha}</td><td>{dinero(c.total_ventas)}</td><td>{dinero(c.efectivo_contado)}</td>
              <td>{dinero(c.diferencia)}</td><td>{c.responsable}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

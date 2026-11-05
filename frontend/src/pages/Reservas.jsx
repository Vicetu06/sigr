import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Reservas() {
  const { usuario } = useAuth();
  const esAdmin = usuario.rol === 'administrador';
  const [reservas, setReservas] = useState([]);
  const [form, setForm] = useState({ fecha: '', hora: '', personas: 2 });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => setReservas(await api.get('/reservas')), []);

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

  const reservar = (e) => {
    e.preventDefault();
    ejecutar(
      () => api.post('/reservas', { ...form, personas: Number(form.personas) }),
      'Reserva creada. Quedó pendiente de confirmación.',
    );
  };

  return (
    <section>
      <h1>Reservas</h1>
      {mensaje && <p className="aviso">{mensaje}</p>}
      {error && <p className="error">{error}</p>}

      <form className="tarjeta formulario" onSubmit={reservar}>
        <h2>Reservar una mesa</h2>
        <label>Fecha
          <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
        </label>
        <label>Hora
          <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} required />
        </label>
        <label>Personas
          <input type="number" min="1" value={form.personas} onChange={(e) => setForm({ ...form, personas: e.target.value })} required />
        </label>
        <button type="submit">Reservar</button>
      </form>

      <h2>{esAdmin ? 'Todas las reservas' : 'Mis reservas'}</h2>
      <table>
        <thead>
          <tr>
            <th>Fecha</th><th>Hora</th><th>Mesa</th><th>Personas</th>
            {esAdmin && <th>Cliente</th>}<th>Estado</th><th />
          </tr>
        </thead>
        <tbody>
          {reservas.map((r) => (
            <tr key={r.id}>
              <td>{r.fecha}</td><td>{r.hora.slice(0, 5)}</td><td>{r.mesa_numero}</td><td>{r.personas}</td>
              {esAdmin && <td>{r.cliente}</td>}
              <td>{r.estado}</td>
              <td className="acciones">
                {esAdmin && r.estado === 'pendiente' && (
                  <button className="pequeno" onClick={() => ejecutar(() => api.patch(`/reservas/${r.id}/estado`, { estado: 'confirmada' }), 'Reserva confirmada.')}>
                    Confirmar
                  </button>
                )}
                {r.estado !== 'cancelada' && (
                  <button className="peligro pequeno" onClick={() => ejecutar(() => api.patch(`/reservas/${r.id}/estado`, { estado: 'cancelada' }), 'Reserva cancelada.')}>
                    Cancelar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

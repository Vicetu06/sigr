import { useCallback, useEffect, useState } from 'react';
import { api, dinero } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const VACIO = { nombre: '', descripcion: '', precio: '', categoria_id: '', imagen_url: '' };

export default function Menu() {
  const { usuario } = useAuth();
  const esAdmin = usuario.rol === 'administrador';
  const [categorias, setCategorias] = useState([]);
  const [platos, setPlatos] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState(null);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const [c, p] = await Promise.all([api.get('/categorias'), api.get('/platos')]);
    setCategorias(c);
    setPlatos(p);
  }, []);

  useEffect(() => {
    cargar().catch((e) => setError(e.message));
  }, [cargar]);

  async function ejecutar(accion) {
    setError('');
    try {
      await accion();
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  const guardarPlato = (e) => {
    e.preventDefault();
    const cuerpo = { ...form, precio: Number(form.precio), categoria_id: Number(form.categoria_id) };
    ejecutar(async () => {
      if (editando) await api.put(`/platos/${editando}`, cuerpo);
      else await api.post('/platos', cuerpo);
      setForm(VACIO);
      setEditando(null);
    });
  };

  const editar = (p) => {
    setEditando(p.id);
    setForm({
      nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio,
      categoria_id: p.categoria_id, imagen_url: p.imagen_url || '',
    });
  };

  return (
    <section>
      <h1>Menú digital</h1>
      {error && <p className="error">{error}</p>}

      {categorias.map((c) => (
        <div key={c.id} className="categoria">
          <h2>
            {c.nombre}
            {esAdmin && (
              <button className="peligro pequeno" onClick={() => ejecutar(() => api.delete(`/categorias/${c.id}`))}>
                Eliminar categoría
              </button>
            )}
          </h2>
          <div className="rejilla">
            {platos.filter((p) => p.categoria_id === c.id).map((p) => (
              <article key={p.id} className={`tarjeta ${p.disponible ? '' : 'agotado'}`}>
                {p.imagen_url && <img src={p.imagen_url} alt={p.nombre} />}
                <h3>{p.nombre}</h3>
                <p>{p.descripcion}</p>
                <strong>{dinero(p.precio)}</strong>
                {!p.disponible && <em> (no disponible)</em>}
                {esAdmin && (
                  <div className="acciones">
                    <button className="pequeno" onClick={() => editar(p)}>Editar</button>
                    <button
                      className="pequeno"
                      onClick={() => ejecutar(() => api.put(`/platos/${p.id}`, { disponible: !p.disponible }))}
                    >
                      {p.disponible ? 'Marcar agotado' : 'Marcar disponible'}
                    </button>
                    <button className="peligro pequeno" onClick={() => ejecutar(() => api.delete(`/platos/${p.id}`))}>
                      Eliminar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      ))}

      {esAdmin && (
        <div className="panel-admin">
          <form className="tarjeta formulario" onSubmit={guardarPlato}>
            <h2>{editando ? 'Editar plato' : 'Nuevo plato'}</h2>
            <label>Nombre
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </label>
            <label>Descripción
              <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </label>
            <label>Precio
              <input type="number" min="0" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
            </label>
            <label>Categoría
              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} required>
                <option value="">Seleccione…</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <label>URL de imagen
              <input value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} />
            </label>
            <button type="submit">{editando ? 'Guardar cambios' : 'Crear plato'}</button>
            {editando && (
              <button type="button" className="enlace" onClick={() => { setEditando(null); setForm(VACIO); }}>
                Cancelar edición
              </button>
            )}
          </form>

          <form
            className="tarjeta formulario"
            onSubmit={(e) => {
              e.preventDefault();
              ejecutar(async () => {
                await api.post('/categorias', { nombre: nuevaCategoria });
                setNuevaCategoria('');
              });
            }}
          >
            <h2>Nueva categoría</h2>
            <input value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} placeholder="Nombre" required />
            <button type="submit">Crear categoría</button>
          </form>
        </div>
      )}
    </section>
  );
}

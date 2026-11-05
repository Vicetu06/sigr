const CLAVE = 'sigr_sesion';

export const sesion = {
  leer() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE));
    } catch {
      return null;
    }
  },
  guardar(datos) {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  },
  borrar() {
    localStorage.removeItem(CLAVE);
  },
};

// Cliente HTTP minimo: agrega el token JWT y convierte errores de la API en excepciones
async function peticion(metodo, ruta, cuerpo) {
  const datos = sesion.leer();
  const res = await fetch(`/api${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(datos?.token ? { Authorization: `Bearer ${datos.token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

export const api = {
  get: (ruta) => peticion('GET', ruta),
  post: (ruta, cuerpo) => peticion('POST', ruta, cuerpo),
  put: (ruta, cuerpo) => peticion('PUT', ruta, cuerpo),
  patch: (ruta, cuerpo) => peticion('PATCH', ruta, cuerpo),
  delete: (ruta) => peticion('DELETE', ruta),
};

export const dinero = (n) =>
  Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

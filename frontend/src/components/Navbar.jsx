import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Cada rol ve unicamente los enlaces de las vistas a las que tiene acceso
const ENLACES = [
  { a: '/menu', texto: 'Menú', roles: ['cliente', 'mesero', 'administrador'] },
  { a: '/pedidos', texto: 'Pedidos', roles: ['mesero', 'administrador'] },
  { a: '/reservas', texto: 'Reservas', roles: ['cliente', 'administrador'] },
  { a: '/caja', texto: 'Caja', roles: ['administrador'] },
];

export default function Navbar() {
  const { usuario, logout } = useAuth();
  if (!usuario) return null;

  return (
    <header className="navbar">
      <strong className="marca">SIGR</strong>
      <nav>
        {ENLACES.filter((e) => e.roles.includes(usuario.rol)).map((e) => (
          <NavLink key={e.a} to={e.a}>{e.texto}</NavLink>
        ))}
      </nav>
      <span className="usuario">
        {usuario.nombre} <small>({usuario.rol})</small>
        <button onClick={logout}>Cerrar sesión</button>
      </span>
    </header>
  );
}

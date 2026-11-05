import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import RutaProtegida from './components/RutaProtegida.jsx';
import Login from './pages/Login.jsx';
import Menu from './pages/Menu.jsx';
import Pedidos from './pages/Pedidos.jsx';
import Reservas from './pages/Reservas.jsx';
import Caja from './pages/Caja.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="contenido">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/menu" element={<RutaProtegida><Menu /></RutaProtegida>} />
          <Route path="/pedidos" element={<RutaProtegida roles={['mesero', 'administrador']}><Pedidos /></RutaProtegida>} />
          <Route path="/reservas" element={<RutaProtegida roles={['cliente', 'administrador']}><Reservas /></RutaProtegida>} />
          <Route path="/caja" element={<RutaProtegida roles={['administrador']}><Caja /></RutaProtegida>} />
          <Route path="*" element={<Navigate to="/menu" replace />} />
        </Routes>
      </main>
    </>
  );
}

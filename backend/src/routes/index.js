import { Router } from 'express';
import { autenticar, autenticarOpcional, permitirRoles } from '../middlewares/auth.js';
import { asyncHandler as h } from '../middlewares/errores.js';
import * as Auth from '../controllers/authController.js';
import * as Menu from '../controllers/menuController.js';
import * as Pedidos from '../controllers/pedidoController.js';
import * as Reservas from '../controllers/reservaController.js';
import * as Caja from '../controllers/cajaController.js';

const router = Router();
const admin = permitirRoles('administrador');
const personal = permitirRoles('mesero', 'administrador');

router.get('/health', (req, res) => res.json({ estado: 'ok' }));

// M01 - Autenticacion
router.post('/auth/register', autenticarOpcional, h(Auth.registrar));
router.post('/auth/login', h(Auth.login));
router.post('/auth/logout', autenticar, Auth.logout);
router.get('/auth/me', autenticar, h(Auth.perfil));

// M02 - Menu digital (la consulta es publica; la gestion es del administrador)
router.get('/categorias', autenticarOpcional, h(Menu.listarCategorias));
router.post('/categorias', autenticar, admin, h(Menu.crearCategoria));
router.put('/categorias/:id', autenticar, admin, h(Menu.actualizarCategoria));
router.delete('/categorias/:id', autenticar, admin, h(Menu.eliminarCategoria));

router.get('/platos', autenticarOpcional, h(Menu.listarPlatos));
router.post('/platos', autenticar, admin, h(Menu.crearPlato));
router.put('/platos/:id', autenticar, admin, h(Menu.actualizarPlato));
router.delete('/platos/:id', autenticar, admin, h(Menu.eliminarPlato));

// M03 - Pedidos en tiempo real
router.get('/mesas', autenticar, h(Pedidos.listarMesas));
router.get('/pedidos', autenticar, personal, h(Pedidos.listar));
router.get('/pedidos/:id', autenticar, personal, h(Pedidos.obtener));
router.post('/pedidos', autenticar, personal, h(Pedidos.crear));
router.patch('/pedidos/:id/estado', autenticar, personal, h(Pedidos.cambiarEstado));

// M04 - Reservas
router.get('/reservas/disponibilidad', autenticar, h(Reservas.disponibilidad));
router.get('/reservas', autenticar, h(Reservas.listar));
router.post('/reservas', autenticar, permitirRoles('cliente', 'administrador'), h(Reservas.crear));
router.patch('/reservas/:id/estado', autenticar, permitirRoles('cliente', 'administrador'), h(Reservas.cambiarEstado));

// M05 - Cierre de caja y reportes
router.post('/pagos', autenticar, personal, h(Caja.registrarPago));
router.get('/caja/resumen', autenticar, admin, h(Caja.resumen));
router.post('/caja/cierre', autenticar, admin, h(Caja.cerrar));
router.get('/caja/cierres', autenticar, admin, h(Caja.listarCierres));
router.get('/reportes/ventas', autenticar, admin, h(Caja.reporte));

export default router;

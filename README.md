# SIGR - Sistema Integral de Gestión de Restaurante

Aplicación web para gestionar pedidos, reservas, menú, caja y reportes.

> **Línea base:** `v1.0.0` · rama `main` · taller grupal de Ingeniería de Software (Tecnológica del Oriente).

## Módulos de la línea base

| ID | Módulo | Qué incluye |
|----|--------|-------------|
| M01 | Autenticación | Registro, login, roles (cliente, mesero, administrador), JWT, control de acceso por rol |
| M02 | Menú digital | CRUD de platos y categorías, disponibilidad |
| M03 | Pedidos en tiempo real | Pedido por mesa, envío a cocina, estados y notificaciones (Socket.IO) |
| M04 | Reservas | Reserva por fecha/hora/personas, validación de disponibilidad, confirmación y cancelación |
| M05 | Caja y reportes | Pagos, cierre diario, cuadre de efectivo, ventas por plato y por mesero |

Fuera de la línea base (versiones futuras): pagos en línea, facturación electrónica, programa de fidelización, app móvil nativa e inventario de insumos.

## Stack

Frontend: React (Vite) · Backend: Node.js + Express · Base de datos: MySQL 8 · Autenticación: JWT · Tiempo real: Socket.IO

## Requisitos

- Node.js 20 o superior
- MySQL 8

## Instalación

```bash
git clone https://github.com/equipoX/sigr.git
cd sigr
git checkout v1.0.0
cp .env.example .env        # configurar credenciales de BD y JWT_SECRET
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
npm install --prefix backend
npm install --prefix frontend
```

En Windows (PowerShell) el paso `cp` se reemplaza por `copy .env.example .env`.

## Ejecución

```bash
npm run dev --prefix backend     # API en http://localhost:3000
npm run dev --prefix frontend    # Web en http://localhost:5173
```

### Usuarios de prueba (cargados por `database/seed.sql`)

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Administrador | admin@sigr.test | Sigr2026! |
| Mesero | mesero@sigr.test | Sigr2026! |
| Cliente | cliente@sigr.test | Sigr2026! |

> Son datos de prueba para desarrollo. En un despliegue real, eliminar estos usuarios y definir un `JWT_SECRET` propio.

## Pruebas

```bash
npm test --prefix backend
```

Las pruebas de integración cubren los flujos login por rol → menú → pedido → pago → cierre de caja y las reglas de reservas. Usan una base de datos **aparte** (`sigr_test`) que se recrea en cada ejecución a partir de `database/schema.sql` y `database/seed.sql`; no modifican la base `sigr`. El usuario de MySQL configurado en `.env` debe poder crear bases de datos.

## Compilación del frontend

```bash
npm run build --prefix frontend
```

## Estructura del repositorio

```
sigr/
├── frontend/        # React (Vite): components, pages, services, context
├── backend/         # Express: config, controllers, models, routes, middlewares, sockets
├── database/        # schema.sql y seed.sql
├── tests/           # Pruebas de integración
├── docs/            # despliegue.md y modelo_bd.png
├── .env.example
├── CHANGELOG.md
└── LICENSE.txt
```

## API REST (resumen)

| Método y ruta | Acceso |
|---------------|--------|
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` | Público / autenticado |
| `GET /api/categorias`, `GET /api/platos` | Público (los no disponibles solo los ve el administrador) |
| `POST/PUT/DELETE /api/categorias`, `/api/platos` | Administrador |
| `GET /api/mesas` | Autenticado |
| `GET/POST /api/pedidos`, `PATCH /api/pedidos/:id/estado` | Mesero, administrador |
| `GET /api/reservas/disponibilidad`, `GET/POST /api/reservas`, `PATCH /api/reservas/:id/estado` | Cliente, administrador (confirmar: solo administrador) |
| `POST /api/pagos` | Mesero, administrador |
| `GET /api/caja/resumen`, `POST /api/caja/cierre`, `GET /api/caja/cierres`, `GET /api/reportes/ventas` | Administrador |

Eventos Socket.IO (requieren el mismo JWT en `auth.token`): `pedido:nuevo` y `pedido:estado`.

## Flujo de trabajo y control de cambios

- `main`: solo versiones estables y aprobadas (la línea base). No se hace push directo; los cambios entran por pull request aprobado.
- `develop`: integración de funcionalidades terminadas.
- `feature/<nombre>`: nuevas funcionalidades. `hotfix/<nombre>`: correcciones urgentes sobre la línea base (`v1.0.1`).
- Todo cambio comienza como una solicitud de cambio (RFC) en GitHub Issues y se registra en el [CHANGELOG](CHANGELOG.md). Versionado semántico `MAYOR.MENOR.PARCHE`.
- Commits con formato [Conventional Commits](https://www.conventionalcommits.org/es/) (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

Para recuperar la línea base en cualquier momento: `git checkout v1.0.0`. Para ver lo cambiado después de ella: `git log v1.0.0..main --oneline`.

## Documentación

- [Manual de despliegue](docs/despliegue.md)
- [Diagrama de la base de datos](docs/modelo_bd.png)
- [Registro de cambios](CHANGELOG.md)

## Licencia

[MIT](LICENSE.txt)

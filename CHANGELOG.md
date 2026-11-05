# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/) y el proyecto usa
[Versionado Semántico](https://semver.org/lang/es/).

## [1.0.0] - 2026-11-05 (Línea base)

### Agregado
- Autenticación de usuarios con roles: cliente, mesero, administrador (JWT).
- Menú digital con CRUD de platos y categorías.
- Registro y seguimiento de pedidos en tiempo real (Socket.IO).
- Reservas por fecha y hora con validación de disponibilidad.
- Cierre de caja y reporte de ventas diario.
- Pruebas básicas de integración.
- Documentación: README, manual de despliegue, modelo de BD.

### Corregido
- Se evita la doble reserva de una misma mesa en el mismo horario.

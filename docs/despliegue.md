# Manual de despliegue - SIGR v1.0.0

Guía para poner el SIGR en un servidor (Linux) a partir de la línea base `v1.0.0`.

## 1. Requisitos del servidor

- Node.js 20 o superior y npm
- MySQL 8 (usuario con permisos sobre la base `sigr`)
- Git
- Un servidor web para el frontend compilado (Nginx, Apache, o el que prefiera el equipo)
- Opcional: un gestor de procesos para la API (por ejemplo, `pm2` o un servicio `systemd`)

## 2. Obtener la línea base

```bash
git clone https://github.com/equipoX/sigr.git
cd sigr
git checkout v1.0.0
```

## 3. Variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto de la API (por defecto 3000) |
| `CLIENT_URL` | URL pública del frontend; se usa para CORS y Socket.IO (ej. `https://restaurante.ejemplo.com`) |
| `JWT_SECRET` | Cadena larga y aleatoria. **Obligatorio cambiarla en producción** (ej. `openssl rand -hex 48`) |
| `JWT_EXPIRES_IN` | Vigencia del token (por defecto `8h`) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a MySQL |

El archivo `.env` contiene secretos: no se sube al repositorio (está en `.gitignore`).

## 4. Crear la base de datos

```bash
mysql -u root -p < database/schema.sql
```

> Atención: `schema.sql` elimina y vuelve a crear las tablas. Ejecutarlo solo en instalaciones nuevas.

Cargar datos de prueba (solo en entornos de desarrollo o demostración):

```bash
mysql -u root -p < database/seed.sql
```

En producción conviene crear un usuario MySQL propio para la aplicación, con permisos únicamente sobre `sigr`, en lugar de usar `root`:

```sql
CREATE USER 'sigr_app'@'localhost' IDENTIFIED BY '<contraseña-segura>';
GRANT SELECT, INSERT, UPDATE, DELETE ON sigr.* TO 'sigr_app'@'localhost';
```

Si se despliega sin `seed.sql`, el primer administrador debe crearse directamente en la base de datos (el registro público solo crea clientes), insertando un usuario con rol `administrador` y un hash bcrypt de su contraseña.

## 5. Backend

```bash
npm ci --prefix backend
npm test --prefix backend          # opcional: verifica la instalación
npm start --prefix backend         # API en http://localhost:3000
```

Con `pm2`:

```bash
npm install -g pm2
pm2 start backend/src/server.js --name sigr-api
pm2 save
```

## 6. Frontend

```bash
npm ci --prefix frontend
npm run build --prefix frontend    # genera frontend/dist
```

Publicar el contenido de `frontend/dist` con el servidor web. El frontend llama a `/api` y a `/socket.io` en el mismo origen, así que el servidor web debe reenviar ambas rutas a la API. Ejemplo para Nginx:

```nginx
server {
    listen 80;
    server_name restaurante.ejemplo.com;

    root /var/www/sigr/frontend/dist;
    index index.html;

    location / {
        try_files $uri /index.html;      # rutas de React Router
    }

    location /api/ {
        proxy_pass http://localhost:3000;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Se recomienda servir el sitio por HTTPS (por ejemplo con Let's Encrypt).

## 7. Verificación

1. `GET /api/health` responde `{"estado":"ok"}`.
2. Abrir el sitio e iniciar sesión con un usuario de cada rol: cada uno ve solo sus vistas.
3. Crear un pedido como mesero y comprobar que aparece en tiempo real en otra sesión de mesero o administrador.

## 8. Actualización a una nueva versión

```bash
git fetch --tags
git checkout v1.0.1                 # o la etiqueta que corresponda
npm ci --prefix backend && npm ci --prefix frontend
npm run build --prefix frontend
pm2 restart sigr-api
```

Revisar el [CHANGELOG](../CHANGELOG.md) antes de actualizar por si hay cambios en la base de datos.

## 9. Copia de seguridad

```bash
mysqldump -u root -p sigr > respaldo_sigr_$(date +%F).sql
```

-- SIGR - Datos de prueba (linea base v1.0.0)
-- Ejecutar despues de schema.sql
-- Usuarios de prueba (contrasena de los tres: Sigr2026!)
--   admin@sigr.test    -> administrador
--   mesero@sigr.test   -> mesero
--   cliente@sigr.test  -> cliente

USE sigr;

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Administrador SIGR', 'admin@sigr.test',   '$2a$10$/2Ay7xYy.Z.vfYq.FRQur.KcjusAmVOeL73XMNQruXaLGlpi7mVYy', 'administrador'),
  ('Mesero de Prueba',   'mesero@sigr.test',  '$2a$10$/2Ay7xYy.Z.vfYq.FRQur.KcjusAmVOeL73XMNQruXaLGlpi7mVYy', 'mesero'),
  ('Cliente de Prueba',  'cliente@sigr.test', '$2a$10$/2Ay7xYy.Z.vfYq.FRQur.KcjusAmVOeL73XMNQruXaLGlpi7mVYy', 'cliente');

INSERT INTO categorias (nombre, descripcion) VALUES
  ('Entradas',  'Para comenzar'),
  ('Platos fuertes', 'Platos principales de la casa'),
  ('Bebidas',   'Jugos, gaseosas y cervezas'),
  ('Postres',   'Para cerrar con algo dulce');

INSERT INTO platos (categoria_id, nombre, descripcion, precio, disponible) VALUES
  (1, 'Patacones con hogao',    'Patacones crocantes con salsa criolla',              12000, 1),
  (1, 'Empanadas (3 unidades)', 'Empanadas de carne con ají',                          9000, 1),
  (2, 'Mojarra frita',          'Mojarra con arroz con coco y patacón',               32000, 1),
  (2, 'Bandeja paisa',          'Frijoles, arroz, carne molida, chicharrón y huevo',  35000, 1),
  (2, 'Pechuga a la plancha',   'Con ensalada y papas a la francesa',                 26000, 1),
  (3, 'Jugo natural',           'Lulo, mora o maracuyá',                               7000, 1),
  (3, 'Gaseosa',                'Botella 400 ml',                                      4500, 1),
  (3, 'Cerveza nacional',       'Botella 330 ml',                                      6000, 1),
  (4, 'Cocadas',                'Cocada tradicional de coco',                          6500, 1),
  (4, 'Flan de caramelo',       'Flan casero',                                         8000, 0);

INSERT INTO mesas (numero, capacidad, estado) VALUES
  (1, 2, 'libre'),
  (2, 2, 'libre'),
  (3, 4, 'libre'),
  (4, 4, 'libre'),
  (5, 6, 'libre'),
  (6, 8, 'libre');

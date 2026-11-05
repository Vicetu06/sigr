-- SIGR - Sistema Integral de Gestion de Restaurante
-- Script de creacion de la base de datos (linea base v1.0.0)
-- Motor: MySQL 8

CREATE DATABASE IF NOT EXISTS sigr
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sigr;

DROP TABLE IF EXISTS cierres_caja;
DROP TABLE IF EXISTS pagos;
DROP TABLE IF EXISTS detalle_pedido;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS reservas;
DROP TABLE IF EXISTS mesas;
DROP TABLE IF EXISTS platos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol           ENUM('cliente', 'mesero', 'administrador') NOT NULL DEFAULT 'cliente',
  activo        TINYINT(1) NOT NULL DEFAULT 1,
  creado_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE categorias (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(80) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NULL,
  activa      TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE platos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT UNSIGNED NOT NULL,
  nombre       VARCHAR(120) NOT NULL,
  descripcion  VARCHAR(500) NULL,
  precio       DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
  imagen_url   VARCHAR(255) NULL,
  disponible   TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_platos_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE mesas (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero    INT UNSIGNED NOT NULL UNIQUE,
  capacidad INT UNSIGNED NOT NULL,
  estado    ENUM('libre', 'ocupada', 'reservada') NOT NULL DEFAULT 'libre'
) ENGINE=InnoDB;

CREATE TABLE reservas (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  mesa_id    INT UNSIGNED NOT NULL,
  fecha      DATE NOT NULL,
  hora       TIME NOT NULL,
  personas   INT UNSIGNED NOT NULL,
  estado     ENUM('pendiente', 'confirmada', 'cancelada') NOT NULL DEFAULT 'pendiente',
  CONSTRAINT fk_reservas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_reservas_mesa    FOREIGN KEY (mesa_id)    REFERENCES mesas(id),
  INDEX idx_reservas_mesa_fecha (mesa_id, fecha, hora)
) ENGINE=InnoDB;

CREATE TABLE pedidos (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mesa_id   INT UNSIGNED NOT NULL,
  mesero_id INT UNSIGNED NOT NULL,
  estado    ENUM('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado')
            NOT NULL DEFAULT 'pendiente',
  total     DECIMAL(10,2) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedidos_mesa   FOREIGN KEY (mesa_id)   REFERENCES mesas(id),
  CONSTRAINT fk_pedidos_mesero FOREIGN KEY (mesero_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE detalle_pedido (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT UNSIGNED NOT NULL,
  plato_id        INT UNSIGNED NOT NULL,
  cantidad        INT UNSIGNED NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL,
  notas           VARCHAR(255) NULL,
  CONSTRAINT fk_detalle_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_plato  FOREIGN KEY (plato_id)  REFERENCES platos(id)
) ENGINE=InnoDB;

CREATE TABLE pagos (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT UNSIGNED NOT NULL,
  metodo    ENUM('efectivo', 'tarjeta', 'transferencia') NOT NULL,
  valor     DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  fecha     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pagos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  INDEX idx_pagos_fecha (fecha)
) ENGINE=InnoDB;

CREATE TABLE cierres_caja (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id       INT UNSIGNED NOT NULL,
  fecha            DATE NOT NULL UNIQUE,
  total_ventas     DECIMAL(12,2) NOT NULL,
  efectivo_contado DECIMAL(12,2) NOT NULL,
  diferencia       DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_cierres_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

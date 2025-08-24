-- Adminer 4.8.1 MySQL 8.0.30 dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `brand`;
CREATE TABLE `brand` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(50) NOT NULL,
  `description` varchar(3000) NOT NULL,
  `images` json DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_by` varchar(40) DEFAULT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `brand` (`id`, `title`, `description`, `images`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1,	'brand one',	'brand one \'s descriptipn here ',	NULL,	'active',	NULL,	'2025-08-21 12:31:48',	'2025-08-21 12:31:48');

DROP TABLE IF EXISTS `product`;
CREATE TABLE `product` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(50) NOT NULL,
  `brand_id` varchar(40) NOT NULL,
  `description` varchar(4000) NOT NULL,
  `images` json DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `is_deleted` int NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `shop_name` varchar(80) NOT NULL,
  `address` varchar(90) NOT NULL,
  `password` varchar(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `phone_number` varchar(10) NOT NULL,
  `access_token` varchar(3000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `user_type` enum('RETAILER','VENDOR') NOT NULL DEFAULT 'RETAILER',
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `user` (`id`, `shop_name`, `address`, `password`, `phone_number`, `access_token`, `user_type`, `created_at`, `updated_at`) VALUES
(2,	'shop_one',	'uk one',	'$2b$10$Y1vAuK8wVXRJvv2d0GVRUeP31wPhGLfkwRX1UKWK2lUOu2VYpgqHO',	'7894561234',	NULL,	'RETAILER',	'2025-08-20 15:38:40',	'2025-08-20 15:38:40'),
(3,	'shop_one',	'uk one',	'$2b$10$hJzq2jP1It63Mpxl65tuB.jeSNUjlWqkGIKhqNd0v.tq6kYV6J2bu',	'78945341',	NULL,	'RETAILER',	'2025-08-20 15:38:57',	'2025-08-20 15:38:57'),
(4,	'shop_one',	'uk one',	'$2b$10$511EHUDC8g76lTx037IUouQKZU48a1zQTwC60zlmjScBt5NkWGJbu',	'78945342',	NULL,	'RETAILER',	'2025-08-20 15:46:54',	'2025-08-20 15:46:54'),
(5,	'shop_one',	'uk one',	'$2b$10$YHaQdr.VrXcu5SEISxiRU.oDuyi7CnCGsJ.9IA1Lt7h37mtfmZFIe',	'78945343',	NULL,	'RETAILER',	'2025-08-20 15:47:06',	'2025-08-20 15:47:06'),
(6,	'shop_one',	'uk one',	'$2b$10$WOOV2o5cWOH.uFAD5W8ySuUWBdvin7pVTCfD5EkHzFxMIIeIsU8CW',	'78945344',	NULL,	'RETAILER',	'2025-08-20 16:01:25',	'2025-08-20 16:01:25'),
(7,	'shop_one',	'uk one',	'$2b$10$BjbVzqPTNIVB5lsgG8XVZ.0IDBLcWQMVWjsJ7Fgl2fFjNHHg9/6yK',	'78945345',	NULL,	'RETAILER',	'2025-08-20 17:04:10',	'2025-08-20 17:04:10'),
(8,	'shop_one',	'uk one',	'$2b$10$uSAaRAC8KlrrLD/pd7cCz.5AjJWBoVfabUIS/ZEr/7HwxJM.Ptjiy',	'78945346',	NULL,	'RETAILER',	'2025-08-20 17:58:13',	'2025-08-20 17:58:13');

-- 2025-08-21 16:59:36

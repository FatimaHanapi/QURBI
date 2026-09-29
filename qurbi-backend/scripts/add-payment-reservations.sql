-- QURBI livestock payment reservation migration (MySQL 8+).
-- Review and run once against qurbidb while DB_SYNC remains false.

ALTER TABLE `orders`
  ADD COLUMN `checkoutKey` varchar(64) NULL,
  ADD UNIQUE INDEX `IDX_orders_checkoutKey` (`checkoutKey`);

CREATE TABLE `payments` (
  `id` varchar(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `orderId` varchar(36) NOT NULL,
  `status` enum('unpaid','paid','failed','refunded') NOT NULL DEFAULT 'unpaid',
  `provider` varchar(100) NULL,
  `providerReference` varchar(255) NULL,
  `paidAt` datetime(6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_order` (`orderId`),
  KEY `IDX_payments_status` (`status`),
  CONSTRAINT `FK_payments_order` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reservations` (
  `id` varchar(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `livestockId` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `orderId` varchar(36) NOT NULL,
  `paymentId` varchar(36) NULL,
  `status` enum('active','completed','expired','cancelled') NOT NULL DEFAULT 'active',
  `reservedAt` datetime(6) NOT NULL,
  `expiresAt` datetime(6) NOT NULL,
  `completedAt` datetime(6) NULL,
  `expiredAt` datetime(6) NULL,
  `activeLivestockId` varchar(36)
    GENERATED ALWAYS AS (CASE WHEN `status` = 'active' THEN `livestockId` ELSE NULL END) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reservations_active_livestock` (`activeLivestockId`),
  KEY `IDX_reservations_livestockId` (`livestockId`),
  KEY `IDX_reservations_userId` (`userId`),
  KEY `IDX_reservations_orderId` (`orderId`),
  KEY `IDX_reservations_status` (`status`),
  KEY `IDX_reservations_expiresAt` (`expiresAt`),
  CONSTRAINT `FK_reservations_livestock` FOREIGN KEY (`livestockId`) REFERENCES `livestock` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_reservations_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_reservations_order` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_reservations_payment` FOREIGN KEY (`paymentId`) REFERENCES `payments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

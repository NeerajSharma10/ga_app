-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(10) NOT NULL,
    `email` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'SUPER_ADMIN') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_phone_key`(`phone`),
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GameType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `category` ENUM('CONSOLE', 'TABLE', 'BOARD', 'COIN') NOT NULL,
    `extraControllerPrice` DECIMAL(10, 2) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `GameType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PriceTier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gameTypeId` INTEGER NOT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `PriceTier_gameTypeId_durationMinutes_key`(`gameTypeId`, `durationMinutes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CoinPackage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gameTypeId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `CoinPackage_gameTypeId_quantity_key`(`gameTypeId`, `quantity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Station` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(191) NOT NULL,
    `gameTypeId` INTEGER NOT NULL,
    `status` ENUM('AVAILABLE', 'IN_USE', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',

    INDEX `Station_gameTypeId_idx`(`gameTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(10) NOT NULL,
    `address` VARCHAR(191) NULL,
    `isMember` BOOLEAN NOT NULL DEFAULT false,
    `memberDiscountPercent` DECIMAL(5, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Customer_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stationId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,
    `loggedByUserId` INTEGER NOT NULL,
    `startTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endTime` DATETIME(3) NULL,
    `durationMinutes` INTEGER NULL,
    `extraControllers` INTEGER NOT NULL DEFAULT 0,
    `baseAmount` DECIMAL(10, 2) NOT NULL,
    `discountType` ENUM('PERCENT', 'AMOUNT') NULL,
    `discountValue` DECIMAL(10, 2) NULL,
    `discountReason` VARCHAR(191) NULL,
    `totalAmount` DECIMAL(10, 2) NULL,
    `paymentType` ENUM('CASH', 'ONLINE') NULL,
    `paymentStatus` ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Session_stationId_startTime_idx`(`stationId`, `startTime`),
    INDEX `Session_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PriceTier` ADD CONSTRAINT `PriceTier_gameTypeId_fkey` FOREIGN KEY (`gameTypeId`) REFERENCES `GameType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CoinPackage` ADD CONSTRAINT `CoinPackage_gameTypeId_fkey` FOREIGN KEY (`gameTypeId`) REFERENCES `GameType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Station` ADD CONSTRAINT `Station_gameTypeId_fkey` FOREIGN KEY (`gameTypeId`) REFERENCES `GameType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_stationId_fkey` FOREIGN KEY (`stationId`) REFERENCES `Station`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_loggedByUserId_fkey` FOREIGN KEY (`loggedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

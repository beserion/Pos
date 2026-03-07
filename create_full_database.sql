-- Antigravity POS Full Database Schema & Sample Data Script
-- Execute this script in SQL Server Management Studio (SSMS) or Azure Data Studio
-- IMPORTANT: This script will drop existing tables if they exist to prevent foreign key issues during recreation.

USE master;
GO

-- Create Database if not exists
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'AntigravityPOS')
BEGIN
    CREATE DATABASE [AntigravityPOS];
END
GO

USE [AntigravityPOS];
GO

-- ==========================================
-- 1. DROP EXISTING TABLES (Reverse Dependency Order)
-- ==========================================
IF OBJECT_ID(N'[dbo].[deliveries]', N'U') IS NOT NULL DROP TABLE [dbo].[deliveries];
IF OBJECT_ID(N'[dbo].[invoices]', N'U') IS NOT NULL DROP TABLE [dbo].[invoices];
IF OBJECT_ID(N'[dbo].[sale_items]', N'U') IS NOT NULL DROP TABLE [dbo].[sale_items];
IF OBJECT_ID(N'[dbo].[sales]', N'U') IS NOT NULL DROP TABLE [dbo].[sales];
IF OBJECT_ID(N'[dbo].[stocks]', N'U') IS NOT NULL DROP TABLE [dbo].[stocks];
IF OBJECT_ID(N'[dbo].[products]', N'U') IS NOT NULL DROP TABLE [dbo].[products];
IF OBJECT_ID(N'[dbo].[employees]', N'U') IS NOT NULL DROP TABLE [dbo].[employees];
IF OBJECT_ID(N'[dbo].[tables]', N'U') IS NOT NULL DROP TABLE [dbo].[tables];
IF OBJECT_ID(N'[dbo].[zones]', N'U') IS NOT NULL DROP TABLE [dbo].[zones];
IF OBJECT_ID(N'[dbo].[locations]', N'U') IS NOT NULL DROP TABLE [dbo].[locations];
IF OBJECT_ID(N'[dbo].[users]', N'U') IS NOT NULL DROP TABLE [dbo].[users];
IF OBJECT_ID(N'[dbo].[roles]', N'U') IS NOT NULL DROP TABLE [dbo].[roles];
IF OBJECT_ID(N'[dbo].[partners]', N'U') IS NOT NULL DROP TABLE [dbo].[partners];
GO

-- ==========================================
-- 2. SCHEMA CREATION (TABLES)
-- ==========================================

-- Roles Table
CREATE TABLE [dbo].[roles] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [name] nvarchar(255) NOT NULL UNIQUE,
    [description] nvarchar(255) NULL,
    [permissions] nvarchar(MAX) NULL,
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);

-- Users Table
CREATE TABLE [dbo].[users] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [firstName] nvarchar(255) NOT NULL,
    [lastName] nvarchar(255) NOT NULL,
    [email] nvarchar(255) NOT NULL UNIQUE,
    [passwordHash] nvarchar(255) NOT NULL,
    [passwordClearText] nvarchar(255) NULL,
    [pinCode] nvarchar(10) NULL,
    [isActive] bit NOT NULL DEFAULT 1,
    [roleId] int NULL FOREIGN KEY REFERENCES [dbo].[roles]([id]),
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);

-- Locations Table
CREATE TABLE [dbo].[locations] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [name] nvarchar(255) NOT NULL,
    [address] nvarchar(MAX) NULL,
    [phone] nvarchar(255) NULL,
    [isActive] bit NOT NULL DEFAULT 1,
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);

-- Zones Table
CREATE TABLE [dbo].[zones] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [name] nvarchar(255) NOT NULL,
    [description] nvarchar(255) NULL,
    [isActive] bit NOT NULL DEFAULT 1,
    [locationId] int NULL FOREIGN KEY REFERENCES [dbo].[locations]([id]) ON DELETE CASCADE,
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);

-- Tables Table
CREATE TABLE [dbo].[tables] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [name] nvarchar(255) NOT NULL,
    [capacity] int NOT NULL DEFAULT 4,
    [status] nvarchar(255) NOT NULL DEFAULT 'AVAILABLE',
    [isActive] bit NOT NULL DEFAULT 1,
    [waiterName] nvarchar(255) NULL,
    [orderStartTime] datetime2(7) NULL,
    [zoneId] int NULL FOREIGN KEY REFERENCES [dbo].[zones]([id]) ON DELETE CASCADE,
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);

-- Employees Table
CREATE TABLE [dbo].[employees] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [firstName] nvarchar(255) NOT NULL,
    [lastName] nvarchar(255) NOT NULL,
    [roleTitle] nvarchar(255) NULL,
    [phone] nvarchar(255) NULL,
    [isActive] bit NOT NULL DEFAULT 1,
    [locationId] int NULL FOREIGN KEY REFERENCES [dbo].[locations]([id]) ON DELETE CASCADE,
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);

-- Products Table
CREATE TABLE [dbo].[products] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [name] nvarchar(255) NOT NULL,
    [sku] nvarchar(255) NOT NULL UNIQUE,
    [price] decimal(10,2) NOT NULL,
    [category] nvarchar(255) NULL,
    [isActive] bit NOT NULL DEFAULT 1,
    [costPrice] decimal(18,2) NOT NULL DEFAULT 0,
    [minStockLevel] int NOT NULL DEFAULT 0,
    [unit] nvarchar(50) NULL DEFAULT 'adet',
    [printerId] int NULL FOREIGN KEY REFERENCES [dbo].[printers]([id]) ON DELETE SET NULL,
    [imageUrl] nvarchar(MAX) NULL,
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);

-- Stocks Table
CREATE TABLE [dbo].[stocks] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [location] nvarchar(255) NOT NULL,
    [quantity] decimal(10,2) NOT NULL DEFAULT 0,
    [lotNumber] nvarchar(255) NULL,
    [expirationDate] date NULL,
    [productId] int NULL FOREIGN KEY REFERENCES [dbo].[products]([id]) ON DELETE CASCADE,
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);

-- Partners Table (Customers & Suppliers)
CREATE TABLE [dbo].[partners] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [name] nvarchar(255) NOT NULL,
    [type] varchar(20) NOT NULL DEFAULT 'CUSTOMER', -- 'CUSTOMER' or 'SUPPLIER'
    [contactName] nvarchar(255) NULL,
    [email] nvarchar(255) NULL,
    [phone] nvarchar(255) NULL,
    [address] nvarchar(MAX) NULL,
    [taxNumber] nvarchar(255) NULL,
    [taxOffice] nvarchar(255) NULL,
    [creditLimit] decimal(12,2) NOT NULL DEFAULT 0,
    [currentBalance] decimal(12,2) NOT NULL DEFAULT 0,
    [isActive] bit NOT NULL DEFAULT 1,
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);

-- Sales Table
CREATE TABLE [dbo].[sales] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [customerId] int NULL FOREIGN KEY REFERENCES [dbo].[partners]([id]),
    [userId] int NULL FOREIGN KEY REFERENCES [dbo].[users]([id]),
    [totalAmount] decimal(12,2) NOT NULL DEFAULT 0,
    [status] nvarchar(255) NOT NULL DEFAULT 'COMPLETED',
    [paymentMethod] nvarchar(255) NULL,
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);

-- Sale Items Table
CREATE TABLE [dbo].[sale_items] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [quantity] decimal(10,2) NOT NULL,
    [unitPrice] decimal(12,2) NOT NULL,
    [saleId] int NULL FOREIGN KEY REFERENCES [dbo].[sales]([id]) ON DELETE CASCADE,
    [productId] int NULL FOREIGN KEY REFERENCES [dbo].[products]([id]),
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);

-- Invoices Table
CREATE TABLE [dbo].[invoices] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [invoiceNumber] nvarchar(255) NOT NULL UNIQUE,
    [saleId] int NOT NULL FOREIGN KEY REFERENCES [dbo].[sales]([id]),
    [customerId] int NULL FOREIGN KEY REFERENCES [dbo].[partners]([id]),
    [totalAmount] decimal(12,2) NOT NULL,
    [taxAmount] decimal(12,2) NOT NULL DEFAULT 0,
    [issueDate] date NOT NULL,
    [status] nvarchar(255) NOT NULL DEFAULT 'ISSUED',
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);

-- Deliveries Table
CREATE TABLE [dbo].[deliveries] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [saleId] int NOT NULL FOREIGN KEY REFERENCES [dbo].[sales]([id]),
    [courierId] int NULL FOREIGN KEY REFERENCES [dbo].[employees]([id]),
    [status] nvarchar(255) NOT NULL DEFAULT 'PENDING',
    [deliveryAddress] nvarchar(MAX) NULL,
    [estimatedDeliveryTime] datetime NULL,
    [actualDeliveryTime] datetime NULL,
    [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
    [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
);
GO

-- ==========================================
-- 3. SAMPLE DATA INSERTION (In Foreign-Key Safe Order)
-- ==========================================

-- 3.1 Insert Roles
INSERT INTO [dbo].[roles] (name, description) VALUES 
('Admin', 'Sistem Yöneticisi - Tüm Haklara Sahip'),
('Manager', 'Şube Yöneticisi'),
('Cashier', 'Kasa Görevlisi'),
('Waiter', 'Garson'),
('Kitchen', 'Mutfak Ekibi');

-- 3.2 Insert Users
-- Password hash corresponds to '123456' using bcrypt (10 rounds) for demo purposes
DECLARE @DefaultHash NVARCHAR(255) = '$2b$10$wYxZZjEJ1QkWiK/M8MLE7OKMML4H86PSCVNLwysPzk3RXT0qqk2KMO';
DECLARE @AdminRoleId INT = (SELECT id FROM [dbo].[roles] WHERE name = 'Admin');
DECLARE @CashierRoleId INT = (SELECT id FROM [dbo].[roles] WHERE name = 'Cashier');
DECLARE @WaiterRoleId INT = (SELECT id FROM [dbo].[roles] WHERE name = 'Waiter');

INSERT INTO [dbo].[users] (firstName, lastName, email, passwordHash, roleId) VALUES 
('Test', 'Admin', 'admin@antigravity.com', @DefaultHash, @AdminRoleId), -- Şifre: 123456
('Ali', 'Kasa', 'kasa@antigravity.com', @DefaultHash, @CashierRoleId), -- Şifre: 123456
('Veli', 'Garson', 'garson@antigravity.com', @DefaultHash, @WaiterRoleId); -- Şifre: 123456

-- 3.3 Insert Locations
INSERT INTO [dbo].[locations] (name, address, phone) VALUES 
('Merkez Şube', 'Kadıköy, İstanbul', '0216 111 22 33'),
('Sahil Şube', 'Beşiktaş, İstanbul', '0212 444 55 66');

-- 3.4 Insert Zones
DECLARE @MerkezId INT = (SELECT id FROM [dbo].[locations] WHERE name = 'Merkez Şube');
INSERT INTO [dbo].[zones] (name, description, locationId) VALUES 
('Giriş Kat', 'Sigara içilemez alan', @MerkezId),
('Teras', 'Açık hava sigara içilebilir alan', @MerkezId),
('Bahçe', 'Geniş oturma grupları', @MerkezId);

-- 3.5 Insert Tables
DECLARE @GirisId INT = (SELECT id FROM [dbo].[zones] WHERE name = 'Giriş Kat');
DECLARE @TerasId INT = (SELECT id FROM [dbo].[zones] WHERE name = 'Teras');

INSERT INTO [dbo].[tables] (name, capacity, zoneId) VALUES 
('Masa 1', 4, @GirisId),
('Masa 2', 2, @GirisId),
('Masa 3', 6, @GirisId),
('Teras 1', 4, @TerasId),
('Teras 2', 4, @TerasId);

-- 3.6 Insert Employees
DECLARE @SahilSubeId INT = (SELECT id FROM [dbo].[locations] WHERE name = 'Sahil Şube');

INSERT INTO [dbo].[employees] ([firstName], [lastName], [roleTitle], [phone], [isActive], [locationId]) 
VALUES 
('Ahmet', 'Yılmaz', 'Mağaza Müdürü', '0555 111 22 33', 1, @MerkezId),
('Ayşe', 'Kaya', 'Şef Garson', '0532 444 55 66', 1, @MerkezId),
('Mehmet', 'Demir', 'Kasa Görevlisi', '0533 777 88 99', 1, @MerkezId),
('Fatma', 'Çelik', 'Aşçıbaşı', '0544 222 33 44', 1, @MerkezId),
('Mustafa', 'Öztürk', 'Garson', '0555 999 00 11', 1, @MerkezId),
('Zeynep', 'Şahin', 'Şube Yöneticisi', '0532 123 45 67', 1, @SahilSubeId),
('Burak', 'Koç', 'Garson', '0533 987 65 43', 1, @SahilSubeId),
('Elif', 'Yıldız', 'Barista', '0544 555 12 34', 1, @SahilSubeId),
('Can', 'Arslan', 'Kurye', '0555 456 78 90', 1, @SahilSubeId),
('Hasan', 'Doğan', 'Mutfak Elemanı', '0532 111 99 88', 0, @SahilSubeId);

-- 3.7 Insert Products
INSERT INTO [dbo].[products] (name, sku, price, category, isActive) VALUES 
('Filtre Kahve', 'K-001', 65.00, 'Sıcak İçecek', 1),
('Cafe Latte', 'K-002', 85.00, 'Sıcak İçecek', 1),
('Cappuccino', 'K-003', 85.00, 'Sıcak İçecek', 1),
('Americano', 'K-004', 75.00, 'Sıcak İçecek', 1),
('Espresso (Single)', 'K-005', 55.00, 'Sıcak İçecek', 1),
('Espresso (Double)', 'K-006', 75.00, 'Sıcak İçecek', 1),
('Macchiato', 'K-007', 65.00, 'Sıcak İçecek', 1),
('Flat White', 'K-008', 85.00, 'Sıcak İçecek', 1),
('Cortado', 'K-009', 80.00, 'Sıcak İçecek', 1),
('Mocha', 'K-010', 95.00, 'Sıcak İçecek', 1),
('White Chocolate Mocha', 'K-011', 100.00, 'Sıcak İçecek', 1),
('Türk Kahvesi', 'K-012', 60.00, 'Sıcak İçecek', 1),
('Fincan Çay', 'K-013', 25.00, 'Sıcak İçecek', 1),
('Kış Çayı', 'K-014', 75.00, 'Sıcak İçecek', 1),
('Sıcak Çikolata', 'K-015', 85.00, 'Sıcak İçecek', 1),
('Ice Latte', 'S-001', 95.00, 'Soğuk İçecek', 1),
('Ice Americano', 'S-002', 85.00, 'Soğuk İçecek', 1),
('Iced Mocha', 'S-003', 105.00, 'Soğuk İçecek', 1),
('Iced White Chocolate Mocha', 'S-004', 110.00, 'Soğuk İçecek', 1),
('Frappe (Karamel)', 'S-005', 120.00, 'Soğuk İçecek', 1),
('Frappe (Çikolata)', 'S-006', 120.00, 'Soğuk İçecek', 1),
('Limonata (Ev Yapımı)', 'S-007', 75.00, 'Soğuk İçecek', 1),
('Churchill', 'S-008', 65.00, 'Soğuk İçecek', 1),
('Taze Portakal Suyu', 'S-009', 90.00, 'Soğuk İçecek', 1),
('Coca Cola (Şişe)', 'S-010', 45.00, 'Soğuk İçecek', 1),
('Su (Cam Şişe)', 'S-011', 20.00, 'Soğuk İçecek', 1),
('San Sebastian', 'T-001', 140.00, 'Tatlılar', 1),
('Tiramisu', 'T-002', 120.00, 'Tatlılar', 1),
('Brownie (Sıcak)', 'T-003', 130.00, 'Tatlılar', 1),
('Magnolia (Muzlu/Çilekli)', 'T-004', 110.00, 'Tatlılar', 1),
('Profiterol', 'T-005', 125.00, 'Tatlılar', 1),
('Sufle', 'T-006', 135.00, 'Tatlılar', 1),
('Limonlu Cheesecake', 'T-007', 140.00, 'Tatlılar', 1),
('Kulüp Sandviç', 'Y-001', 190.00, 'Yiyecek', 1),
('Margaritha Pizza', 'Y-002', 240.00, 'Yiyecek', 1),
('Büyük Kahvaltı Tabağı', 'Y-003', 350.00, 'Yiyecek', 1),
('Pancake Tabağı', 'Y-004', 180.00, 'Yiyecek', 1),
('Tavuklu Sezar Salata', 'Y-005', 210.00, 'Yiyecek', 1),
('Fettuccine Alfredo', 'Y-006', 230.00, 'Yiyecek', 1),
('Penne Arrabbiata', 'Y-007', 190.00, 'Yiyecek', 1),
('Hamburger (Klasik)', 'Y-008', 250.00, 'Yiyecek', 1),
('Cheeseburger', 'Y-009', 270.00, 'Yiyecek', 1),
('Patates Kızartması (Baharatlı)', 'Y-010', 90.00, 'Atıştırmalık', 1),
('Soğan Halkası (10''lu)', 'Y-011', 85.00, 'Atıştırmalık', 1),
('Mozzarella Stick', 'Y-012', 110.00, 'Atıştırmalık', 1);

-- 3.8 Insert Stocks
DECLARE @P1 INT = (SELECT id FROM [dbo].[products] WHERE sku = 'K-001');
DECLARE @P2 INT = (SELECT id FROM [dbo].[products] WHERE sku = 'K-002');

INSERT INTO [dbo].[stocks] (location, quantity, productId) VALUES 
('Merkez Depo', 1500.00, @P1),
('Merkez Depo', 800.00, @P2);

-- 3.9 Insert Partners (Customers & Suppliers)
INSERT INTO [dbo].[partners] (name, type, contactName, phone, taxNumber, currentBalance) VALUES 
('Ahmet Yılmaz', 'CUSTOMER', 'Ahmet', '0532 111 11 11', NULL, 0),
('Ayşe Gül', 'CUSTOMER', 'Ayşe', '0555 222 33 44', NULL, 0),
('Gastro Kahve Çekirdekleri A.Ş.', 'SUPPLIER', 'Mehmet Bey', '0212 999 88 77', '1234567890', 25000.00),
('Gıda Toptan Ltd. Şti.', 'SUPPLIER', 'Salih', '0533 222 33 44', '0987654321', 12500.00);

-- 3.10 Insert Sales
DECLARE @Customer1 INT = (SELECT id FROM [dbo].[partners] WHERE name = 'Ahmet Yılmaz');
DECLARE @Customer2 INT = (SELECT id FROM [dbo].[partners] WHERE name = 'Ayşe Gül');
DECLARE @UserId INT = (SELECT id FROM [dbo].[users] WHERE email = 'kasa@antigravity.com');

INSERT INTO [dbo].[sales] ([customerId], [userId], [totalAmount], [status], [paymentMethod]) VALUES 
(@Customer1, @UserId, 355.00, 'COMPLETED', 'CASH'),
(NULL, @UserId, 840.00, 'COMPLETED', 'CREDIT_CARD'),
(@Customer2, @UserId, 1500.00, 'PENDING', NULL),
(NULL, @UserId, 0.00, 'CANCELLED', NULL),
(@Customer1, @UserId, 1250.00, 'COMPLETED', 'MEAL_TICKET'),
(@Customer2, @UserId, 3450.00, 'COMPLETED', 'CREDIT_ACCOUNT');

-- 3.11 Insert Sale Items
DECLARE @Sale1 INT = (SELECT MIN(id) FROM [dbo].[sales]);
DECLARE @Sale2 INT = @Sale1 + 1;
DECLARE @Sale3 INT = @Sale1 + 2;

DECLARE @P_FiltreKahve INT = (SELECT id FROM [dbo].[products] WHERE sku = 'K-001');
DECLARE @P_Latte INT = (SELECT id FROM [dbo].[products] WHERE sku = 'K-002');
DECLARE @P_Americano INT = (SELECT id FROM [dbo].[products] WHERE sku = 'K-004');
DECLARE @P_SanSebastian INT = (SELECT id FROM [dbo].[products] WHERE sku = 'T-001');
DECLARE @P_Tiramisu INT = (SELECT id FROM [dbo].[products] WHERE sku = 'T-002');
DECLARE @P_Burger INT = (SELECT id FROM [dbo].[products] WHERE sku = 'Y-008');
DECLARE @P_Kola INT = (SELECT id FROM [dbo].[products] WHERE sku = 'S-010');

INSERT INTO [dbo].[sale_items] ([saleId], [productId], [quantity], [unitPrice]) VALUES 
(@Sale1, @P_FiltreKahve, 2, 65.00),     
(@Sale1, @P_Latte, 1, 85.00),           
(@Sale1, @P_SanSebastian, 1, 140.00),   
(@Sale2, @P_Burger, 2, 250.00),         
(@Sale2, @P_Kola, 2, 45.00),            
(@Sale2, @P_Tiramisu, 1, 120.00),       
(@Sale2, @P_FiltreKahve, 2, 65.00),     
(@Sale3, @P_Americano, 1, 75.00),       
(@Sale3, @P_Latte, 2, 85.00);           

-- 3.12 Insert Invoices
INSERT INTO [dbo].[invoices] ([invoiceNumber], [saleId], [customerId], [totalAmount], [taxAmount], [issueDate], [status]) VALUES 
('INV-20260301-0001', @Sale1, @Customer1, 540.00, 97.20, CAST(GETDATE() AS DATE), 'PAID'),
('INV-20260301-0002', @Sale2, @Customer2, 280.00, 50.40, CAST(GETDATE() AS DATE), 'ISSUED'),
('INV-20260301-0003', @Sale3, NULL, 150.00, 27.00, CAST(GETDATE() AS DATE), 'CANCELLED'),
('INV-20260228-0001', @Sale1 + 4, @Customer1, 1250.00, 225.00, '2026-02-28', 'PAID'),
('INV-20260228-0002', @Sale1 + 5, @Customer2, 3450.00, 621.00, '2026-02-28', 'ISSUED');

PRINT 'AntigravityPOS Schema and all Unified Sample Data successfully created.';
GO

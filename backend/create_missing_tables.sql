USE [AntigravityPOS];
GO

IF OBJECT_ID(N'[dbo].[partners]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[partners] (
        [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [name] nvarchar(255) NOT NULL,
        [type] varchar(20) NOT NULL DEFAULT 'CUSTOMER',
        [contactName] nvarchar(255) NULL,
        [email] nvarchar(255) NULL,
        [phone] nvarchar(255) NULL,
        [address] nvarchar(MAX) NULL,
        [taxNumber] nvarchar(255) NULL,
        [taxOffice] nvarchar(255) NULL,
        [city] nvarchar(255) NULL,
        [creditLimit] decimal(12,2) NOT NULL DEFAULT 0,
        [currentBalance] decimal(12,2) NOT NULL DEFAULT 0,
        [isActive] bit NOT NULL DEFAULT 1,
        [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
        [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
    );
    PRINT 'Created partners table';
END

IF OBJECT_ID(N'[dbo].[account_transactions]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[account_transactions] (
        [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [amount] decimal(12,2) NOT NULL,
        [type] nvarchar(255) NOT NULL,
        [description] nvarchar(255) NOT NULL,
        [sourceType] nvarchar(255) NULL,
        [sourceId] int NULL,
        [paymentMethod] nvarchar(255) NOT NULL DEFAULT 'KASA',
        [category] nvarchar(255) NULL,
        [userId] int NULL FOREIGN KEY REFERENCES [dbo].[users]([id]),
        [partnerId] int NULL,
        [createdAt] datetime2(7) NOT NULL DEFAULT getdate(),
        [updatedAt] datetime2(7) NOT NULL DEFAULT getdate()
    );
    PRINT 'Created account_transactions table';
END

/* Check if imageUrl exists in products table */
IF COL_LENGTH('products', 'imageUrl') IS NULL
BEGIN
    ALTER TABLE products ADD imageUrl nvarchar(MAX) NULL;
    PRINT 'Added imageUrl column to products';
END
GO

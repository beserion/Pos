-- Create the POSAPP Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'POSAPP')
BEGIN
    CREATE DATABASE POSAPP;
END
GO

USE POSAPP;
GO

-- Notes for EntityFramework/TypeORM:
-- Since TypeORM has synchronize: true enabled in backend/src/app.module.ts,
-- the application will automatically create the tables (users, roles, products, stocks, 
-- sales, sale_items, invoices, customers, suppliers, deliveries) once it successfully connects to this database.
--
-- Therefore, you only need to run this script to create the main database.
--
-- Ensure that your SQL Server 'sa' user has the correct password 'Oryx123!'
-- and that SQL Server Authentication is enabled in Server Properties -> Security.

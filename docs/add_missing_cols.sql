USE [AntigravityPOS];
GO

/* Employees table missing columns */
IF COL_LENGTH('employees', 'userAccountId') IS NULL
BEGIN
    ALTER TABLE employees ADD userAccountId int NULL FOREIGN KEY REFERENCES [dbo].[users]([id]);
    PRINT 'Added userAccountId to employees';
END

IF COL_LENGTH('employees', 'vehicleType') IS NULL
BEGIN
    ALTER TABLE employees ADD vehicleType nvarchar(255) NULL;
    PRINT 'Added vehicleType to employees';
END

IF COL_LENGTH('employees', 'licensePlate') IS NULL
BEGIN
    ALTER TABLE employees ADD licensePlate nvarchar(255) NULL;
    PRINT 'Added licensePlate to employees';
END

IF COL_LENGTH('employees', 'courierStatus') IS NULL
BEGIN
    ALTER TABLE employees ADD courierStatus nvarchar(255) NOT NULL DEFAULT 'OFF_DUTY';
    PRINT 'Added courierStatus to employees';
END

IF COL_LENGTH('employees', 'photo') IS NULL
BEGIN
    ALTER TABLE employees ADD photo text NULL;
    PRINT 'Added photo to employees';
END

IF COL_LENGTH('employees', 'document') IS NULL
BEGIN
    ALTER TABLE employees ADD document text NULL;
    PRINT 'Added document to employees';
END

/* Invoices table missing columns */
IF COL_LENGTH('invoices', 'description') IS NULL
BEGIN
    ALTER TABLE invoices ADD description nvarchar(MAX) NULL;
    PRINT 'Added description to invoices';
END
GO

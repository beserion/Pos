USE [AntigravityPOS];
GO

/* Deliveries table missing columns */
IF COL_LENGTH('deliveries', 'currentLat') IS NULL
BEGIN
    ALTER TABLE deliveries ADD currentLat decimal(10,8) NULL;
    PRINT 'Added currentLat to deliveries';
END

IF COL_LENGTH('deliveries', 'currentLng') IS NULL
BEGIN
    ALTER TABLE deliveries ADD currentLng decimal(11,8) NULL;
    PRINT 'Added currentLng to deliveries';
END

IF COL_LENGTH('deliveries', 'customerPhone') IS NULL
BEGIN
    ALTER TABLE deliveries ADD customerPhone nvarchar(255) NULL;
    PRINT 'Added customerPhone to deliveries';
END

IF COL_LENGTH('deliveries', 'notes') IS NULL
BEGIN
    ALTER TABLE deliveries ADD notes text NULL;
    PRINT 'Added notes to deliveries';
END
GO

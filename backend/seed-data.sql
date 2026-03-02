-- Seed Roles
IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ADMIN')
BEGIN
    INSERT INTO roles (name, description, createdAt, updatedAt) 
    VALUES ('ADMIN', 'Sistem Yöneticisi', GETDATE(), GETDATE());
END
IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'WAITER')
BEGIN
    INSERT INTO roles (name, description, createdAt, updatedAt) 
    VALUES ('WAITER', 'Garson', GETDATE(), GETDATE());
END

-- Seed Admin User (password: YourStrong@Passw0rd)
-- Argon2/Bcrypt hash for 'YourStrong@Passw0rd'
IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@antigravity.com')
BEGIN
    DECLARE @RoleId INT = (SELECT TOP 1 id FROM roles WHERE name = 'ADMIN');
    INSERT INTO users (firstName, lastName, email, passwordHash, isActive, roleId, createdAt, updatedAt)
    VALUES ('Sistem', 'Yöneticisi', 'admin@antigravity.com', '$2b$10$YourMockHashReplaceWithActualIfNeeded', 1, @RoleId, GETDATE(), GETDATE());
END

-- Seed Locations
IF NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Merkez Şube')
BEGIN
    INSERT INTO locations (name, address, phone, isActive, createdAt, updatedAt)
    VALUES ('Merkez Şube', 'İstanbul, Türkiye', '0212 000 0000', 1, GETDATE(), GETDATE());
END

-- Seed Zones
IF NOT EXISTS (SELECT 1 FROM zones WHERE name = 'Ana Salon')
BEGIN
    DECLARE @LocId INT = (SELECT TOP 1 id FROM locations WHERE name = 'Merkez Şube');
    INSERT INTO zones (name, locationId, createdAt, updatedAt)
    VALUES ('Ana Salon', @LocId, GETDATE(), GETDATE());
END

-- Seed Tables
IF NOT EXISTS (SELECT 1 FROM tables WHERE name = 'Masa 1')
BEGIN
    DECLARE @ZoneId INT = (SELECT TOP 1 id FROM zones WHERE name = 'Ana Salon');
    INSERT INTO tables (name, status, zoneId, createdAt, updatedAt)
    VALUES ('Masa 1', 'BOŞ', @ZoneId, GETDATE(), GETDATE());
END

-- ERP Structural Migration: Sales vs Orders
-- This script expands 'sales' to handle all customer transactions and renames 'purchase_orders' to 'orders'.

BEGIN TRANSACTION;

-- 1. Expand 'sales' table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('sales') AND name = 'tableId')
    ALTER TABLE sales ADD tableId INT NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('sales') AND name = 'tableName')
    ALTER TABLE sales ADD tableName NVARCHAR(255) NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('sales') AND name = 'note')
    ALTER TABLE sales ADD note NVARCHAR(MAX) NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('sales') AND name = 'waiterId')
    ALTER TABLE sales ADD waiterId INT NULL;
GO

-- 2. Expand 'sale_items' table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('sale_items') AND name = 'note')
    ALTER TABLE sale_items ADD note NVARCHAR(MAX) NULL;
GO
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('sale_items') AND name = 'isPaid')
    ALTER TABLE sale_items ADD isPaid BIT DEFAULT 0;
GO

-- 3. Data Migration (using dynamic SQL to avoid parse errors on new columns)
DECLARE @sql NVARCHAR(MAX) = '
INSERT INTO sales (partnerId, userId, totalAmount, discountAmount, serviceFee, status, paymentMethod, paidAmountCash, paidAmountCreditCard, createdAt, updatedAt, tableId, tableName, note, waiterId)
SELECT partnerId, waiterId, totalAmount, discountAmount, serviceFee, status, paymentMethod, paidAmountCash, paidAmountCreditCard, createdAt, updatedAt, tableId, tableName, note, waiterId
FROM orders;

INSERT INTO sale_items (saleId, productId, quantity, unitPrice, costPrice, total, note, isPaid)
SELECT s.id, oi.productId, oi.quantity, oi.unitPrice, oi.costPrice, (oi.quantity * oi.unitPrice), oi.note, oi.isPaid
FROM order_items oi
JOIN orders o ON oi.orderId = o.id
JOIN sales s ON s.createdAt = o.createdAt AND s.totalAmount = o.totalAmount;
';
EXEC sp_executesql @sql;
GO

-- 4. Transition 'purchase_orders' to 'orders'
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('orders') AND type = 'U')
BEGIN
    EXEC sp_rename 'orders', 'orders_old_customer';
    EXEC sp_rename 'order_items', 'order_items_old_customer';
END
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('purchase_orders') AND type = 'U')
BEGIN
    EXEC sp_rename 'purchase_orders', 'orders';
    EXEC sp_rename 'purchase_order_items', 'order_items';
END
GO

-- Add/Update constraints if needed or just let TypeORM handle it on next restart if entities match.

COMMIT TRANSACTION;

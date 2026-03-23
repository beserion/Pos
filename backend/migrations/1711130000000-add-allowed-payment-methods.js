const { sql } = require('mssql');

async function up(pool) {
  try {
    const request = pool.request();
    console.log('Adding allowedPaymentMethods column to cash_registers...');
    
    // Check if column exists
    const checkQuery = `
      SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'cash_registers' AND COLUMN_NAME = 'allowedPaymentMethods'
    `;
    const checkResult = await request.query(checkQuery);
    
    if (checkResult.recordset.length === 0) {
      await request.query(`
        ALTER TABLE cash_registers ADD allowedPaymentMethods NVARCHAR(MAX) NULL
      `);
      console.log('allowedPaymentMethods column added successfully.');
    } else {
      console.log('allowedPaymentMethods column already exists.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function down(pool) {
  try {
    const request = pool.request();
    console.log('Removing allowedPaymentMethods column from cash_registers...');
    await request.query(`
      ALTER TABLE cash_registers DROP COLUMN allowedPaymentMethods
    `);
    console.log('allowedPaymentMethods column removed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

module.exports = {
  up,
  down
};

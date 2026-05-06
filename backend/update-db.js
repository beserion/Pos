const sql = require('mssql');
const config = {
  user: 'sa',
  password: 'Oryx123!',
  server: '149.34.201.35',
  database: 'AntigravityPOS',
  options: { encrypt: false, trustServerCertificate: true }
};
async function run() {
  try {
    const pool = await sql.connect(config);
    await pool.request().query(`
      UPDATE permission_modules SET label = 'Satış Yönetimi', icon = 'fa-cash-register', color = 'text-emerald-500', accent_bg = 'bg-emerald-500/10' WHERE [key] = 'SALES';
      
      IF NOT EXISTS (SELECT 1 FROM permission_modules WHERE [key] = 'POS_TABLE')
        INSERT INTO permission_modules ([key], label, icon, color, accent_bg, actions, sort_order) 
        VALUES ('POS_TABLE', 'POS - Sipariş Ekranı', 'fa-desktop', 'text-teal-500', 'bg-teal-500/10', 'VIEW,ADD,EDIT,DELETE,PRINT,APPROVE', 9);
      
      IF NOT EXISTS (SELECT 1 FROM permission_modules WHERE [key] = 'POS_FAST')
        INSERT INTO permission_modules ([key], label, icon, color, accent_bg, actions, sort_order) 
        VALUES ('POS_FAST', 'POS - Hızlı Satış', 'fa-bolt', 'text-orange-500', 'bg-orange-500/10', 'VIEW,ADD,EDIT,DELETE,PRINT,APPROVE', 9);
    `);
    console.log('DB Updated Successfully!');
    process.exit(0);
  } catch(err) {
    console.error(err);
    process.exit(1);
  }
}
run();

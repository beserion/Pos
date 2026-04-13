const sql = require('mssql')

const config = {
  user: 'sa',
  password: 'Oryx123!',
  server: '149.34.201.35', 
  database: 'AntigravityPOS',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
}

async function run() {
  try {
    await sql.connect(config)
    const result = await sql.query`SELECT * FROM recipe_headers`
    console.log("Headers:", result.recordset)
    const lines = await sql.query`SELECT * FROM recipe_lines`
    console.log("Lines:", lines.recordset)
  } catch (err) {
    console.error(err)
  } finally {
    process.exit()
  }
}
run()

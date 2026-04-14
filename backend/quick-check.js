const { DataSource } = require('typeorm');
require('dotenv').config();

const FirmEntity = {
  name: 'Firm',
  tableName: 'firms',
  columns: {
    id: { primary: true, type: 'int', generated: true },
    name: { type: 'varchar' },
    activeFeatures: { type: 'simple-array', nullable: true }
  }
};

const UserEntity = {
  name: 'User',
  tableName: 'users',
  columns: {
    id: { primary: true, type: 'int', generated: true },
    email: { type: 'varchar' },
  },
  relations: {
    firm: { type: 'many-to-one', target: 'Firm', joinColumn: { name: 'firmId' } }
  }
};

const run = async () => {
    let port = parseInt(process.env.DB_PORT || '1433', 10);
    const ds = new DataSource({
        type: 'mssql',
        host: process.env.DB_HOST,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        port: process.env.DB_INSTANCE ? undefined : port,
        entities: [FirmEntity, UserEntity],
        options: {
            encrypt: true,
            trustServerCertificate: true,
            ...(process.env.DB_INSTANCE ? { instanceName: process.env.DB_INSTANCE } : {}),
        }
    });

    try {
        await ds.initialize();
        const users = await ds.getRepository('User').find({relations: ['firm']});
        console.log('USERS count:', users.length);
        console.dir(users, {depth: null});
    } catch(e) {
        console.error('ERROR:', e);
    } finally {
        if(ds.isInitialized) await ds.destroy();
    }
};

run().catch(console.error);

const { DataSource } = require("typeorm");
const { Printer } = require("./dist/printers/printer.entity");
const { Product } = require("./dist/products/product.entity");
const { Category } = require("./dist/categories/category.entity");

const AppDataSource = new DataSource({
    type: "mssql",
    host: "localhost",
    port: 1433,
    username: "sa",
    password: "YourStrong@Passw0rd",
    database: "AntigravityPOS",
    entities: [Printer, Product, Category],
    synchronize: false,
    options: { encrypt: false, trustServerCertificate: true },
    logging: true
});

AppDataSource.initialize()
    .then(async () => {
        try {
            console.log("Checking printers...");
            const printers = await AppDataSource.getRepository(Printer).find();
            console.log("Found printers:", printers.length);
        } catch (e) {
            console.error("FULL ERROR:", e);
        }
        process.exit(0);
    }).catch(e => {
        console.error("Init Error:", e);
        process.exit(1);
    });

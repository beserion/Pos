import { DataSource } from "typeorm";
import { Printer } from "./src/printers/printer.entity";
import { Product } from "./src/products/product.entity";
import { User } from "./src/users/user.entity";
import { Role } from "./src/roles/role.entity";
import { Stock } from "./src/stocks/stock.entity";
import { Recipe } from "./src/recipes/recipe.entity";
import "reflect-metadata";

async function run() {
    const AppDataSource = new DataSource({
        type: "mssql",
        host: "localhost",
        port: 1433,
        username: "sa",
        password: "YourStrong@Passw0rd",
        database: "AntigravityPOS",
        entities: [Printer, Product, User, Role, Stock, Recipe],
        synchronize: false,
        options: { encrypt: false, trustServerCertificate: true },
        logging: true
    });

    try {
        await AppDataSource.initialize();
        console.log("Initialized!");
        const repo = AppDataSource.getRepository(Printer);
        console.log("Querying printers...");
        const printers = await repo.find();
        console.log("Success! Found:", printers.length);
    } catch (e: any) {
        console.error("FAILED!");
        console.error("TypeORM Error Message:", e.message);
        console.error("Query Context:", e.query);
        if (e.originalError) {
            console.error("MSSQL Original Error Info:", e.originalError.message);
        }
        // Log all properties to catch any hidden info
        console.dir(e);
    } finally {
        process.exit(0);
    }
}

run();

import {PrismaClient} from "@prisma/client";

const isDevelopment = process.env.NODE_ENV === "development";

const db = globalThis.prisma || new PrismaClient({
    // Query logging is noisy and leaks row data into production logs.
    log: isDevelopment ? ["query", "info", "warn", "error"] : ["error", "warn"],
});

if(isDevelopment){
    globalThis.prisma = db
}

export default db

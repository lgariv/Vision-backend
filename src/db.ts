import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
    return new PrismaClient();
}


declare global {
    var prisma:undefined|ReturnType<typeof prismaClientSingleton>
}

/**
 * singletone access to db
 */
const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

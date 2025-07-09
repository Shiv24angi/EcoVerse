import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

export default prisma;

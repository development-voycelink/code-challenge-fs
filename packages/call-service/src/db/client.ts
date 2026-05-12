import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { config } from "../config";

const db = drizzle(config.databaseUrl, { schema });

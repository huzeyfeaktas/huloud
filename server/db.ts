import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Varsayılan olarak localhost PostgreSQL bağlantısı
const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/huloud';

// Ya çevre değişkeni kullan ya da varsayılan değeri
const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

console.log("Veritabanına bağlanılıyor:", connectionString.replace(/:[^:]*@/, ':****@')); // Şifreyi gizle

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });

import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN darf nicht leer sein"),
  CLIENT_ID: z.string().min(1, "CLIENT_ID darf nicht leer sein"),
  GUILD_ID: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

export const env = parsed.success
  ? parsed.data
  : {
      DISCORD_TOKEN: process.env.DISCORD_TOKEN || "",
      CLIENT_ID: process.env.CLIENT_ID || "",
      GUILD_ID: process.env.GUILD_ID || "",
      DATABASE_URL: process.env.DATABASE_URL || "",
      REDIS_URL: process.env.REDIS_URL || "",
    };

export function validateEnv(): boolean {
  if (!parsed.success) {
    console.error("❌ Ungültige oder fehlende Umgebungsvariablen (.env):");
    parsed.error.issues.forEach((err) => {
      console.error(`  - ${err.path.join(".")}: ${err.message}`);
    });
    return false;
  }
  return true;
}

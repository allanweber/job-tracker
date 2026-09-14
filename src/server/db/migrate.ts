/**
 * Standalone migration runner, executed once at container startup (see
 * docker-entrypoint.sh) before the Next.js server takes traffic. Deliberately
 * avoids the drizzle-kit CLI at runtime (its pnpm-symlinked node_modules
 * layout doesn't survive being cherry-picked into the slim Docker image) —
 * this only needs `drizzle-orm` and `postgres`, both already present in
 * Next's standalone build output because the app itself imports them.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: path.join(__dirname, "../../../drizzle/migrations") });
  await client.end();
}

main()
  .then(() => {
    console.log("Migrations applied successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });

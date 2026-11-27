import "server-only";
import { sql } from "./db";

export async function getSetting(key: string): Promise<string | null> {
  const rows = await sql<{ value: string }>("select value from settings where key = $1", [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await sql(
    "insert into settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value",
    [key, value],
  );
}

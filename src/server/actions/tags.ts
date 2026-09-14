"use server";

import { requireUser } from "@/server/auth/session";
import { getTagSuggestions } from "@/server/db/queries/tags";

export async function suggestTags(prefix: string) {
  const user = await requireUser();
  if (!prefix.trim()) return [];
  const rows = await getTagSuggestions(user.id, prefix.trim());
  return rows.map((r) => r.name);
}

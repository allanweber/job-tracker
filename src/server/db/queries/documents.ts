import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { documents } from "@/server/db/schema";

export async function listDocumentsForUser(userId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.uploadedAt));
}

export async function getDocumentForUser(userId: string, documentId: string) {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);
  return row ?? null;
}

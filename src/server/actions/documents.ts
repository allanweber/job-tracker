"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { documents } from "@/server/db/schema";
import { requireUser } from "@/server/auth/session";
import { getDocumentForUser } from "@/server/db/queries/documents";
import { getDownloadUrl } from "@/server/storage/r2";
import type { DocumentKind } from "@/lib/constants";

export async function finalizeUpload(input: {
  objectKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  kind: DocumentKind;
}) {
  const user = await requireUser();
  const [row] = await db
    .insert(documents)
    .values({ userId: user.id, ...input })
    .returning();
  revalidatePath("/documents");
  return row;
}

export async function deleteDocument(documentId: string) {
  const user = await requireUser();
  await db
    .delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)));
  revalidatePath("/documents");
}

export async function getDocumentDownloadUrl(documentId: string) {
  const user = await requireUser();
  const doc = await getDocumentForUser(user.id, documentId);
  if (!doc) throw new Error("Document not found");
  return getDownloadUrl(doc.objectKey);
}

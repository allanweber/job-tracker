import { finalizeUpload } from "@/server/actions/documents";
import type { DocumentKind } from "@/lib/constants";

/**
 * Client-side upload flow shared by the standalone Documents-page uploader
 * and the job form's inline file field: get a presigned URL, PUT the file
 * straight to storage, then record it in the `documents` table. Throws with
 * a user-facing message on any step's failure.
 */
export async function uploadDocument(file: File, kind: DocumentKind) {
  const res = await fetch("/api/documents/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  const { uploadUrl, objectKey } = await res.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) throw new Error("Upload to storage failed");

  return finalizeUpload({
    objectKey,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    kind,
  });
}

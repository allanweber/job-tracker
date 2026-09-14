import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentSession } from "@/server/auth/session";
import { getUploadUrl } from "@/server/storage/r2";

function sanitize(filename: string) {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }

  const objectKey = `${session.user.id}/${randomUUID()}-${sanitize(filename)}`;
  const uploadUrl = await getUploadUrl(objectKey, contentType);

  return NextResponse.json({ uploadUrl, objectKey });
}

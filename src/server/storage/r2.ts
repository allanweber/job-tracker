import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function client() {
  const { R2_ACCOUNT_ID, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID as string,
      secretAccessKey: R2_SECRET_ACCESS_KEY as string,
    },
  });
}

const BUCKET = () => {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set");
  return bucket;
};

export async function getUploadUrl(objectKey: string, contentType: string) {
  const cmd = new PutObjectCommand({ Bucket: BUCKET(), Key: objectKey, ContentType: contentType });
  return getSignedUrl(client(), cmd, { expiresIn: 300 });
}

export async function getDownloadUrl(objectKey: string) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET(), Key: objectKey });
  return getSignedUrl(client(), cmd, { expiresIn: 300 });
}

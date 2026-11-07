import "server-only";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 (S3 호환). 버킷은 비공개이고, 파일은 서버가 권한을 확인한 뒤에만 읽어서 내려준다.
 * 필요한 환경변수: CLOUDFLARE_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 */
let client: S3Client | null = null;

function r2() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new Error("R2 환경변수가 없습니다.");
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return { client, bucket };
}

/** 파일 전체를 읽는다. 없으면 null */
export async function readObject(key: string): Promise<Uint8Array | null> {
  const { client, bucket } = r2();
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return res.Body ? await res.Body.transformToByteArray() : null;
  } catch (err) {
    if (err instanceof Error && err.name === "NoSuchKey") return null;
    throw err;
  }
}

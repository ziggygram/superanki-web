import { createHash, createHmac } from "node:crypto";

type StorageConfig = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function normalizeEndpoint(endpoint: string) {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

export function getStorageConfig(): StorageConfig | null {
  const endpoint = process.env.SUPERANKI_STORAGE_ENDPOINT ?? process.env.S3_ENDPOINT;
  const bucket = process.env.SUPERANKI_STORAGE_BUCKET ?? process.env.S3_BUCKET;
  const region = process.env.SUPERANKI_STORAGE_REGION ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "auto";
  const accessKeyId = process.env.SUPERANKI_STORAGE_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SUPERANKI_STORAGE_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const publicBaseUrl = `${normalizeEndpoint(endpoint)}/${encodeRfc3986(bucket)}`;

  return {
    endpoint: normalizeEndpoint(endpoint),
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
  };
}

export function isStorageConfigured() {
  return Boolean(getStorageConfig());
}

export function buildPresignedDownloadUrl({
  key,
  downloadFilename,
  expiresInSeconds = 60,
}: {
  key: string;
  downloadFilename?: string;
  expiresInSeconds?: number;
}) {
  const config = getStorageConfig();

  if (!config) {
    throw new Error("Object storage is not configured.");
  }

  const expires = Math.max(30, Math.min(expiresInSeconds, 60 * 10));
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;

  const objectPath = `${encodeRfc3986(config.bucket)}/${key
    .split("/")
    .map((segment) => encodeRfc3986(segment))
    .join("/")}`;

  const endpointUrl = new URL(config.endpoint);
  const host = endpointUrl.host;

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
  });

  if (downloadFilename) {
    query.set("response-content-disposition", `attachment; filename="${downloadFilename.replace(/"/g, "")}"`);
  }

  const sortedEntries = [...query.entries()].sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
  const canonicalQueryString = sortedEntries
    .map(([queryKey, queryValue]) => `${encodeRfc3986(queryKey)}=${encodeRfc3986(queryValue)}`)
    .join("&");

  const canonicalRequest = [
    "GET",
    `/${objectPath}`,
    canonicalQueryString,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const finalQuery = new URLSearchParams(query);
  finalQuery.set("X-Amz-Signature", signature);

  return `${config.publicBaseUrl}/${key
    .split("/")
    .map((segment) => encodeRfc3986(segment))
    .join("/")}?${finalQuery.toString()}`;
}

export function inferBackupFilename(deckName: string, key: string) {
  const safeDeckName = deckName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "superanki-backup";

  const extension = key.split(".").pop();
  const normalizedExtension = extension && extension.length <= 5 ? extension.toLowerCase() : "apkg";

  return `${safeDeckName}.${normalizedExtension}`;
}

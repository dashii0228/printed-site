import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Storage } from "@google-cloud/storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createCloudinaryUpload, publishCloudinaryImage } from "./cloudinaryImages";

const SIDECAR = "http://127.0.0.1:1106";
const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR}/token`,
    type: "external_account",
    credential_source: {
      url: `${SIDECAR}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const imageSizeLimit = 8 * 1024 * 1024;
const imageCacheControl = "public, max-age=31536000, immutable";
type ImageCollection = "products" | "portfolio";

let r2Client: S3Client | undefined;

function getStorageProvider() {
  const provider = process.env.STORAGE_PROVIDER;
  if (provider === "cloudinary") return "cloudinary";
  if (provider === "r2") return "r2";
  if (provider === "replit-gcs") return "replit-gcs";
  if (
    !provider &&
    process.env.NETLIFY !== "true" &&
    !process.env.AWS_LAMBDA_FUNCTION_NAME
  ) {
    return "replit-gcs";
  }
  throw new Error("Set STORAGE_PROVIDER to cloudinary or r2 for Netlify image storage.");
}

function getR2Bucket() {
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  if (!bucket) throw new Error("Cloudflare R2 bucket is not configured.");
  return bucket;
}

function getR2Client() {
  if (r2Client) return r2Client;

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 credentials are not configured.");
  }

  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;
  r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return r2Client;
}

function getR2Key(collection: ImageCollection, id: string) {
  return `${collection}/${id}`;
}

async function createR2ImageUpload(
  collection: ImageCollection,
  id: string,
  contentType: string,
) {
  const uploadUrl = await getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: getR2Key(collection, id),
      ContentType: contentType,
    }),
    { expiresIn: 15 * 60 },
  );
  const route =
    collection === "products" ? "product-images" : "portfolio-images";
  return { uploadUrl, imageUrl: `/api/storage/${route}/${id}` };
}

async function verifyR2Image(collection: ImageCollection, id: string) {
  const result = await getR2Client().send(
    new HeadObjectCommand({
      Bucket: getR2Bucket(),
      Key: getR2Key(collection, id),
    }),
  );
  const contentType = String(result.ContentType ?? "");
  const size = Number(result.ContentLength ?? 0);
  if (
    !contentType.startsWith("image/") ||
    size <= 0 ||
    size > imageSizeLimit
  ) {
    throw new Error("Uploaded image failed validation.");
  }
  return { contentType, size };
}

function isR2ObjectNotFound(error: unknown) {
  const candidate = error as {
    code?: string | number;
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.code === 404 ||
    candidate.code === "NotFound" ||
    candidate.code === "NoSuchKey" ||
    candidate.name === "NotFound" ||
    candidate.name === "NoSuchKey"
  );
}

async function getR2ImageRedirect(
  collection: ImageCollection,
  id: string,
) {
  try {
    const image = await verifyR2Image(collection, id);
    const redirectUrl = await getSignedUrl(
      getR2Client(),
      new GetObjectCommand({
        Bucket: getR2Bucket(),
        Key: getR2Key(collection, id),
        ResponseCacheControl: imageCacheControl,
      }),
      { expiresIn: 5 * 60 },
    );
    return { ...image, redirectUrl };
  } catch (error) {
    if (isR2ObjectNotFound(error)) return null;
    throw error;
  }
}

function getPrivateDir() {
  const privateDir = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, "");
  if (!privateDir) throw new Error("Product image storage is not configured.");
  return privateDir;
}

function getBucketAndObject(objectName: string) {
  const [bucketName, ...pathParts] = objectName.split("/");
  if (!bucketName || pathParts.length === 0) {
    throw new Error("Invalid object storage path.");
  }
  return { bucketName, objectName: pathParts.join("/") };
}

async function signUploadUrl(objectName: string) {
  const { bucketName, objectName: fileName } = getBucketAndObject(objectName);
  const response = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: fileName,
      method: "PUT",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Upload URL request failed (${response.status}).`);
  const body = (await response.json()) as { signed_url?: string };
  if (!body.signed_url) throw new Error("Upload URL was not returned.");
  return body.signed_url;
}

function getProductFile(id: string) {
  const { bucketName, objectName } = getBucketAndObject(
    `${getPrivateDir()}/uploads/${id}`,
  );
  return storage.bucket(bucketName).file(objectName);
}

function getPortfolioFile(id: string) {
  const { bucketName, objectName } = getBucketAndObject(
    `${getPrivateDir()}/portfolio-uploads/${id}`,
  );
  return storage.bucket(bucketName).file(objectName);
}

export async function createProductImageUpload(contentType: string) {
  const id = randomUUID();
  if (getStorageProvider() === "cloudinary") {
    return createCloudinaryUpload("products", id);
  }
  if (getStorageProvider() === "r2") {
    return createR2ImageUpload("products", id, contentType);
  }
  const uploadUrl = await signUploadUrl(`${getPrivateDir()}/uploads/${id}`);
  return {
    uploadUrl,
    imageUrl: `/api/storage/product-images/${id}`,
  };
}

export async function createPortfolioImageUpload(contentType: string) {
  const id = randomUUID();
  if (getStorageProvider() === "cloudinary") {
    return createCloudinaryUpload("portfolio", id);
  }
  if (getStorageProvider() === "r2") {
    return createR2ImageUpload("portfolio", id, contentType);
  }
  const uploadUrl = await signUploadUrl(`${getPrivateDir()}/portfolio-uploads/${id}`);
  return {
    uploadUrl,
    imageUrl: `/api/storage/portfolio-images/${id}`,
  };
}

export async function publishProductImage(id: string, ownerId: string) {
  if (getStorageProvider() === "cloudinary") {
    return publishCloudinaryImage("products", id);
  }
  if (getStorageProvider() === "r2") {
    await verifyR2Image("products", id);
    return `/api/storage/product-images/${id}`;
  }

  const file = getProductFile(id);
  const [exists] = await file.exists();
  if (!exists) throw new Error("Uploaded image was not found.");

  const [metadata] = await file.getMetadata();
  const contentType = String(metadata.contentType ?? "");
  const size = Number(metadata.size ?? 0);
  if (!contentType.startsWith("image/") || size <= 0 || size > 8 * 1024 * 1024) {
    throw new Error("Image must be a valid image file smaller than 8 MB.");
  }

  await file.setMetadata({
    cacheControl: "public, max-age=31536000, immutable",
    metadata: {
      printedProductImage: "public",
      uploadedBy: ownerId,
    },
  });
  return `/api/storage/product-images/${id}`;
}

export async function publishPortfolioImage(id: string, ownerId: string) {
  if (getStorageProvider() === "cloudinary") {
    return publishCloudinaryImage("portfolio", id);
  }
  if (getStorageProvider() === "r2") {
    await verifyR2Image("portfolio", id);
    return `/api/storage/portfolio-images/${id}`;
  }

  const file = getPortfolioFile(id);
  const [exists] = await file.exists();
  if (!exists) throw new Error("Uploaded image was not found.");

  const [metadata] = await file.getMetadata();
  const contentType = String(metadata.contentType ?? "");
  const size = Number(metadata.size ?? 0);
  if (!contentType.startsWith("image/") || size <= 0 || size > 8 * 1024 * 1024) {
    throw new Error("Image must be a valid image file smaller than 8 MB.");
  }

  await file.setMetadata({
    cacheControl: "public, max-age=31536000, immutable",
    metadata: {
      printedPortfolioImage: "public",
      uploadedBy: ownerId,
    },
  });
  return `/api/storage/portfolio-images/${id}`;
}

export async function streamProductImage(id: string): Promise<{
  contentType: string;
  size: number;
  stream?: ReadableStream<Uint8Array>;
  redirectUrl?: string;
} | null> {
  if (getStorageProvider() === "cloudinary") return null;
  if (getStorageProvider() === "r2") {
    return getR2ImageRedirect("products", id);
  }

  const file = getProductFile(id);
  const [metadata] = await file.getMetadata();
  if (metadata.metadata?.printedProductImage !== "public") return null;

  return {
    contentType: String(metadata.contentType ?? "application/octet-stream"),
    size: Number(metadata.size ?? 0),
    stream: Readable.toWeb(file.createReadStream()) as ReadableStream<Uint8Array>,
  };
}

export async function streamPortfolioImage(id: string): Promise<{
  contentType: string;
  size: number;
  stream?: ReadableStream<Uint8Array>;
  redirectUrl?: string;
} | null> {
  if (getStorageProvider() === "cloudinary") return null;
  if (getStorageProvider() === "r2") {
    return getR2ImageRedirect("portfolio", id);
  }

  const file = getPortfolioFile(id);
  const [metadata] = await file.getMetadata();
  if (metadata.metadata?.printedPortfolioImage !== "public") return null;

  return {
    contentType: String(metadata.contentType ?? "application/octet-stream"),
    size: Number(metadata.size ?? 0),
    stream: Readable.toWeb(file.createReadStream()) as ReadableStream<Uint8Array>,
  };
}

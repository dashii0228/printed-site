import { createHash } from "node:crypto";

type Collection = "products" | "portfolio";
const formats = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const maxBytes = 8 * 1024 * 1024;

function configuration() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !/^[a-zA-Z0-9_-]+$/.test(cloudName) || !apiKey || !apiSecret) {
    throw new Error("Cloudinary image storage is not configured.");
  }
  return { cloudName, apiKey, apiSecret };
}

function publicId(collection: Collection, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid image ID.");
  return `printed/${collection}/${id}`;
}

/** Only an authenticated administrator receives this signed upload request. */
export function createCloudinaryUpload(collection: Collection, id: string) {
  const { cloudName, apiKey, apiSecret } = configuration();
  const parameters: Record<string, string> = {
    allowed_formats: "jpg,jpeg,png,webp,gif",
    overwrite: "false",
    public_id: publicId(collection, id),
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const toSign = Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${parameters[key]}`)
    .join("&");
  const signature = createHash("sha256").update(toSign + apiSecret).digest("hex");
  const route = collection === "products" ? "product-images" : "portfolio-images";
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    uploadFields: { ...parameters, api_key: apiKey, signature },
    imageUrl: `/api/storage/${route}/${id}`,
  };
}

/** Independently verify the uploaded resource; never trust a browser-supplied URL. */
export async function publishCloudinaryImage(collection: Collection, id: string) {
  const { cloudName, apiKey, apiSecret } = configuration();
  const expectedId = publicId(collection, id);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${encodeURIComponent(expectedId)}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    // Never include a provider response or credentials in an error sent to the client.
    throw new Error(`Cloudinary image verification failed (${response.status}).`);
  }
  const resource = await response.json() as {
    public_id?: string;
    resource_type?: string;
    type?: string;
    bytes?: number;
    format?: string;
    secure_url?: string;
  };
  if (
    resource.public_id !== expectedId ||
    resource.resource_type !== "image" ||
    resource.type !== "upload" ||
    !Number.isInteger(resource.bytes) ||
    resource.bytes! <= 0 ||
    resource.bytes! > maxBytes ||
    !formats.has(resource.format ?? "")
  ) {
    throw new Error("Image must be PNG, JPG, WEBP or GIF and no larger than 8 MB.");
  }
  const url = new URL(resource.secure_url ?? "");
  if (
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com" ||
    !url.pathname.startsWith(`/${cloudName}/image/upload/`)
  ) {
    throw new Error("Cloudinary returned an invalid image URL.");
  }
  return url.href;
}

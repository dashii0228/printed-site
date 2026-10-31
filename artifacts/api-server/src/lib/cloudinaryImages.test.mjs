import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createCloudinaryUpload, publishCloudinaryImage } from "./cloudinaryImages.ts";

const id = "12345678-1234-4234-8234-123456789abc";
// Deliberately fake credentials; these tests never contact Cloudinary.
process.env.CLOUDINARY_CLOUD_NAME = "printed-test";
process.env.CLOUDINARY_API_KEY = "fake-key";
process.env.CLOUDINARY_API_SECRET = "fake-secret";

test("both collections receive scoped, immutable, correctly signed multipart uploads", () => {
  for (const collection of ["products", "portfolio"]) {
    const upload = createCloudinaryUpload(collection, id);
    assert.equal(upload.uploadUrl, "https://api.cloudinary.com/v1_1/printed-test/image/upload");
    assert.equal(upload.uploadFields.public_id, `printed/${collection}/${id}`);
    assert.equal(upload.uploadFields.overwrite, "false");
    assert.equal(upload.uploadFields.allowed_formats, "jpg,jpeg,png,webp,gif");
    const { api_key, signature, ...signed } = upload.uploadFields;
    const text = Object.keys(signed).sort().map(key => `${key}=${signed[key]}`).join("&");
    assert.equal(signature, createHash("sha256").update(text + "fake-secret").digest("hex"));
    assert.equal(api_key, "fake-key");
    assert.ok(!JSON.stringify(upload).includes("fake-secret"));
    assert.equal(upload.imageUrl.split("/").pop(), id);
  }
});

test("completion validates actual Cloudinary resource metadata before returning its CDN URL", async (t) => {
  for (const collection of ["products", "portfolio"]) {
    const publicId = `printed/${collection}/${id}`;
    const url = `https://res.cloudinary.com/printed-test/image/upload/v1/${publicId}.png`;
    const resource = {
      public_id: publicId, resource_type: "image", type: "upload",
      bytes: 100, format: "png", secure_url: url,
    };
    const requests = [];
    const mock = t.mock.method(globalThis, "fetch", async (target, options) => {
      requests.push({ target, options });
      return Response.json(resource);
    });
    assert.equal(await publishCloudinaryImage(collection, id), url);
    assert.ok(requests[0].target.endsWith(encodeURIComponent(publicId)));
    assert.ok(requests[0].options.headers.Authorization.startsWith("Basic "));
    mock.mock.restore();
    for (const invalid of [
      { bytes: 0 }, { bytes: 8388609 }, { format: "svg" },
      { public_id: `printed/other/${id}` }, { resource_type: "raw" },
      { type: "private" }, { secure_url: "https://example.com/image.png" },
    ]) {
      const mocked = t.mock.method(globalThis, "fetch", async () => Response.json({ ...resource, ...invalid }));
      await assert.rejects(() => publishCloudinaryImage(collection, id));
      mocked.mock.restore();
    }
  }
});

test("provider failures fail explicitly and do not leak error bodies", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response("sensitive provider diagnostic", { status: 401 }));
  await assert.rejects(() => publishCloudinaryImage("products", id), error => {
    assert.match(error.message, /\(401\)/);
    assert.ok(!error.message.includes("sensitive"));
    return true;
  });
});

test("missing configuration and invalid IDs cannot produce an upload request", () => {
  assert.throws(() => createCloudinaryUpload("products", "../other"));
  const secret = process.env.CLOUDINARY_API_SECRET;
  delete process.env.CLOUDINARY_API_SECRET;
  assert.throws(() => createCloudinaryUpload("products", id), /not configured/);
  process.env.CLOUDINARY_API_SECRET = secret;
});

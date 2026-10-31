import { test } from "node:test";
import assert from "node:assert/strict";
import { uploadImageFile } from "./upload-image.ts";

test("Cloudinary uses signed multipart POST without overriding the boundary header", async (t) => {
  const file = new File(["image bytes"], "example.png", { type: "image/png" });
  let request: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (_url: unknown, options?: RequestInit) => {
    request = options;
    return new Response("{}", { status: 200 });
  });
  await uploadImageFile({
    uploadUrl: "https://api.cloudinary.com/v1_1/test/image/upload",
    imageUrl: "/api/storage/product-images/test",
    uploadFields: { signature: "fake-signature", public_id: "printed/products/test" },
  }, file);
  assert.equal(request?.method, "POST");
  assert.equal(request?.headers, undefined);
  const body = request?.body as FormData;
  assert.equal(body.get("signature"), "fake-signature");
  assert.equal((body.get("file") as File).name, file.name);
});

test("existing GCS and R2 uploads keep their binary PUT contract", async (t) => {
  const file = new File(["image bytes"], "example.png", { type: "image/png" });
  let request: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (_url: unknown, options?: RequestInit) => {
    request = options;
    return new Response("", { status: 200 });
  });
  await uploadImageFile({ uploadUrl: "https://storage.example/upload", imageUrl: "/api/storage/test" }, file);
  assert.equal(request?.method, "PUT");
  assert.deepEqual(request?.headers, { "Content-Type": "image/png" });
  assert.equal(request?.body, file);
});

test("a failed direct upload prevents completion and saving", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("", { status: 403 }));
  await assert.rejects(() => uploadImageFile({
    uploadUrl: "https://storage.example/upload", imageUrl: "/api/storage/test",
  }, new File(["image"], "test.png", { type: "image/png" })), /хадгалж чадсангүй/);
});

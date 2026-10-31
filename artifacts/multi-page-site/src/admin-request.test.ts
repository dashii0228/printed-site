import { test } from "node:test";
import assert from "node:assert/strict";
import { createAdminFetch } from "./admin-request.ts";

test("admin calls get a current token for each request and preserve JSON payloads", async (t) => {
  let counter = 0;
  const requests: RequestInit[] = [];
  t.mock.method(globalThis, "fetch", async (_path: unknown, init?: RequestInit) => {
    requests.push(init!);
    return new Response("{}", { status: 200 });
  });
  const adminFetch = createAdminFetch(async () => `fake-session-${++counter}`, true);
  await adminFetch("/api/admin/access");
  await adminFetch("/api/admin/products/example", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: '{"name":"example"}',
  });
  assert.equal(new Headers(requests[0].headers).get("Authorization"), "Bearer fake-session-1");
  assert.equal(new Headers(requests[1].headers).get("Authorization"), "Bearer fake-session-2");
  assert.equal(new Headers(requests[1].headers).get("Content-Type"), "application/json");
  assert.equal(requests[1].body, '{"name":"example"}');
  assert.equal(requests[1].method, "PUT");
  assert.equal(requests[1].credentials, "include");
  assert.equal(requests[1].mode, "same-origin");
  assert.equal(requests[1].redirect, "error");
});

test("missing sessions and token errors never make an anonymous admin request", async (t) => {
  const request = t.mock.method(globalThis, "fetch");
  await assert.rejects(createAdminFetch(async () => null, true)("/api/admin/access"), /Нэвтрэлт/);
  await assert.rejects(createAdminFetch(async () => { throw new Error("session unavailable"); }, true)("/api/admin/access"), /session unavailable/);
  assert.equal(request.mock.callCount(), 0);
});

test("session tokens are never sent to upload providers or arbitrary URLs", async (t) => {
  const token = t.mock.fn(async () => "fake-session");
  const request = t.mock.method(globalThis, "fetch");
  const adminFetch = createAdminFetch(token, true);
  for (const path of [
    "https://api.cloudinary.com/v1_1/example/image/upload",
    "//other.example/api/admin/access",
    "/api/products/changes",
    "/api/admin/../../external",
    "/api/admin/\\other.example",
  ]) {
    await assert.rejects(adminFetch(path));
  }
  assert.equal(token.mock.callCount(), 0);
  assert.equal(request.mock.callCount(), 0);
});

test("authorization denials are preserved rather than retried or treated as success", async (t) => {
  for (const status of [401, 403, 503]) {
    const request = t.mock.method(globalThis, "fetch", async () => new Response('{"error":"denied"}', { status }));
    const response = await createAdminFetch(async () => "fake-session", true)("/api/admin/access");
    assert.equal(response.status, status);
    assert.equal(response.ok, false);
    assert.equal(request.mock.callCount(), 1);
    request.mock.restore();
  }
});

test("Replit's default cookie transport never reads or sends a session token", async (t) => {
  const token = t.mock.fn(async () => "fake-session");
  const request = t.mock.method(globalThis, "fetch", async (_path: unknown, init?: RequestInit) => {
    assert.equal(init?.credentials, "include");
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    return new Response("{}", { status: 200 });
  });
  await createAdminFetch(token)("/api/admin/access");
  assert.equal(token.mock.callCount(), 0);
  assert.equal(request.mock.callCount(), 1);
});

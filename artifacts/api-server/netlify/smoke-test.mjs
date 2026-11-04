import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Keep the output outside the repository so workspace node_modules cannot hide
// dependencies missing from a deployed Function. All credentials below are fake.
const directory = await mkdtemp(join(tmpdir(), "printed-function-smoke-"));
try {
  await build({
    entryPoints: [fileURLToPath(new URL("./functions/api.ts", import.meta.url))],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    outfile: join(directory, "api.cjs"),
  });
  const runner = `
    const assert = require("node:assert/strict");
    const { handler } = require("./api.cjs");
    const request = {
      httpMethod: "GET", path: "/api/healthz",
      headers: { host: "test.netlify.app" },
      queryStringParameters: null, body: null, isBase64Encoded: false,
      requestContext: { requestId: "packaging-smoke-test", identity: {} }
    };
    handler(request, {}).then(async response => {
      assert.equal(response.statusCode, 200);
      assert.deepEqual(JSON.parse(response.body), { status: "ok" });
      const access = await handler({ ...request, path: "/api/admin/access" }, {});
      assert.equal(access.statusCode, 401);
      assert.deepEqual(JSON.parse(access.body), { error: "Sign in is required." });
      assert.equal(access.headers["cache-control"], "no-store");
      for (const path of ["/api/admin/products/test-product", "/api/admin/portfolio/work-001"]) {
        const deleted = await handler({ ...request, path, httpMethod: "DELETE" }, {});
        assert.equal(deleted.statusCode, 401, "Deletion requires verified admin access");
      }
    }).catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const cases = [
    ["unset NODE_ENV", {}],
    ["production", { NODE_ENV: "production" }],
    ["Lambda development", { NODE_ENV: "development", AWS_LAMBDA_FUNCTION_NAME: "smoke-test" }],
  ];
  for (const [name, overrides] of cases) {
    const result = spawnSync(process.execPath, ["-e", runner], {
      cwd: directory,
      encoding: "utf8",
      timeout: 30_000,
      env: {
        PATH: process.env.PATH,
        DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
        CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from("printed-test.clerk.accounts.dev$").toString("base64")}`,
        CLERK_SECRET_KEY: "sk_test_fake_packaging_key",
        CLERK_TELEMETRY_DISABLED: "1",
        LOG_LEVEL: "silent",
        ...overrides,
      },
    });
    assert.equal(result.status, 0, `${name}: ${result.error?.message ?? ""}\n${result.stderr}\n${result.stdout}`);
    console.log(`PASS: isolated Function health with ${name}`);
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}

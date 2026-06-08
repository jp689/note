const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadModule(relativePath) {
  const absolutePath = path.join(__dirname, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  });
  const testModule = { exports: {} };
  const fn = new Function("exports", "module", "require", "__dirname", "__filename", outputText);
  fn(testModule.exports, testModule, require, path.dirname(absolutePath), absolutePath);
  return testModule.exports;
}

test("browser requests default to same-origin API paths when no public API URL is configured", () => {
  const { buildApiUrl } = loadModule("api-url.ts");

  assert.equal(
    buildApiUrl("/api/user/profile", {
      isServer: false,
      publicApiBaseUrl: undefined,
      internalApiBaseUrl: undefined
    }),
    "/api/user/profile"
  );
});

test("server requests can use the internal API URL while preserving absolute URLs", () => {
  const { buildApiUrl } = loadModule("api-url.ts");

  assert.equal(
    buildApiUrl("/api/documents", {
      isServer: true,
      publicApiBaseUrl: "https://ainote.cloud",
      internalApiBaseUrl: "http://api:8000"
    }),
    "http://api:8000/api/documents"
  );
  assert.equal(
    buildApiUrl("https://example.test/api/documents", {
      isServer: true,
      internalApiBaseUrl: "http://api:8000"
    }),
    "https://example.test/api/documents"
  );
});

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

test("public login routes do not require an auth redirect", () => {
  const { getAuthRedirectPath } = loadModule("auth-routes.ts");

  assert.equal(getAuthRedirectPath("/login", false), null);
  assert.equal(getAuthRedirectPath("/admin/login", false), null);
});

test("protected user routes redirect unauthenticated visitors to login", () => {
  const { getAuthRedirectPath } = loadModule("auth-routes.ts");

  assert.equal(getAuthRedirectPath("/", false), "/login");
  assert.equal(getAuthRedirectPath("/upload", false), "/login");
});

test("protected admin routes redirect unauthenticated visitors to admin login", () => {
  const { getAuthRedirectPath } = loadModule("auth-routes.ts");

  assert.equal(getAuthRedirectPath("/admin", false), "/admin/login");
  assert.equal(getAuthRedirectPath("/admin/users", false), "/admin/login");
});

test("authenticated visitors can access protected routes", () => {
  const { getAuthRedirectPath } = loadModule("auth-routes.ts");

  assert.equal(getAuthRedirectPath("/", true), null);
  assert.equal(getAuthRedirectPath("/admin/users", true), null);
});

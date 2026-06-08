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

test("groups knowledge nodes by chapter with a stable fallback chapter", () => {
  const { groupKnowledgeByChapter } = loadModule("document-insights.ts");

  const groups = groupKnowledgeByChapter([
    { id: "a", title: "A", chapterTitle: "第一章", sourcePages: [2], relations: [] },
    { id: "b", title: "B", sourcePages: [5], relations: [] },
    { id: "c", title: "C", chapterTitle: "第一章", sourcePages: [3], relations: [] }
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].chapterTitle, "第一章");
  assert.deepEqual(groups[0].nodes.map((node) => node.id), ["a", "c"]);
  assert.equal(groups[1].chapterTitle, "未归类章节");
});

test("builds incoming and outgoing relation summaries for selected knowledge nodes", () => {
  const { buildRelationSummary } = loadModule("document-insights.ts");

  const summary = buildRelationSummary("b", [
    {
      id: "a",
      title: "A",
      relations: [{ targetId: "b", label: "supports", reason: "A explains B", strength: 0.7 }]
    },
    {
      id: "b",
      title: "B",
      relations: [{ targetId: "c", label: "extends", reason: "B extends C", strength: 0.5 }]
    },
    { id: "c", title: "C", relations: [] }
  ]);

  assert.equal(summary.incoming.length, 1);
  assert.equal(summary.outgoing.length, 1);
  assert.equal(summary.incoming[0].sourceTitle, "A");
  assert.equal(summary.outgoing[0].targetTitle, "C");
});

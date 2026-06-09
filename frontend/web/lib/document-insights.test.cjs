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

test("builds a non-empty learning insight from knowledge details", () => {
  const { buildLearningInsight } = loadModule("document-insights.ts");

  const insight = buildLearningInsight([
    {
      id: "a",
      title: "实践与认识",
      summary: "实践是认识的基础，也是检验认识真理性的标准。",
      keyTakeaways: ["实践决定认识", "认识反作用于实践"],
      pitfalls: ["不要把认识看成脱离实践的纯观念"],
      reviewPrompt: "说明实践和认识的关系。",
      relations: [{ targetId: "b", label: "leads_to", reason: "实践观点支撑社会历史分析", strength: 0.8 }]
    },
    {
      id: "b",
      title: "社会历史发展",
      summary: "生产力与生产关系的矛盾运动推动社会发展。",
      keyTakeaways: ["矛盾运动推动发展"],
      examples: ["分析社会形态更替"],
      relations: []
    }
  ]);

  assert.equal(insight.focusTitle, "实践与认识");
  assert.match(insight.overview, /实践/);
  assert.deepEqual(insight.takeaways.slice(0, 2), ["实践决定认识", "认识反作用于实践"]);
  assert.equal(insight.pitfalls[0], "不要把认识看成脱离实践的纯观念");
  assert.match(insight.relationHighlights[0], /实践观点支撑社会历史分析/);
});

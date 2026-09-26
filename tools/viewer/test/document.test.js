import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  openDocument,
  serializeDocument,
  editNode,
  addNode,
  removeNode,
  moveNode,
} from "../src/document.js";
const fixture = readFileSync(
  new URL("../examples/rebrand.md", import.meta.url),
  "utf8",
);
test("no-op is byte-for-byte and editing preserves all surrounding project context", () => {
  const doc = openDocument(fixture);
  assert.equal(serializeDocument(doc), fixture);
  editNode(doc.tree, "n1", { question: "What is the new brand narrative?" });
  const out = serializeDocument(doc);
  assert.match(out, /- What is the new brand narrative\?/);
  assert.equal(
    out.split("## Issue tree")[0],
    fixture.split("## Issue tree")[0],
  );
  assert.equal(
    out.slice(out.indexOf("## Sources")),
    fixture.slice(fixture.indexOf("## Sources")),
  );
  assert.match(out, /Converted from the \[Coggle/);
});
test("answers with rich text and paragraphs survive edit-save-reopen", () => {
  const d = openDocument("# Inquiry\n- First?\n  - Child?\n");
  editNode(d.tree, "n2", {
    answer:
      "A **strong** answer with [a source](https://example.com).\n\nAnother paragraph.",
  });
  const reopened = openDocument(serializeDocument(d));
  assert.equal(
    reopened.tree.children[0].children[0].answer,
    "A **strong** answer with [a source](https://example.com).\n\nAnother paragraph.",
  );
});
test("move, reorder, add and delete preserve child content", () => {
  const d = openDocument("# Test\n\n- One?\n  - Child? **✅ Yes.**\n- Two?\n");
  moveNode(d.tree, "n2", "n3");
  assert.equal(d.tree.children[1].children[0].question, "Child?");
  const n = addNode(d.tree, "n3", { question: "New?" });
  removeNode(d.tree, "n1");
  const r = openDocument(serializeDocument(d));
  assert.equal(r.tree.children[0].children[0].answer, "Yes.");
  assert.equal(r.tree.children[0].children[1].question, "New?");
  assert.throws(() => moveNode(d.tree, "n3", n.id), /descendant|itself/);
});
test("root edits target bold root, not project title", () => {
  const d = openDocument(
    "# Project\n\n## Issue tree\nIntro.\n\n**Original root?**\n\n- Child?\n\n## After\nKeep.",
  );
  d.tree.title = "New root?";
  const text = serializeDocument(d);
  assert.match(text, /# Project/);
  assert.match(text, /\*\*New root\?\*\*/);
  assert.match(text, /## After\nKeep\./);
});
test("rejects ambiguous list regions and unrepresentable edits without producing lossy output", () => {
  const d = openDocument("- One?\n\nSeparate prose.\n\n- Two?");
  assert.match(d.readOnlyReason, /multiple|separate/i);
  const e = openDocument("- One?");
  editNode(e.tree, "n1", { answer: "Answer\n\n- Not a child" });
  assert.throws(() => serializeDocument(e), /represent|round.trip/i);
});
test("reference definitions and CRLF survive save", () => {
  const d = openDocument(
    "---\r\nname: Test\r\n---\r\n# Title\r\n\r\n- One? **✅ [source][s]**\r\n\r\n[s]: https://example.com\r\n",
  );
  editNode(d.tree, "n1", { question: "Changed?" });
  const out = serializeDocument(d);
  assert.match(out, /\[s\]: https:\/\/example.com\r\n/);
  assert.ok(!out.replaceAll("\r\n", "").includes("\n"));
  assert.match(out, /name: Test/);
});

import { rebaseDocument } from "../src/document.js";
test("saving rebases source without changing node identity or preventing undo", () => {
  const d = openDocument("- Parent?\n  - Child?\n");
  const before = structuredClone(d.tree);
  const added = addNode(d.tree, "n1", { question: "Added?" });
  const text = serializeDocument(d);
  const saved = rebaseDocument(d, text);
  assert.equal(saved.tree.children[0].children[1].id, added.id);
  assert.equal(serializeDocument(saved), text);
  saved.tree = before;
  assert.equal(
    openDocument(serializeDocument(saved)).tree.children[0].children.length,
    1,
  );
});

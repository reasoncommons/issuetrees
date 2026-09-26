import test from "node:test";
import assert from "node:assert/strict";
import { layoutTree } from "../src/layout.js";
test("compact layout uses both sides and content widths without overlaps", () => {
  const root = {
    id: "root",
    children: [
      { id: "a", children: [{ id: "aa", children: [] }] },
      { id: "b", children: [] },
      { id: "c", children: [] },
    ],
  };
  const sizes = new Map([
    ["root", { width: 210, height: 60 }],
    ["a", { width: 170, height: 40 }],
    ["aa", { width: 130, height: 50 }],
    ["b", { width: 250, height: 80 }],
    ["c", { width: 90, height: 30 }],
  ]);
  const r = layoutTree(root, sizes);
  assert.ok(r.nodes.some((n) => n.side === -1));
  assert.ok(r.nodes.some((n) => n.side === 1));
  assert.equal(r.nodes.find((n) => n.id === "c").width, 90);
  for (let i = 0; i < r.nodes.length; i++)
    for (const b of r.nodes.slice(i + 1)) {
      const a = r.nodes[i];
      assert.ok(
        !(
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y
        ),
      );
    }
});

test("an expanded branch keeps the root branches on their original sides", () => {
  const root = {
    id: "root",
    children: [
      { id: "a", children: [] },
      { id: "b", children: [] },
      { id: "c", children: [] },
    ],
  };
  const sides = new Map();
  const sizes = new Map(
    root.children.map((n) => [n.id, { width: 120, height: 30 }]),
  );
  const first = layoutTree(root, sizes, { sides });
  const prior = first.nodes
    .filter((n) => n.id !== "root")
    .map((n) => [n.id, n.side]);
  sizes.set("a", { width: 120, height: 300 });
  const next = layoutTree(root, sizes, { sides });
  assert.deepEqual(
    next.nodes.filter((n) => n.id !== "root").map((n) => [n.id, n.side]),
    prior,
  );
});

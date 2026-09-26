import { fromMarkdown } from "mdast-util-from-markdown";
import { parseTree } from "./parser.js";
const text = (n) => n.value ?? (n.children || []).map(text).join("");
export const flatten = (tree) => [tree, ...tree.children.flatMap(flatten)];
const comparable = (n) =>
  n.id === "root"
    ? { title: n.title, children: n.children.map(comparable) }
    : {
        question: n.question.trim().replaceAll("\r\n", "\n"),
        answer: n.answer.trim().replaceAll("\r\n", "\n"),
        children: n.children.map(comparable),
      };
const fingerprint = (n) => JSON.stringify(comparable(n));

export function openDocument(source) {
  source = String(source);
  if (source.length > 1000000)
    throw new Error("Choose a document smaller than 1 MB.");
  const tree = parseTree(source),
    front = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/)?.[0] || "",
    body = source.slice(front.length),
    ast = fromMarkdown(body);
  const offset = (n) => ({
    start: n.position.start.offset + front.length,
    end: n.position.end.offset + front.length,
  });
  let blocks = ast.children;
  const si = blocks.findIndex(
    (n) => n.type === "heading" && /^issue tree$/i.test(text(n).trim()),
  );
  if (si >= 0) {
    const depth = blocks[si].depth;
    blocks = blocks.slice(si + 1);
    const end = blocks.findIndex(
      (n) => n.type === "heading" && n.depth <= depth,
    );
    if (end >= 0) blocks = blocks.slice(0, end);
  }
  const lists = blocks.filter((n) => n.type === "list"),
    before = blocks.slice(0, blocks.indexOf(lists[0]));
  const root =
    before.findLast(
      (n) =>
        n.type === "paragraph" &&
        n.children.length === 1 &&
        n.children[0].type === "strong",
    ) || ast.children.find((n) => n.type === "heading" && n.depth === 1);
  const doc = {
    source,
    tree,
    original: fingerprint(tree),
    title: tree.title,
    root: root ? { ...offset(root), type: root.type } : null,
    list: { start: offset(lists[0]).start, end: offset(lists.at(-1)).end },
    newline: source.includes("\r\n") ? "\r\n" : "\n",
    meta: {},
    readOnlyReason:
      lists.length !== 1
        ? "This document has multiple separate lists. Open a single Issue tree section to edit safely."
        : "",
  };
  let index = 0;
  function capture(item) {
    const id = `n${++index}`,
      children = item.children.filter((n) => n.type === "list"),
      first = children[0],
      last = children.at(-1),
      range = offset(item);
    let ownEnd = range.end;
    if (
      children.length > 1 ||
      (last && item.children.indexOf(last) !== item.children.length - 1)
    )
      doc.readOnlyReason =
        "A node interleaves child lists and other content. View it here; simplify the nesting before editing safely.";
    if (first) {
      const start = offset(first).start;
      ownEnd = source.lastIndexOf("\n", start - 1) + 1;
    }
    const raw = source
        .slice(range.start, ownEnd)
        .trimEnd()
        .replaceAll("\r\n", "\n"),
      indent = item.position.start.column - 1;
    const own = raw
      .split("\n")
      .map((line, i) =>
        i && line.startsWith(" ".repeat(indent)) ? line.slice(indent) : line,
      )
      .join("\n");
    const n = flatten(tree).find((n) => n.id === id);
    doc.meta[id] = { question: n.question, answer: n.answer, own };
    for (const list of children) list.children.forEach(capture);
  }
  lists.forEach((l) => l.children.forEach(capture));
  return doc;
}

/** Reconstruct only the tree list and (if edited) root. All other bytes survive. */
export function serializeDocument(doc) {
  if (fingerprint(doc.tree) === doc.original) return doc.source;
  if (doc.readOnlyReason) throw new Error(doc.readOnlyReason);
  if (!doc.tree.children.length)
    throw new Error("Keep at least one question in the tree.");
  const seen = new Set();
  function item(n, depth) {
    if (seen.has(n.id))
      throw new Error("A question cannot appear twice or contain itself.");
    seen.add(n.id);
    if (seen.size > 1000) throw new Error("Use at most 1,000 questions.");
    if (!n.question.trim()) throw new Error("Every question needs some text.");
    const old = doc.meta[n.id];
    let own;
    if (old && old.question === n.question && old.answer === n.answer)
      own = old.own;
    else {
      const q = n.question.trim().replaceAll("\r\n", "\n");
      const a = n.answer.trim().replaceAll("\r\n", "\n");
      const content = q + (a ? " **✅** " + a : "");
      own = "- " + content.split("\n").join("\n  ");
    }
    const pad = "  ".repeat(depth);
    return (
      own
        .split("\n")
        .map((line) => pad + line)
        .join("\n") +
      (n.children.length
        ? "\n" + n.children.map((c) => item(c, depth + 1)).join("\n")
        : "")
    );
  }
  const list = doc.tree.children
    .map((n) => item(n, 0))
    .join("\n")
    .replaceAll("\n", doc.newline);
  const patches = [{ ...doc.list, value: list }];
  if (doc.tree.title !== doc.title) {
    if (!doc.tree.title.trim() || doc.tree.title.includes("\n"))
      throw new Error("Use a single-line root question.");
    if (doc.root)
      patches.push({
        ...doc.root,
        value:
          doc.root.type === "heading"
            ? "# " + doc.tree.title
            : "**" + doc.tree.title + "**",
      });
    else
      patches[0].value =
        "**" + doc.tree.title + "**" + doc.newline + doc.newline + list;
  }
  let result = doc.source;
  for (const p of patches.sort((a, b) => b.start - a.start))
    result = result.slice(0, p.start) + p.value + result.slice(p.end);
  let parsed;
  try {
    parsed = parseTree(result);
  } catch {
    throw new Error(
      "This edit cannot be represented safely in the current Markdown convention.",
    );
  }
  if (fingerprint(parsed) !== fingerprint(doc.tree))
    throw new Error(
      "This edit cannot round-trip safely. Use paragraphs for answers and the branch controls for nested questions. No file was changed.",
    );
  return result;
}
export function findNode(tree, id) {
  return flatten(tree).find((n) => n.id === id);
}
export function editNode(tree, id, fields) {
  const n = findNode(tree, id);
  if (!n) throw new Error("Question not found.");
  if (id === "root") {
    n.title = fields.title ?? n.title;
    return;
  }
  if (fields.question !== undefined) n.question = fields.question;
  if (fields.answer !== undefined) n.answer = fields.answer;
}
export function addNode(
  tree,
  parentId,
  { question = "New question?", answer = "" } = {},
) {
  const parent = findNode(tree, parentId);
  if (!parent) throw new Error("Parent not found.");
  const node = {
    id: "new-" + crypto.randomUUID(),
    question,
    answer,
    children: [],
  };
  parent.children.push(node);
  return node;
}
export function removeNode(tree, id) {
  if (id === "root") throw new Error("The root cannot be deleted.");
  const parent = flatten(tree).find((n) => n.children.some((c) => c.id === id));
  if (!parent) throw new Error("Question not found.");
  if (parent.id === "root" && parent.children.length === 1)
    throw new Error("Keep at least one main branch.");
  parent.children = parent.children.filter((c) => c.id !== id);
}
export function moveNode(tree, id, parentId, index) {
  const node = findNode(tree, id),
    parent = findNode(tree, parentId);
  if (!node || !parent || id === "root")
    throw new Error("Choose a question and its new parent.");
  if (flatten(node).some((n) => n.id === parentId))
    throw new Error("A question cannot move inside itself or a descendant.");
  const old = flatten(tree).find((n) => n.children.some((c) => c.id === id));
  old.children = old.children.filter((c) => c.id !== id);
  parent.children.splice(
    index === undefined
      ? parent.children.length
      : Math.max(0, Math.min(index, parent.children.length)),
    0,
    node,
  );
}

/** Adopt the saved bytes while keeping session IDs and undo snapshots meaningful. */
export function rebaseDocument(doc, source) {
  const next = openDocument(source),
    old = flatten(doc.tree),
    fresh = flatten(next.tree),
    meta = {};
  if (old.length !== fresh.length)
    throw new Error("Saved document structure changed unexpectedly.");
  fresh.forEach((node, i) => {
    if (next.meta[node.id]) meta[old[i].id] = next.meta[node.id];
    node.id = old[i].id;
  });
  next.meta = meta;
  return next;
}

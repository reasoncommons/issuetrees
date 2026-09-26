import "./style.css";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { layoutTree } from "./layout.js";
import {
  openDocument,
  rebaseDocument,
  serializeDocument,
  flatten,
  findNode,
  editNode,
  addNode,
  removeNode,
  moveNode,
} from "./document.js";
import { saveToHandle, saveToServer } from "./persistence.js";
import sample from "../examples/rebrand.md?raw";
const $ = (s) => document.querySelector(s),
  palette = [
    ["#80cdb9", "#385f55"],
    ["#bd99d5", "#654b78"],
    ["#e6ae79", "#795533"],
    ["#7db4d2", "#395c73"],
    ["#d79291", "#784c4c"],
    ["#b9c977", "#596731"],
  ];
let generation = 0;
let doc,
  target = null,
  selected = null,
  collapsed = new Set(),
  answers = new Set(),
  undo = [],
  redo = [],
  savedTree = "",
  layout,
  scale = 1,
  tx = 0,
  ty = 0,
  view = innerWidth < 650 ? "outline" : "map",
  saving = false,
  baseUrl = "";
const viewport = $("#viewport"),
  world = $("#world"),
  editor = $("#editor");
const clone = (x) => structuredClone(x);
const dirty = () => JSON.stringify(doc.tree) !== savedTree;
function notice(message) {
  $("#notice span").textContent = message;
  $("#notice").hidden = !message;
}
$("#dismiss-notice").onclick = () => notice("");
function rich(markdown) {
  const el = document.createElement("div");
  el.innerHTML = DOMPurify.sanitize(
    marked.parse(markdown + "\n\n" + (doc?.tree.definitions || "")),
    {
      ALLOWED_TAGS: [
        "p",
        "strong",
        "em",
        "a",
        "code",
        "pre",
        "br",
        "ul",
        "ol",
        "li",
        "blockquote",
        "del",
      ],
      ALLOWED_ATTR: ["href", "title"],
    },
  );
  el.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) {
      if (
        baseUrl &&
        !/^[a-z][a-z\d+.-]*:/i.test(href) &&
        !href.startsWith("//")
      )
        a.href = new URL(href, baseUrl).href;
      else {
        a.removeAttribute("href");
        a.className = "unavailable";
        a.title = "Source-relative link: " + href;
        a.tabIndex = 0;
        a.onclick = (e) => {
          e.stopPropagation();
          notice("Open " + href + " from the original Markdown project.");
        };
        return;
      }
    }
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.onclick = (e) => e.stopPropagation();
  });
  return el;
}
function plainLabel(n) {
  const el = rich(n.id === "root" ? n.title : n.question);
  return el.textContent.trim();
}
function draftDirty() {
  const n = selected && findNode(doc.tree, selected);
  return (
    !!n &&
    !$("#editor").hidden &&
    (n.id === "root"
      ? $("#question").value !== n.title
      : $("#question").value !== n.question || $("#answer").value !== n.answer)
  );
}
function updateStatus() {
  const unsaved = dirty() || draftDirty();
  $("#save-state").textContent = saving
    ? "Saving…"
    : unsaved
      ? "Unsaved changes"
      : target
        ? "Saved to " +
          (target.kind === "server" ? "local file" : "opened file")
        : "Example / imported copy";
  $("#save-state").classList.toggle("dirty", unsaved);
  $("#save").textContent = target ? "Save" : "Save a copy";
  $("#save").disabled =
    saving || !!doc.readOnlyReason || (!unsaved && !!target);
  $("#editor").inert = saving;
  for (const id of ["open", "paste-toggle", "load-paste"])
    $("#" + id).disabled = saving;
  $("#undo").disabled = saving || !undo.length;
  $("#redo").disabled = saving || !redo.length;
  $("#draft-state").textContent = draftDirty() ? "Not yet applied" : "";
  document.title =
    (unsaved ? "• " : "") + $("#document-name").textContent + " — Issue Trees";
}
function transact(action, anchor = selected) {
  if (saving) return false;
  const before = clone(doc.tree);
  try {
    action();
    serializeDocument(doc);
    undo.push(before);
    if (undo.length > 60) undo.shift();
    redo = [];
    notice("");
    syncPanel();
    render(anchor);
    updateStatus();
    return true;
  } catch (e) {
    doc.tree = before;
    notice(e.message);
    updateStatus();
    return false;
  }
}
function applyDraft() {
  if (saving) return false;
  if (!draftDirty()) return true;
  const q = $("#question").value,
    a = $("#answer").value;
  return transact(() =>
    editNode(
      doc.tree,
      selected,
      selected === "root" ? { title: q } : { question: q, answer: a },
    ),
  );
}
function syncPanel() {
  if (!selected || !findNode(doc.tree, selected)) {
    $("#editor").hidden = true;
    selected = null;
    return;
  }
  const n = findNode(doc.tree, selected);
  $("#editor").hidden = false;
  $("#question").value = n.id === "root" ? n.title : n.question;
  $("#answer").value = n.answer || "";
  $("#answer-fields").hidden = n.id === "root";
  editor.querySelector("details").open = false;
  const forbidden = new Set(flatten(n).map((c) => c.id));
  $("#parent").replaceChildren();
  for (const p of flatten(doc.tree)) {
    if (forbidden.has(p.id)) continue;
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = plainLabel(p).slice(0, 100);
    $("#parent").append(option);
  }
  const parent = flatten(doc.tree).find((p) =>
    p.children.some((c) => c.id === n.id),
  );
  if (parent) $("#parent").value = parent.id;
  for (const id of ["parent", "add-sibling", "delete", "move-up", "move-down"])
    $("#" + id).disabled = n.id === "root";
  $("#draft-state").textContent = "";
}
function selectNode(id, field = "question") {
  if (saving || (selected === id && !editor.hidden)) return;
  if (!applyDraft()) return;
  if (doc.readOnlyReason) {
    notice(doc.readOnlyReason);
    return;
  }
  selected = id;
  syncPanel();
  render(id);
  if (view === "map") {
    // Text editing should happen at a readable scale, even from an overview.
    if (scale < 0.9) zoom(1 / scale);
    const rect = editor.getBoundingClientRect(),
      bounds = viewport.getBoundingClientRect();
    tx +=
      Math.max(0, bounds.left + 24 - rect.left) -
      Math.max(0, rect.right - bounds.right + 24);
    ty +=
      Math.max(0, bounds.top + 24 - rect.top) -
      Math.max(0, rect.bottom - bounds.bottom + 60);
    transform();
  }
  $("#" + (id === "root" ? "question" : field)).focus({
    preventScroll: view === "map",
  });
  updateStatus();
}
function finishEditing() {
  if (!applyDraft()) return;
  const id = selected;
  selected = null;
  editor.hidden = true;
  render(id);
  const scope = view === "map" ? $("#nodes") : $("#outline");
  scope.querySelector(`[data-id="${id}"]`)?.focus({ preventScroll: true });
  updateStatus();
}
function sizeDraft() {
  for (const field of editor.querySelectorAll("textarea")) {
    field.style.height = "0px";
    field.style.height = Math.max(20, field.scrollHeight) + "px";
  }
}
function content(n) {
  const el = document.createElement("div");
  const q = rich(n.id === "root" ? n.title : n.question);
  q.className = "question";
  el.append(q);
  if (n.answer) {
    const a = document.createElement("div");
    a.className = "answer";
    const body = rich(n.answer);
    body.className = "answer-content" + (answers.has(n.id) ? "" : " preview");
    a.append(body);
    const b = document.createElement("button");
    b.className = "answer-toggle";
    b.dataset.answer = n.id;
    b.textContent = answers.has(n.id) ? "less" : "more";
    b.setAttribute("aria-expanded", answers.has(n.id));
    b.onclick = (e) => {
      e.stopPropagation();
      answers.has(n.id) ? answers.delete(n.id) : answers.add(n.id);
      render(n.id);
      const scope = view === "map" ? $("#nodes") : $("#outline");
      scope
        .querySelector(`[data-answer="${n.id}"]`)
        ?.focus({ preventScroll: true });
    };
    a.append(b);
    el.append(a);
  }
  return el;
}
function measureAnswers(scope) {
  scope.querySelectorAll(".answer-content.preview").forEach((body) => {
    const overflow = body.scrollHeight > body.clientHeight + 1;
    body.nextElementSibling.hidden = !overflow;
    if (overflow) body.querySelectorAll("a").forEach((a) => (a.tabIndex = -1));
    else body.classList.remove("preview");
  });
}
function visible(n) {
  return { ...n, children: collapsed.has(n.id) ? [] : n.children.map(visible) };
}
function render(anchor) {
  const before = layout?.nodes.find((n) => n.id === anchor);
  const scroll = $("#outline").scrollTop;
  const focused = editor.contains(document.activeElement)
    ? document.activeElement
    : null;
  const range =
    focused?.tagName === "TEXTAREA"
      ? [focused.selectionStart, focused.selectionEnd]
      : null;
  // Keep the actual draft elements alive while rebuilding the surrounding map.
  document.querySelector("main").append(editor);
  $("#nodes").replaceChildren();
  const nodes = new Map(flatten(doc.tree).map((n) => [n.id, n])),
    shown = visible(doc.tree),
    sizes = new Map(),
    elements = new Map();
  function mount(n, branch = 0) {
    const actual = nodes.get(n.id),
      el = document.createElement("article");
    el.className =
      "node" +
      (n.id === "root" ? " root" : "") +
      (selected === n.id ? " selected" : "") +
      (collapsed.has(n.id) ? " folded" : "");
    el.dataset.id = n.id;
    el.tabIndex = 0;
    el.setAttribute("aria-label", "Edit: " + plainLabel(actual));
    el.style.setProperty("--branch", palette[branch % palette.length][0]);
    el.style.setProperty("--ink", palette[branch % palette.length][1]);
    if (selected === n.id && view === "map" && !editor.hidden) {
      el.classList.add("editing");
      el.append(editor);
    } else el.append(content(actual));
    el.onclick = (e) => {
      if (!e.target.closest("a,button,#editor"))
        selectNode(n.id, e.target.closest(".answer") ? "answer" : "question");
    };
    el.onkeydown = (e) => {
      if (e.target !== el) return;
      if (e.key === "Enter") {
        e.preventDefault();
        selectNode(n.id);
      }
      if (e.key === "Tab" && !e.shiftKey) {
        /* native focus order retained */
      }
    };
    if (actual.children.length && n.id !== "root") {
      const b = document.createElement("button");
      b.className = "fold";
      b.textContent = collapsed.has(n.id) ? actual.children.length : "−";
      b.setAttribute(
        "aria-label",
        (collapsed.has(n.id) ? "Expand " : "Collapse ") + plainLabel(actual),
      );
      b.setAttribute("aria-expanded", !collapsed.has(n.id));
      b.onclick = (e) => {
        e.stopPropagation();
        if (selected) {
          finishEditing();
          if (selected) return;
        }
        collapsed.has(n.id) ? collapsed.delete(n.id) : collapsed.add(n.id);
        render(n.id);
        $("#nodes")
          .querySelector(`[data-id="${n.id}"] .fold`)
          ?.focus({ preventScroll: true });
      };
      el.append(b);
    }
    $("#nodes").append(el);
    if (el.contains(editor)) sizeDraft();
    measureAnswers(el);
    sizes.set(n.id, { width: el.offsetWidth, height: el.offsetHeight });
    elements.set(n.id, el);
    n.children.forEach((c, i) => mount(c, n.id === "root" ? i : branch));
  }
  mount(shown);
  layout = layoutTree(shown, sizes);
  for (const n of layout.nodes) {
    const el = elements.get(n.id);
    el.style.left = n.x + "px";
    el.style.top = n.y + "px";
    el.classList.toggle("left", n.side === -1);
  }
  const svg = $("#connections");
  svg.replaceChildren();
  svg.setAttribute("width", "1");
  svg.setAttribute("height", "1");
  for (const { from, to } of layout.edges) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path"),
      side = to.side;
    const x1 = side === 1 ? from.x + from.width : from.x,
      y1 = from.id === "root" ? from.y + from.height / 2 : from.y + from.height;
    const x2 = side === 1 ? to.x : to.x + to.width,
      y2 = to.y + to.height;
    const end = side === 1 ? to.x + to.width : to.x;
    const curve = Math.max(22, Math.abs(x2 - x1) * 0.55);
    path.setAttribute(
      "d",
      `M ${x1} ${y1} C ${x1 + side * curve} ${y1}, ${x2 - side * curve} ${y2}, ${x2} ${y2} L ${end} ${y2}`,
    );
    path.setAttribute("stroke", palette[to.branch % palette.length][0]);
    path.setAttribute(
      "stroke-width",
      to.depth === 1 ? "5" : to.depth === 2 ? "3.5" : "2.5",
    );
    svg.append(path);
  }
  if (before) {
    const after = layout.nodes.find((n) => n.id === anchor);
    if (after) {
      tx += (before.x - after.x) * scale;
      ty += (before.y - after.y) * scale;
    }
  }
  transform();
  renderOutline();
  $("#outline").scrollTop = scroll;
  if (focused && !editor.hidden) {
    focused.focus({ preventScroll: true });
    if (range) focused.setSelectionRange(...range);
  }
}
function renderOutline() {
  const out = $("#outline");
  out.replaceChildren();
  const heading = document.createElement("h1");
  const rootButton = document.createElement("button");
  rootButton.textContent = doc.tree.title;
  rootButton.onclick = () => selectNode("root");
  heading.dataset.id = "root";
  heading.tabIndex = -1;
  if (selected === "root" && view === "outline" && !editor.hidden)
    heading.append(editor);
  else heading.append(rootButton);
  out.append(heading);
  function list(nodes) {
    const ul = document.createElement("ul");
    nodes.forEach((n, i) => {
      const li = document.createElement("li");
      li.dataset.id = n.id;
      li.style.setProperty("--branch", palette[i % palette.length][0]);
      if (n.id === selected) li.classList.add("selected");
      const inner = content(n);
      const answer = inner.querySelector(".answer");
      if (answer)
        answer.onclick = (e) => {
          if (!e.target.closest("a,button")) selectNode(n.id, "answer");
        };
      const question = inner.querySelector(".question");
      const b = document.createElement("button");
      b.className = "outline-question";
      b.append(...question.childNodes);
      b.onclick = () => selectNode(n.id);
      question.replaceWith(b);
      li.tabIndex = -1;
      if (selected === n.id && view === "outline" && !editor.hidden)
        li.append(editor);
      else li.append(inner);
      if (n.children.length) li.append(list(n.children));
      ul.append(li);
    });
    return ul;
  }
  out.append(list(doc.tree.children));
  if (view === "outline") {
    sizeDraft();
    measureAnswers(out);
  }
}
function transform() {
  world.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
  $("#zoom").textContent = Math.round(scale * 100) + "%";
}
function fit() {
  const w = viewport.clientWidth,
    h = viewport.clientHeight;
  scale = Math.min(
    1.05,
    Math.max(0.2, Math.min((w - 90) / layout.width, (h - 110) / layout.height)),
  );
  tx = (w - layout.width * scale) / 2 - layout.minX * scale;
  ty = (h - 45 - layout.height * scale) / 2 - layout.minY * scale;
  transform();
}
function setView(next) {
  if (selected) {
    finishEditing();
    if (selected) return;
  }
  view = next;
  viewport.hidden = view !== "map";
  $("#outline").hidden = view !== "outline";
  $(".zoom-controls").hidden = view !== "map";
  $("#map-view").setAttribute("aria-pressed", view === "map");
  $("#outline-view").setAttribute("aria-pressed", view === "outline");
  render();
  if (view === "map") fit();
}
function resetDepth(depth = 2) {
  collapsed.clear();
  function walk(n, d) {
    if (d >= depth && n.children.length) collapsed.add(n.id);
    n.children.forEach((c) => walk(c, d + 1));
  }
  walk(doc.tree, 0);
}
function load(source, name, newTarget = null, isSample = false) {
  if (saving) return;
  const next = openDocument(source);
  doc = next;
  generation++;
  target = newTarget;
  selected = null;
  undo = [];
  redo = [];
  answers.clear();
  savedTree = JSON.stringify(doc.tree);
  baseUrl = isSample
    ? "https://github.com/life-itself/planning/blob/main/projects/2608-seeds-of-renaissance-rebrand.md"
    : "";
  $("#document-name").textContent = name;
  $("#editor").hidden = true;
  $("#import").hidden = true;
  $("#source-panel").hidden = true;
  resetDepth();
  notice(doc.readOnlyReason);
  setView(view);
  updateStatus();
}
function canReplace() {
  if (saving) return false;
  return (
    !(dirty() || draftDirty()) ||
    confirm("Discard your unsaved edits and open another document?")
  );
}
async function openFile() {
  if (!canReplace()) return;
  try {
    if ("showOpenFilePicker" in window) {
      const [handle] = await showOpenFilePicker({
        types: [
          {
            description: "Markdown",
            accept: { "text/plain": [".md", ".markdown", ".txt"] },
          },
        ],
        multiple: false,
      });
      const file = await handle.getFile();
      load(await file.text(), file.name, { kind: "handle", handle });
    } else $("#file").click();
  } catch (e) {
    if (e.name !== "AbortError")
      notice("Could not open the file: " + e.message);
  }
}
$("#file").onchange = async (e) => {
  const file = e.target.files[0];
  if (file)
    try {
      load(await file.text(), file.name);
      notice(
        "Opened a copy. Use Save a copy to download your edited Markdown.",
      );
    } catch (e) {
      notice(e.message);
    }
  e.target.value = "";
};
function download(content) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/markdown;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  const name = $("#document-name").textContent;
  a.download = /\.md$/i.test(name) ? name : name + ".md";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function save() {
  if (saving || !applyDraft()) return;
  try {
    const content = serializeDocument(doc);
    saving = true;
    updateStatus();
    if (target?.kind === "server") {
      target = { kind: "server", ...(await saveToServer(target, content)) };
    } else if (target?.kind === "handle") {
      await saveToHandle(target.handle, doc.source, content);
    } else if ("showSaveFilePicker" in window) {
      const handle = await showSaveFilePicker({
        suggestedName:
          $("#document-name").textContent.replace(/\.md$/i, "") + ".md",
        types: [{ description: "Markdown", accept: { "text/plain": [".md"] } }],
      });
      const existing = await (await handle.getFile()).text();
      await saveToHandle(handle, existing, content);
      target = { kind: "handle", handle };
    } else {
      download(content);
      notice(
        "Downloaded your Markdown. The original file has not been changed.",
      );
      return;
    }
    doc = rebaseDocument(doc, content);
    savedTree = JSON.stringify(doc.tree);
    syncPanel();
    render(selected);
    notice("Saved.");
  } catch (e) {
    if (e.name !== "AbortError") notice(e.message);
  } finally {
    saving = false;
    updateStatus();
  }
}
$("#node-form").onsubmit = (e) => {
  e.preventDefault();
  finishEditing();
};
$("#question").oninput = $("#answer").oninput = (e) => {
  if (!e.isComposing) render(selected);
  updateStatus();
};
editor.addEventListener("compositionend", () => {
  render(selected);
  updateStatus();
});
editor.addEventListener("keydown", (e) => {
  if (e.isComposing) return;
  if (e.key === "Escape") {
    e.preventDefault();
    $("#cancel-edit").click();
  }
  if (e.key === "Enter" && !e.shiftKey && e.target.tagName === "TEXTAREA") {
    e.preventDefault();
    e.stopPropagation();
    finishEditing();
  }
});
editor.querySelector("details").addEventListener("toggle", () => {
  if (!editor.hidden) render(selected);
});
$("#add-child").onclick = () => {
  if (!applyDraft()) return;
  let newId;
  const parent = selected;
  if (
    transact(() => {
      newId = addNode(doc.tree, parent).id;
      collapsed.delete(parent);
    }, parent)
  )
    selectNode(newId);
};
$("#add-sibling").onclick = () => {
  if (!applyDraft()) return;
  const parent = flatten(doc.tree).find((n) =>
    n.children.some((c) => c.id === selected),
  );
  let newId;
  if (
    transact(() => {
      const n = addNode(doc.tree, parent.id);
      newId = n.id;
      moveNode(
        doc.tree,
        n.id,
        parent.id,
        parent.children.findIndex((c) => c.id === selected) + 1,
      );
    }, selected)
  )
    selectNode(newId);
};
$("#parent").onchange = () => {
  const parent = $("#parent").value;
  if (!applyDraft()) return;
  transact(() => {
    moveNode(doc.tree, selected, parent);
    collapsed.delete(parent);
  });
};
function reorder(delta) {
  if (!applyDraft()) return;
  const p = flatten(doc.tree).find((n) =>
    n.children.some((c) => c.id === selected),
  );
  const index = p.children.findIndex((c) => c.id === selected);
  if (index + delta < 0 || index + delta >= p.children.length) return;
  transact(() => moveNode(doc.tree, selected, p.id, index + delta));
}
$("#move-up").onclick = () => reorder(-1);
$("#move-down").onclick = () => reorder(1);
$("#delete").onclick = () => {
  if (!applyDraft()) return;
  const n = findNode(doc.tree, selected),
    count = flatten(n).length;
  if (
    count > 1 &&
    !confirm(
      `Delete this question and ${count - 1} descendants? You can undo this.`,
    )
  )
    return;
  transact(() => removeNode(doc.tree, selected), null);
};
function history(direction) {
  if (!applyDraft()) return;
  const from = direction === "undo" ? undo : redo,
    to = direction === "undo" ? redo : undo;
  if (!from.length) return;
  to.push(clone(doc.tree));
  doc.tree = from.pop();
  if (selected && !findNode(doc.tree, selected)) selected = null;
  syncPanel();
  render();
  updateStatus();
}
$("#undo").onclick = () => history("undo");
$("#redo").onclick = () => history("redo");
$("#open").onclick = openFile;
$("#save").onclick = save;
$("#download").onclick = () => {
  if (applyDraft())
    try {
      download(serializeDocument(doc));
      notice("Downloaded a copy. The original file has not been changed.");
    } catch (e) {
      notice(e.message);
    }
};
$("#paste-toggle").onclick = () => {
  $("#import").hidden = false;
  $("#markdown").focus();
};
$("#cancel-import").onclick = () => ($("#import").hidden = true);
$("#load-paste").onclick = () => {
  if (!canReplace()) return;
  try {
    load($("#markdown").value, "Untitled inquiry");
  } catch (e) {
    notice(e.message);
  }
};
$("#source-toggle").onclick = () => {
  if (!applyDraft()) return;
  try {
    $("#source").value = serializeDocument(doc);
    $("#source-panel").hidden = false;
  } catch (e) {
    notice(e.message);
  }
};
$("#close-source").onclick = () => ($("#source-panel").hidden = true);
$("#copy-source").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("#source").value);
    notice("Markdown copied.");
  } catch {
    notice("Select the Markdown text and copy it with your keyboard.");
  }
};
$("#map-view").onclick = () => setView("map");
$("#outline-view").onclick = () => setView("outline");
$("#fit").onclick = fit;
$("#overview").onclick = () => {
  if (selected) {
    finishEditing();
    if (selected) return;
  }
  resetDepth(1);
  render();
  fit();
};
$("#expand").onclick = () => {
  collapsed.clear();
  render();
  fit();
};
function zoom(
  factor,
  cx = viewport.clientWidth / 2,
  cy = viewport.clientHeight / 2,
) {
  const next = Math.min(2.5, Math.max(0.2, scale * factor));
  tx = cx - ((cx - tx) * next) / scale;
  ty = cy - ((cy - ty) * next) / scale;
  scale = next;
  transform();
}
$("#zoom-in").onclick = () => zoom(1.2);
$("#zoom-out").onclick = () => zoom(1 / 1.2);
let drag = null;
viewport.onpointerdown = (e) => {
  if (e.target.closest(".node")) return;
  if (selected) {
    finishEditing();
    if (selected) return;
  }
  drag = { x: e.clientX, y: e.clientY, tx, ty };
  viewport.setPointerCapture(e.pointerId);
};
viewport.onpointermove = (e) => {
  if (drag) {
    tx = drag.tx + e.clientX - drag.x;
    ty = drag.ty + e.clientY - drag.y;
    transform();
  }
};
viewport.onpointerup = viewport.onpointercancel = () => (drag = null);
viewport.addEventListener(
  "wheel",
  (e) => {
    if (e.target.closest(".node") && e.target.closest("textarea")) return;
    e.preventDefault();
    const r = viewport.getBoundingClientRect();
    if (e.shiftKey) {
      tx -= e.deltaX || e.deltaY;
      ty -= e.deltaX ? e.deltaY : 0;
      transform();
    } else
      zoom(Math.exp(-e.deltaY * 0.003), e.clientX - r.left, e.clientY - r.top);
  },
  { passive: false },
);
viewport.onkeydown = (e) => {
  if (e.target !== viewport) return;
  const d = {
    ArrowLeft: [40, 0],
    ArrowRight: [-40, 0],
    ArrowUp: [0, 40],
    ArrowDown: [0, -40],
  }[e.key];
  if (d) {
    e.preventDefault();
    tx += d[0];
    ty += d[1];
    transform();
  }
  if (e.key === "+") zoom(1.2);
  if (e.key === "-") zoom(1 / 1.2);
};
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    save();
  }
  if (
    (e.metaKey || e.ctrlKey) &&
    e.key.toLowerCase() === "z" &&
    !e.target.closest("textarea,input")
  ) {
    e.preventDefault();
    history(e.shiftKey ? "redo" : "undo");
  }
  if (
    (e.metaKey || e.ctrlKey) &&
    e.key === "Enter" &&
    e.target.closest("#editor")
  ) {
    e.preventDefault();
    finishEditing();
  }
});
window.addEventListener("beforeunload", (e) => {
  if (doc && (dirty() || draftDirty())) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("resize", () => {
  if (view === "map") {
    render();
    fit();
  }
});
load(sample, "Seeds of Renaissance", null, true);
const startupGeneration = generation;
fetch("/api/document")
  .then(async (r) => {
    if (!r.ok || !r.headers.get("content-type")?.includes("application/json"))
      return;
    const result = await r.json();
    if (generation === startupGeneration && !dirty() && !draftDirty())
      load(result.content, result.name, {
        kind: "server",
        version: result.version,
        token: result.token,
      });
  })
  .catch(() => {});

$("#cancel-edit").onclick = () => {
  if (saving) return;
  selected = null;
  $("#editor").hidden = true;
  render();
  updateStatus();
};

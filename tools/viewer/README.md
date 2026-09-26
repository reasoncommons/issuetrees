# Issue Tree Viewer

A local Markdown issue-tree editor with a compact, bilateral Coggle-style map. Edit questions and answers, add or move branches, then explicitly save back to Markdown. A readable outline is the default on small screens.

## Run

Requires Node 20.19+ or 22.12+ (tested on Node 25).

```sh
cd tools/viewer
npm ci
npm run build
npm start -- /absolute/path/to/project.md
```

Open http://127.0.0.1:5174. The server opens only the named file, binds to localhost, and writes only when you select Save. Use a copy to experiment. For the bundled Seeds of Renaissance example without an attached file, run `npm run dev` instead. The design moodboard is at `/design/moodboard.html`.

```sh
npm test
npm run build
npx vite preview --host 127.0.0.1
```

`dist/` is a static site containing the viewer and moodboard. Serve it over HTTP; opening the source HTML directly through `file://` is not supported. No remote service or font is required. Static mode can save directly where the browser supports file handles; other browsers use import and download. The Node server provides explicit saves independently of browser file-handle support.

## Markdown

```md
# Our inquiry

- What are we trying to achieve?
  - Who is it for? **✅ People reading project issue trees.**
  - What remains uncertain?
```

For project documents, the viewer uses the `## Issue tree` section, ending at the next heading of equal or higher level. A standalone bold paragraph before the list becomes the root question. Otherwise the first H1 supplies the title. Without an Issue tree section, top-level lists become branches. Ordered lists work too.

Only a bold span beginning with `✅` marks an answer. Questions, answers, trailing caveats, links, and nested lists are preserved. Other icons and tentative prose stay as written; the viewer does not infer that they represent decisions or priority. HTML/images are deliberately excluded from rendering. Standard inline and reference-style links are supported.

## Controls and saving

- Click a question to edit its question and answer. Apply changes to the map; Cancel discards the current draft. Save writes the document, including an applied valid draft.
- Add a child or sibling, select a different parent, reorder siblings, or delete a subtree. Undo/redo includes structural changes and remains available after saving.
- Save checks whether the file changed externally since opening or the last save. On conflict it refuses the write and retains your edits; download them or reopen the changed source. There is no live sync or file watcher.
- Scroll to zoom; Shift-scroll or drag empty space to pan. Use Fit, Collapse, Expand, and the zoom controls to navigate.
- Expand long answers separately from branches. Select Outline for linear reading.
- Keyboard: arrow keys pan the focused map; plus/minus zoom; Cmd/Ctrl-S saves; Cmd/Ctrl-Z undoes outside text fields; Cmd/Ctrl-Enter applies a draft.

## Markdown preservation

Unedited documents round-trip byte-for-byte. Edited documents preserve frontmatter and content outside the issue-tree list (except an explicitly edited root heading). Unchanged node text is reused; edited list formatting may be normalized. Standard links and reference definitions survive edits.

Editing currently requires one contiguous tree list. Documents with disjoint lists or content interleaved after child lists remain viewable but read-only. Edits that cannot round-trip as the same tree, such as an answer containing a nested Markdown list, are rejected with the draft intact. These limits avoid silently dropping content.

## Node API

```js
import { readFile } from "node:fs/promises";
import { parseTree } from "./src/parser.js";

const tree = parseTree(await readFile("project.md", "utf8"));
console.log(tree.title, tree.children);
```

The root has `id`, `title`, `definitions`, and `children`. Each child has `id`, `question`, `answer`, and `children`; text fields contain Markdown. When rendering a fragment independently, append `\n\n` plus root `definitions` to preserve reference links. IDs are deterministic within a document parse, not permanent cross-edit identifiers.

## Sample and limits

`examples/rebrand.md` is a snapshot copied on 2026-09-26 from `life-itself/planning/projects/2608-seeds-of-renaissance-rebrand.md`; its issue tree records the 2026-09-25 migration and decisions. Update the original project, not this demonstration copy. Sample relative links resolve to the planning repository on GitHub. Relative links in imported documents are retained as labelled unavailable links because the browser cannot infer the source directory.

This prototype does not watch external changes, merge conflicts, export Obsidian Canvas, infer unmarked answers, or support free placement of nodes. It caps input at 1 MB and 1,000 questions. Native browser file-picker automation remains unverified in the review environment; the Node file-save path was verified end to end with a disposable real file, including conflicts.

## Resume

Current implementation: Beads `issuetrees-yx3`; initial viewer: `issuetrees-4mv`. Design and plan: `../../docs/plans/2026-09-26-coggle-editor*.md`. Visual direction: `../../DESIGN.md` and `design/moodboard.html`.

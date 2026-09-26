# Right-flow inline editor implementation plan

**Goal:** All branches flow right; question and answer edit at their rendered location.

**Architecture:** Retain the Markdown document, history, and explicit-save modules. Mount one persistent inline editing surface into the selected map/outline node. Preserve draft DOM across layout changes; measure the edited node before laying out branches. Enter/Done commits locally, Shift-Enter inserts a newline, Escape cancels; disk changes only on Save. Branch actions are a compact disclosure at the node.

**Tech stack:** Existing vanilla JavaScript / Vite. User has explicitly requested autonomous implementation and pinned direction.

## Steps

1. Change compact-layout regression to assert every edge flows right, even with stale bilateral preferences. Run failing test, then simplify layout to right-flow only.
2. Update `src/main.js`, `index.html`, `src/style.css`: replace separate panel with inline question/answer textareas matching label typography. Preserve drafts across render, save, validation errors, and view changes. Keyboard completion/cancel, focus management, and inline branch actions.
3. Run all tests/build and browser checks on a disposable file: actual inline location, question/answer edit and save/reload, rejected draft retained, Escape, add/move/delete, outline, mobile. Critique appearance.
4. Update README/design/moodboard and changelog screenshot; commit/merge locally; update Beads.

## xyflow decision

Official repository https://github.com/xyflow/xyflow offers React Flow and Svelte Flow, MIT licensed. Custom nodes support inputs (https://reactflow.dev/learn/customization/custom-nodes). Strong candidate for pan/zoom, selection and dragging. Migrating now would replace the rendering layer and add a framework; default styling alone does not require this. Make requested interaction corrections now, then trial xyflow before bespoke drag/drop work. Keep Markdown model independent; do not serialize arbitrary positions into Markdown without a separate decision.

## Validation

20 tests pass, including right-flow-only regression with stale bilateral inputs. Production build passes. Browser verified node-local editing, explicit save/reload, rejected draft preservation, Escape, Shift-Enter, add-child, folding with a draft, mobile 390px without overflow, and view switching from hidden descendants. Independent review caught detached textarea sizing and stranded editor on view switch; fixes were confirmed in browser (textarea clientHeight equals scrollHeight; no visible editor outside nodes). Earlier changelog images remain unchanged.

Final independent re-review confirmed both fixes and found no remaining blockers. xyflow trial tracked as `issuetrees-803`.

# Design system: Issue trees

## Visual authority

The user explicitly rejected the thin Coggle-style labels and asked for the more substantial, elegant xyflow default look. The reference is the [React Flow feature overview](https://reactflow.dev/examples/overview). The application now uses actual React Flow and its default stylesheet with custom issue nodes. The earlier Coggle and inline-edit screenshots remain in the changelog.

## Composition and nodes

All branches flow right from the root. The initial view shows first-level branches so text stays readable; deeper questions expand on demand. White 280px nodes have 20px vertical and 22px horizontal padding, 12px corners, a pale #dedfe6 border and a restrained downward shadow. The root is 300px with 24px padding. Horizontal gaps are 100px and vertical gaps 24px. Neutral 2px curved connections use native React Flow handles. This is a styled application of the library, not a claim of pixel-identical untouched defaults.

## Typography and colour

System sans. Questions use 15px/1.5 at weight 550; root 18px/1.45 at 600. Answers use 13px/1.55 regular grey, beneath the question with 12px separation. Canvas #f8f9fb with sparse #d8dbe2 dots. Text #30323d, secondary #656a78. Selection/focus uses restrained violet #8176ba. Save is dark neutral. No coloured branch baselines or coloured question text remain in the map.

## Interaction

React Flow owns pan/zoom, connections, handles and controls. Node text enters an autosizing in-place editor. Enter/Done finishes, Shift-Enter adds a line, Escape cancels. Node-local Branch actions expose structural edits. Explicit Save retains the original conflict checks. Node placement remains automatic; free dragging and drag-to-reparent semantics are a future decision. Native canvas attribution remains visible.

Keyboard focus returns to the editable article after finishing. Canvas wrappers and edges do not introduce dead-end tab stops; focus rings are visible. Scrolling inside the editor does not zoom the canvas. Text inputs and sanitized rich Markdown stay owned by the existing document controller and are mounted into custom React Flow node components.

## Responsive behaviour and review

A 72px desktop header carries document controls; mobile wraps at 760px. Below 650px the outline opens initially. At 390px the inline editor fits within the document without horizontal overflow.

Independent review confirmed the substantial visual direction and checked interaction integration. Focus-return and textarea-wheel regressions were fixed; save/reopen, rejected drafts, multiline sizing, keyboard re-entry and mobile were browser-verified. Remaining limitation: large expanded trees need pan/zoom or outline; initial overview deliberately folds descendants.

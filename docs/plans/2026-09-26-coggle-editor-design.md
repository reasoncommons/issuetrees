# Compact Coggle-style Markdown editor

User approved compact Coggle styling, edit questions/answers, add/delete/move subtrees, and explicit Save back to the opened Markdown. No live sync or watcher. This supersedes the read-only direction.

## Visual design

Use the actual Coggle reference inspected in Chrome: white canvas, compact sans-serif labels, substantial pastel curves which flow into the text baseline, modest root treatment and minimal floating chrome. Size labels to content (cap long questions), compress vertical gaps, and distribute root branches on both sides so more inquiry is visible at readable zoom. Show short answers in bold beneath questions, no answer cards. Long answers use a compact preview with expansion. Open the first two levels by default; deeper branches are collapsible. Select a node to edit in a small floating panel; controls for adding/moving/deleting appear only with selection. Use a parent selector and ordering controls for unambiguous reparenting, rather than conflating free positioning with structure.

## Data and saving

Read the document once into an editable model retaining original Markdown and AST source boundaries. Save reconstructs the issue-tree list and root title only. Preserve frontmatter, introductory prose, source references and all other sections exactly. Preserve unchanged node content verbatim where possible; edited nodes use the existing bold checkmark answer convention. Keep references and node hierarchy through serialization; reparse before write and reject unrepresentable content instead of silently losing structure. Reject ambiguous disjoint lists or unsupported interleaving for write-back with a clear explanation; viewing remains available.

Browser File System Access gives explicit open/save in supporting browsers. Otherwise import/download is labelled honestly. A small loopback-only Node server can be launched with one explicit Markdown path and exposes only that document, not arbitrary filesystem paths. Read/check original content on Save; refuse overwriting a changed file. Node writes use a temporary sibling and rename. No polling, automatic writes or silent overwrite. Undo/redo, dirty state and unsaved-change protection support mistakes. Sample edits never overwrite the planning source.

## Verification

Test no-op round trips byte-for-byte, edited answers, multiline Markdown, reparent/add/delete, duplicate IDs/cycle rejection, unchanged project sections, reference links, stale-save rejection and actual temporary-file writes. Test variable-width bidirectional layout for overlap. Browser-test edit → save → reopen and conflict on a disposable sample copy. Capture Coggle reference and new desktop/mobile renders; independent critique checks compactness and data preservation. Log progress in Beads and commit with a changelog screenshot.

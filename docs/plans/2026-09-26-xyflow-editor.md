# React Flow visual replacement

User rejected the thin label/baseline aesthetic and explicitly wants the substantial, elegant xyflow look. Preserve previous changelog screenshots. Use actual React Flow and its default stylesheet, with padded white rounded nodes, clear 15px text, neutral connectors/handles and a dotted working canvas. Rightward layout and direct text editing remain invariant; keep explicit Markdown saves.

Implementation: React owns the canvas, custom-node wrappers, handles, selection, pan/zoom and controls. A small adapter mounts the existing sanitized DOM node/editor content into custom nodes; the tested Markdown controller stays independent. Use the existing measured right-flow layout with larger gaps. Keep nodes fixed for this release to avoid introducing unagreed drag/reparent semantics; React Flow now provides the foundation for that work. Opening overview shows root + first-level questions at readable scale, expand branches on demand.

Checks: all model/save tests, build; browser render reference comparison, inline question/answer edit, Enter/Escape, save/reload, collapse, zoom, outline/mobile. Independent critique before commit. New changelog screenshot, Beads sync, local merge.

## Validation

20 tests pass and production build passes. Browser: actual disk save/reload of multiline question/answer edits; invalid draft preserved; Enter finish and Enter reopen with article focus; node expansion and fit; mobile 390px no horizontal overflow. Review found wrapper focus and textarea wheel integration issues, now fixed. Independent final visual review: no blockers, direction matches substantial default-style xyflow. New desktop and in-place editing screenshots committed; previous images unchanged.

The library increases JavaScript from ~52 KB to ~180 KB gzip. Vite reports a nonblocking large-bundle warning; the imported client directive is ignored in this client-only build. No public deployment claimed.

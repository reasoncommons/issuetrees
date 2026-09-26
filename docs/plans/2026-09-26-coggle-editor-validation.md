# Coggle editor validation

- Automated: 19 tests pass, production Vite build succeeds. Covers parsing, compact geometry, stable sides, lossless no-op, bounded edits, rejected structures, CRLF/reference links, save rebasing, stale writes, authentication/origin checks, and concurrent saves.
- Browser desktop: edit question/answer → Save → reload and inspect actual disposable file. Frontmatter and project content outside the issue tree preserved. External modification produces conflict without overwriting either disk or viewer draft.
- Browser editing: add, reparent, delete, undo/redo; rejected Markdown keeps fields intact; Cancel discards draft. Pausing the local server during Save verifies mutations remain disabled, then resume completes save; Undo remains functional afterwards.
- Browser accessibility/layout: outline root responds to Enter; selected map label remains outside floating editor; mobile 390×844 has no body overflow and usable editor. Temporary viewport reset after review.
- Independent code/visual review: initial draft-loss and asynchronous-save blockers fixed; final verdict “Ship: no remaining blockers found.” Reviewer independently ran all 19 tests.
- Screenshots: desktop in changelog and moodboard; local review captures in ignored `.impeccable/review/`.
- Limitation: native browser picker automation blocked by the review environment. Browser adapter has unit coverage; Node-backed file workflow is browser-verified. No public deployment claimed.

# Coggle-style editor implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the map compact and Coggle-like, and support explicit editing/saving to Markdown.

**Architecture:** Preserve a source document alongside a tree model. Pure model operations and checked serialization feed browser file handles or a loopback Node single-file server. DOM labels and SVG curves use measured variable widths and a two-sided tree layout.

**Tech Stack:** Existing JavaScript/Vite/Markdown AST stack; Node fs/http; File System Access where available.

### 1. Round-trip document and edit model
Create src/document.js and test/document.test.js. Write tests for exact no-op, root/answer edits, preserving surrounding text, nested moves/add/delete, invalid structures, multiline content and reference links. Observe failure, implement minimal source-preserving serializer and model operations, reparse output and compare editable semantics before returning. Run npm test.

### 2. Explicit file persistence
Create server.js, src/persistence.js and test/persistence.test.js. Test save to a temporary file and conflict rejection without changing it. Implement one-path-only loopback server, origin/host checks and serialized writes; optional browser file handle support. The server serves dist and opens the selected file via /api/document. No arbitrary path API. Run tests.

### 3. Compact map and editing UI
Replace src/layout.js with measured-width bilateral layout and update its tests. Replace index.html/style.css/main.js around compact Coggle visual system, use quiet controls, inline answer text and contextual edit panel. Add root/text edits, child/sibling, subtree deletion with undo, parent selection/reordering, undo/redo, preview Markdown, Save/download and dirty guards. Keep outline and safe rendering. Build.

### 4. Verification and delivery
Run full suite and build. Serve a disposable rebrand copy through Node, edit/save/reopen in browser, independently modify disk and verify conflict. Inspect desktop/mobile and Coggle comparison. Fresh critic reviews screenshots and preservation logic; fix material issues. Update README, PRODUCT.md, DESIGN.md/moodboard, changelog and Beads. Commit and merge locally preserving user changes; sync tracker.

# Rendering trees beautifully — SCQ

Moved 2026-11-07: this work now lives in [reasoncommons/tree-render](https://github.com/reasoncommons/tree-render) (SCQ, LTP draft, tree-mindmap skill). This copy is kept for history.

Status: signed off 2026-10-19 by Rufus ("question is good… go to the LTP directly rather than build out the issue tree more")
Source: conversation in Rufus's planning repo, building on `~/src/rufuspollock/planning/projects/2026-shareable-tree-visuals/` (problem definition, research, critiques and trials, 2026-10-17 to 19) and the draft `tree-mindmap` skill (`~/src/life-itself/skills/skills/tree-mindmap/`)

This is separate from the issuetrees viewer/editor in `tools/viewer`. It does not build on that work; the method docs in this repo (`Trees.md`, `Pyramid.md`, `SCQA.md`) are reference only.

## SCQ

### Situation
- We generate question (issue) trees, and hypothesis trees that mirror them (one assertion per node).
- The source format doesn't matter (Markdown, YAML, JSON). For human reading, the default is nested bullets in Markdown or a Google Doc, because that is the most editable structure.
- Editors can fold lists, but most people don't use it.
- Trials so far (2026-10-17 to 19): block/poster layouts were rejected; static left-to-right mindmaps in the Seeds of Renaissance diagram style, rendered by an AI skill from a small JSON file, are "okay, not yet good".
  - Visuals: `~/src/rufuspollock/planning/projects/2026-shareable-tree-visuals/trials/mindmap/` (Wise AI Q2 and overview).
- Editing trees is a separate problem and out of scope here.

### Complication
1. Core problem: bullet trees are poor information design, and they are neither visually nor socially compelling. This holds for the default form generally (bullets in a doc, lines in a JSON file) and for everyone, not only visually minded people.
   - They hide the structure: the first branch's sub-branches push the second branch out of view, so even an attentive reader misses the top-level shape and the obvious main points.
   - They overwhelm: everything shows at once, and folding goes unused.
   - They don't travel: nobody shares a screenshot of bullet points, while a beautiful mindmap of a thesis gets shared (Instagram, X, …).
2. There is no reliable, quick way to make the better form. Each visual takes hand judgment, and results so far are only okay. Two things drive this:
   - Two uses pull apart: sharing (a compelling image) and thinking together (a usable view on the web or a phone) need different density and interactivity.
   - The design choices are unresolved and get made by hand each time:
     - what depth to show
     - expand and collapse, or not
     - whether and how to show answers
     - switching between question and hypothesis views
     - theme (Coggle-style is lovely but can be garish; audiences differ: calm/editorial, engineering, fun and funky)

### Question
How can we reliably and quickly turn any question or hypothesis tree into a visual that is good information design, and compelling enough to share, for both thinking together and sharing publicly?

Criteria:
- For: Rufus and the Life Itself team first, and the people they share with (social media, collaborators, readers).
- Quality: good enough to post or put in front of the team as it is; better than "okay".
- Effort: a new visual takes about 15 minutes of AI work and 5 minutes or less of human input, and regenerates quickly when the tree changes. (guess)
- Form: patterns, principles and a skill first; a pure automatic tool only if it falls out naturally.
- By when: a first good set (2–3 formats, 2 themes) within about two weeks, i.e. by 2026-11-02. (guess)
- Off the table: editing trees; building on the existing issuetrees viewer; a hosted app; publishing/sharing trees on issuetrees.com (a good later step — see Next).

Issue tree (first pass; deliberately not built out further — feed into LTP):
- What should a visual show? — open
  - Which views: question tree, hypothesis tree, or questions and answers together? — open
  - How much depth and density for each use? — open
  - How do we show answers (inline, grey beneath, on demand)? — open
  - How do we shorten node text faithfully, and should trees carry short labels at the source? — open
- Which formats serve which uses? — open
  - What are the uses, ranked (social post, slide, team thinking on the web or a phone)? — open
  - When is interactivity worth it (expand and collapse, question/hypothesis switch)? — open
  - What sizes and aspect ratios (phone, social, slide, page)? — open
- What should it look like?
  - Layout — decided for now: left-to-right mindmap (Rufus, 2026-10-17); do others (radial, …) earn a place? — open
  - Which 2–3 themes for which audiences? — open
  - What typography, line weight and colour rules per theme? — open
- How do we make them reliably and quickly? — open
  - Where is the line between skill/principles and a pure tool? — open
  - What pipeline: source tree → JSON → SVG / PNG / interactive HTML? — open
  - How does it check its own output (cold-reader test, overflow checks)? — open
- How do we know it's good? — open
  - Which tests: 10-second cold read, "shared as it is", team use? — open
  - Which real trees make up the test set (Wise AI, the Seeds of Renaissance rebrand tree, …)? — open
- Where does it live? — proposed: its own `render/` folder in this repo, separate from the viewer; the `tree-mindmap` skill moves here from `life-itself/skills` and graduates later.

## Ideas offered (parked)
- Two or three themes for different audiences (calm/editorial after the Seeds of Renaissance diagram style; Coggle-like colour; engineering).
- Publish shareable trees on issuetrees.com, as publicity for the method.
- A pure tool that generates visuals automatically, if the skill shows the judgment calls can be encoded.

## Prior work
- Problem definition, research (prior art, rendering options), critiques: `~/src/rufuspollock/planning/projects/2026-shareable-tree-visuals/`.
- Draft skill and renderer (HTML → headless Chrome → SVG with embedded Apfel + PNG): `~/src/life-itself/skills/skills/tree-mindmap/`.

## Next
LTP not yet run. Run `ltp-project` (`~/src/life-itself/reasoncommons/skills/ltp-project/`) on this file in a new session in this repo. When done, return to turn the result into beads and an implementation plan. After that: publishing trees on issuetrees.com.

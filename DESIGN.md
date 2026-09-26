# Design system: Issue trees

The user-pinned reference is [Coggle](https://coggle.it/diagram/ap6V0aBnV6ueHVma/t/how-do-we-rebrand-seeds-of-renaissance). The updated [moodboard](tools/viewer/design/moodboard.html) replaces the earlier spacious, warm-paper direction following user feedback.

## Composition

A bilateral map grows from a small grey root. Labels use their measured content width, up to 240px. Horizontal gaps are 42px; vertical gaps are 14px. Pastel curves join directly to label baselines, with strokes tapering from 5px to 3.5px to 2.5px. Branch sides remain stable as content expands or is edited. Colour identifies families, not completion status.

## Typography and palette

Helvetica Neue / Arial; 13px questions, 12px bold answers, 14px root. Answers are inline beneath their questions with a two-line preview and a separate expansion control. Canvas #fafafa; text #42464a; root #e2e4e4. Branches: mint #80cdb9, lilac #bd99d5, apricot #e6ae79, blue #7db4d2, rose #d79291, olive #b9c977. Darker corresponding text colours preserve readability. No remote fonts.

## Controls and editing

A 58px header holds document status, undo/redo, input, Markdown preview, download, and Save. Navigation sits quietly at the bottom. A 300px floating editor appears on selection; the selected node pans clear of it. Changes remain in memory until explicit Save. Invalid edits retain the draft; Cancel discards it. While saving, mutations are locked. Keyboard focus is visible; the outline root is a real button.

## Responsive behaviour

The toolbar wraps below 760px. Below 650px the document initially opens as an outline, and the editor fits within the viewport. The map remains available. Long trees require zoom, folding, or outline reading rather than tiny fit-to-screen text.

## Critique and verification

The original prototype used too much space and looked insufficiently like Coggle. This direction removes answer cards, the serif root, dotted paper, fixed node widths, and large column gaps. Independent review accepted the visual direction and identified two editing risks: losing rejected drafts and edits during asynchronous saves. Both were fixed and browser-verified before shipping. Remaining deliberate limits: structural moves use a parent selector; nodes cannot be freely positioned.

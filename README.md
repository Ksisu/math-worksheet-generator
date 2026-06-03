# Math worksheet generator

A single, self-contained HTML file that generates printable **A4/A5 math-practice worksheets**
for young schoolchildren — multiplication, division, addition, and subtraction — drawn on a
squared-notebook grid. Open it in a browser, set the parameters, and download a real vector
PDF. The interface is available in **Hungarian (default) and English**, and it works fully
**offline**: the one dependency (jsPDF) is inlined into the HTML at build time.

## A note on how this was made

This project is **fully AI-generated** — the application code, this README, the spec, and all
of the in-app texts and Hungarian/English translations were written by an AI coding assistant.
Use it as such.

## Quick start

Just open `index.html` in any modern browser — no server, no install. It's also published at
**https://ksisu.github.io/math-worksheet-generator/**.

The control panel is on the left, the live page preview on the right:

- **Generate** — build fresh random problems and preview them.
- **Download PDF** — save exactly what's on screen as a vector PDF, A4 or A5 (great for printing).

## Features

- **Four operations, two variants each:**
  - Multiplication `7 · 8 = ☐`, division `56 : 8 = ☐`, addition `7 + 8 = ☐`, subtraction `15 − 8 = ☐`
  - *Fill in the result* (the answer slot is blank) or *Missing operand* (`☐ · 8 = 56`)
  - Each enabled task type is mixed together on the sheet.
- **Operand selection per type:**
  - **× / ÷** — pick which times tables (1–10) to practise; division stays whole-number.
  - **+** — number range `0–10`, `0–20`, or `0–100` (the *answer* stays in range).
  - **−** — the same ranges plus `±10` / `±20` / `±100` (allows negative answers).
- **Page size** — A4 (default) or A5, selectable in the Layout section.
- **Languages** — Hungarian (default) or English; the choice is remembered between visits.
- **Geometry-driven layout** — fixed 5 mm cells; columns and pagination are computed from the
  chosen page size and distributed evenly across the centered grid (190 mm on A4, 125 mm on A5).
- **Amount selector** — by number of problems (fills as many pages as needed) or by number of
  full sheets.
- **Display options:**
  - Box around the answer place (on) / box around the result place (off)
  - Show / hide the squared grid
  - Multiplication symbol `· × *` and division symbol `: ÷ /`
  - Align operators and/or `=` into columns (`=` aligned by default)
  - Footer with the site link and a QR code (on)

The squared grid, per-cell digit placement, and operator rendering were tuned over many print
iterations — the printed output is physically accurate (a cell really is 5 mm on paper).

## Building

You only need to build if you bump jsPDF; editing the app's own JS in the HTML needs no rebuild.

```bash
npm install
npm run build
```

`build.js` inlines `node_modules/jspdf/dist/jspdf.umd.min.js` into the HTML between the
`<!-- jspdf:start -->` / `<!-- jspdf:end -->` markers (idempotent). The inlined blob is
committed so the file stays offline-standalone; `node_modules/` is gitignored.

## Project layout

| File | Purpose |
|------|---------|
| `index.html` | The whole app — HTML, CSS, JS, and inlined jsPDF (also the GitHub Pages entry point). |
| `build.js` | Inlines jsPDF into the HTML for offline use. |
| `SPEC_math_worksheet_generator.md` | Authoritative spec — especially the exact visual output. |
| `CLAUDE.md` | Architecture notes and gotchas for working on the code. |

## License

ISC

# Math worksheet generator — specification

This document describes the structure of a web-based math worksheet generator (multiplication,
division, addition, and subtraction). Hand it to Claude Code as a starting point. The **most important
thing is the exact look of the printed output** (size/color of the squared grid, placement of
the digits and operator signs), because we tuned that over many iterations. The functional
parts can be reshaped freely relative to that.

---

## 1. What the tool does

A single, self-contained HTML file (no build, no server). The user sets the parameters in a
control panel on the left, presses the **Generate** button, and one or more "sheet"
previews appear on the right. The **Download PDF** button saves a real vector PDF.

Goal: math-practice sheets (×, ÷, +, −) for young schoolchildren, on a squared-notebook pattern.

---

## 2. THE VISUAL PARAMETERS OF THE OUTPUT  ← this is the critical part

These are the finalized values. Keep them as the defaults.

### Sheet
- Page size: selectable in the **Layout** section — **A4 portrait** (210 × 297 mm, the default)
  or **A5 portrait** (148 × 210 mm). The choice (`PAGE_SIZES` table, keyed `a4`/`a5`) drives the
  jsPDF `format`, the DOM `.sheet` size, and the print `@page` rule (`<style id="pageRule">`,
  updated in `generate()`).
- Top/bottom margin: **14 mm** (`MARGIN_V_MM`).
- Horizontal: the grid is **centered** on the page. Columns and rows-per-page are **derived from
  the chosen page dimensions**, not hardcoded:
  - `usableCols = floor((pageW − 2·10) / 5)` → A4 **38** cells (190 mm), A5 **25** cells (125 mm).
  - `rowsPerPage = floor((floor((pageH − 2·14) / 5) + 1) / 2)` → A4 **27**, A5 **18**.
  - `marginLeft = (pageW − usableCols·5) / 2` → A4 **10 mm**, A5 **11.5 mm** symmetric side margins,
    computed in `readConfig`. The grid always fits well within the page width.
  (Earlier versions left-aligned at an 8 mm margin to keep the right edge from running off; no
  longer needed now that the grid is centered and always narrower than the page.)

### Squared grid
- One cell: **5 × 5 mm** (fixed — the layout is computed from this and the page size).
- Grid line color: **pale blue**, `#b8cceb` (similar to the squared pattern of a traditional
  notebook). Line thickness: ~**0.25 mm**.
- The grid is most reliably produced by two `repeating-linear-gradient`s (horizontal +
  vertical lines), NOT separate DOM cells — this is deterministic when printing. Give the grid
  container an explicit `width`/`height` in mm, and add the right/bottom closing lines with
  `border-right`/`border-bottom`.

### Digits and operator signs — per-cell placement
- **Every character goes in its own cell**, centered: every digit of the factors (so "10"
  takes two cells: `1` and `0`), the multiplication sign, the equals sign, and in the answer
  key every digit of the result too.
- Multiplication sign: **a dot (·)** by default (NOT `x`). The dot should be a bit larger and
  bold, and lifted to the midline of the digits (about `translateY(-0.10em)`), because by
  default it sits at the bottom of the cell. The symbol is selectable in Display options —
  **·, ×, or \*** for multiplication and **:, ÷, or /** for division (see §3). When the
  asterisk `*` is chosen it gets special vertical centering, since the glyph sits high in the
  em box.
- Digit color: **black** (`#111`). Font size ≈ cell size × 0.72; the dot ≈ × 0.95.
- Font: a simple sans-serif (Arial / DejaVu Sans / Liberation Sans).

### Structure of a single problem (in cells, left to right)
Example: `7 · 8 =` with an empty space for the answer. The same shape holds for addition
(`7 + 8 =`) and subtraction (`15 − 8 =`).
- The problems are arranged in **blocks**, each `BLOCK = content + GAP` cells wide, where
  `GAP = 1` empty column separates blocks and `content` is the **widest possible problem
  across all enabled task types**: `2·opW + 2 + resW`, with
  - `opW` = max digits of an operand (also the width of a missing-operand box),
  - one cell each for the operator and the `=`,
  - `resW` = width of the result field.
- Widths per operation: **×** keeps the tuned `opW=2, resW=3` (worst case `1 0 · 1 0 = 1 0 0`,
  so `content=9`, `BLOCK=10` — unchanged). **÷** uses `opW=3, resW=2` (worst case
  `1 0 0 : 1 0 = 1 0`, so `content=10`, `BLOCK=11`). **+ / −** follow the chosen range's max
  value `N`: `opW = digits(N)`, `resW = digits(N)` plus **one extra cell for a leading `−`**
  when the range allows negative answers (the `±N` subtraction ranges). E.g. addition/subtraction
  up to 100 → `BLOCK=12`; subtraction `±100` → `BLOCK=13`.
- The operator cell: **`·` is drawn as a dot** (× only); **`:` is drawn as two stacked dots**
  (÷ only, each a filled circle like the `·` dot, offset ~0.18·cell above/below the midline);
  **`+`** and **`−`** are drawn as **bars** (thin vector strokes ~0.07·cell, not bold, ~80% of
  the cell so they almost touch the cell lines) — all sized identically in the preview and the
  PDF. Note a `−` that is the **negative sign of a result** is *not* an operator: it stays an
  ordinary digit-sized character.
- Per row, as many blocks as fit the page-width budget — the **column count is computed**, not
  chosen (`floor((usableCols + GAP) / BLOCK)`; see Layout below). The columns are **distributed across
  the full grid width like CSS `justify-content: space-between`** — first flush-left, last
  flush-right, the leftover columns spread as near-equal **whole-cell** gaps between them (so
  digits stay centered in the squares).
- Vertically: each problem is **1 cell-row tall**, with **1 empty cell-row** below it
  (`rowPitch = 2`). There is no extra empty row after the last row.

### The answer-space "box" (border) — two independent toggles, apply to all task types
- The fill-in field carries a `kind` (`'operand'` or `'result'`), and **two separate Display-
  option checkboxes** decide whether each kind gets a box:
  - **"Draw a box around the answer place"** (`cfg.showOperandBox`) — boxes the **missing-
    operand** field. **On by default.**
  - **"Draw a box around the result place"** (`cfg.showResultBox`) — boxes the empty **result**
    field (only meaningful on "fill in the result" problems). **Off by default.**
- When a kind's toggle is off, no box is drawn for it (the fill-in area is just blank space).
  When on, a framed rectangle is drawn around that problem's **fill-in field** — the place the
  child writes — independent of the task type:
  - **Missing operand** (factor / addend / subtrahend): an **`opW`-cell-wide** box where the
    missing number goes — a fixed width (`opW`) regardless of how many digits the real answer
    has, so it doesn't give away the digit count. The result is still written out.
  - **Fill in the result:** a **`resW`-cell-wide** box around the empty result area after `=`.
  - `opW` / `resW` are the per-type field widths from the block geometry above (× → 2 / 3;
    + / − → digits of the range max, with one extra result cell when negative answers occur).
- IMPORTANT: draw each box as a **single** rectangle (one element spanning its cells), NOT as
  separate cell frames, otherwise a double/thicker line appears in the middle.
- The box border: **pale gray** (`#8c8c8c`), medium thickness (~0.5 mm), with square corners
  (no rounding). Its edges sit on the grid cell-boundary lines. Note: the grid lines are
  one-sided gradients drawn *inward* from each boundary, so the box must extend ~0.25 mm (one
  grid-line) past its **right and bottom** cell boundaries; otherwise those two lines poke out
  just outside the border while top/left look clean. With that compensation all four borders
  align identically.
- Whether or not the box is drawn, the fill-in field always **reserves the same cells**, so the
  layout/alignment is identical with the toggle on or off.

### Column alignment — two independent display-option toggles
When fully unaligned the cells of each problem are placed flush left-to-right, so the operator
and `=` shift horizontally with the operands' digit counts (a 1-digit and a 2-digit first
operand don't line up). Two checkboxes pin them to fixed columns within each problem block by
**right-aligning** each operand into a fixed-width slot (blank cells go *before* short numbers):
- **"Align the operators (+ − · :) in a column"** (`cfg.alignOps`, **off by default**): operand
  `a` is right-aligned into an `OPW`-wide slot, so the operator lands at `baseCol + OPW`.
- **"Align the = signs in a column"** (`cfg.alignEq`, **on by default** — so the default output
  already has `=` columns aligned): `=` lands at `baseCol + 2·OPW + 1`.
  - With `alignOps` also on, operand `b` is right-aligned into its own `OPW` slot.
  - With `alignOps` **off**, the whole `a op b` group is right-aligned as a unit (the pad goes
    before `a`; `a`/operator/`b` stay packed and flush against the aligned `=`).

`OPW` / `RESW` are the **sheet-wide** maxima of the per-type `opW` / `resW`, so columns line up
even across mixed task types. When either toggle is on, the block widens if needed to
`2·OPW + 2 + RESW + GAP` (a no-op for a single type, where it already equals the block); this can
reduce problems-per-row in mixed sheets. The padding is emitted as `{t:'gap',w}` tokens in
`tokensFor`, advancing the layout cursor without drawing — so missing-operand boxes get the same
right-alignment, and both renderers stay in sync via `layoutSheet`.

### Not on the sheet
Title, name, date, numbering — **no header at all**. Just the problems. No page-number caption
either, even across multiple sheets.

### Optional footer (the one exception)
The single allowed off-grid decoration: an **optional footer** carrying the site link and a QR
code to it — a Display option (`showFooter`, **on by default**; see §3). It is rendered in the
**bottom page margin, below the grid** (not on the squared area), centered, in both the preview
and the PDF. The link is `SITE_URL`; the QR is a precomputed 33 × 33 module matrix (`QR_MATRIX`,
generated dev-side from `SITE_URL`, error-correction level M) drawn as a small (~10–11 mm) square
with a light quiet-zone margin — a canvas in the DOM preview, one filled rect per dark module in
the PDF. When the toggle is off, nothing is drawn there.

---

## 3. SETTINGS (control panel)

### Language
A selector at the top of the panel switches the whole UI — **and the worksheet labels** —
between **Magyar (Hungarian, the default)** and **English**. Strings live in an `I18N` table
keyed by language and resolved through a `tr(key)` lookup (English fallback). The choice persists
in `localStorage` (`mwg-lang`); changing it re-renders all labels live and regenerates the
preview. (The printed problems themselves are language-neutral digits and symbols.)

### Task types (one row per operation × variant)
Four operations — **multiplication (×)**, **division (÷, drawn `:`)**, **addition (+)**,
**subtraction (−)** — each with two variants:
1. **Fill in the result** — e.g. `7 · 8 = __` / `56 : 8 = __` / `7 + 8 = __` / `15 − 8 = __`.
   The result slot is empty.
2. **Missing operand** — e.g. `__ · 8 = 56` / `__ : 8 = 7` / `7 + __ = 15` / `15 − __ = 7`.
   Either operand is missing at random; the result is given.

Each row is on iff it has an operand selection. Click a row to open its picker. The worksheet
**mixes** all enabled rows (so "mixed" is just enabling more than one). Default: only
addition / fill-in-result, range 0–20.

### Operand selection (the picker, per task type)
- **Multiplication:** a multi-select of which **times tables** (1–10) to practise; the other
  factor is always 1–10. (Select-all / clear-all shortcut.)
- **Division:** the same times-tables multi-select as multiplication (integer-only, same
  range): the dividend is a product `table · (1–10)`, divided by either factor so the quotient
  is always whole. (Off by default, like multiplication.)
- **Addition:** a **single-select** number range — `0–10`, `0–20`, `0–100`.
- **Subtraction:** a single-select range — `0–10`, `0–20`, `0–100`, `−10…10`, `−20…20`,
  `−100…100` (shown as `±10` etc.), plus an **off** option.
- **The range bounds the answer** ("számkör"): addition picks `a,b ≥ 0` with `a+b ≤ N`;
  subtraction `0–N` keeps `a ≥ b` (non-negative answer in `0–N`); subtraction `±N` allows a
  negative answer (operands stay `0–N`, no ordering).

### Layout (geometry-driven — no manual columns/cell size)
- **Cell size is fixed at 5 mm.** Not user-adjustable.
- **Page size is selectable** (A4 default / A5) — see *Sheet* above. The column and row counts
  below are derived from the chosen page; values shown are A4, with A5 in parentheses.
- **Columns are computed**, not chosen: a row fits `usableCols` squares across — **38** (A5: 25),
  centered on the page. `cols = floor((usableCols + GAP) / BLOCK)`, ≥ 1. So multiplication
  (`BLOCK=10`) → **3 columns** on A4; smaller blocks/pages pack differently.
- **Rows per page = 27 (A5: 18)**, from the page height: `floor((pageH − 14 top − 14 bottom) / 5)`
  cell-rows, and `totalRows = 2·rows − 1 ≤ that ⟹ rows`. So **problems-per-page = cols × rows**
  (e.g. 3 × 27 = 81 for A4 multiplication).
- **Amount selector — a toggle with two modes:**
  - **Number of problems** (default, e.g. 100): the app emits `ceil(total / perPage)` pages;
    the last page is partially filled.
  - **Number of sheets** (e.g. 2): each page is filled to capacity, `total = pages × perPage`.
- Output **paginates** across as many pages as needed; each page prints on its own sheet
  (`page-break-after: always`).
- **The grid always fills the full working area** (A4: 38 × 53 squares = 190 × 265 mm; A5:
  25 × 35 = 125 × 175 mm) on every page, regardless of how many problems land on it — a partial
  last page still looks like a complete sheet of squared paper, with the problems in the top-left
  and empty squares below.

### Display options (a popup)
A **Display options** popup collects the rendering toggles (all live-applied to the existing
problems, no regeneration):
- **Draw a box around the answer place** (`showOperandBox`, **on**) and **Draw a box around the
  result place** (`showResultBox`, **off**) — the two independent box toggles (see "The
  answer-space box" above).
- **Show grid** (`showGrid`, **on**) — when off, the squared grid is hidden entirely in both the
  preview and the PDF (just the problems on blank paper).
- **Multiplication symbol** — `·` (default), `×`, or `*`. **Division symbol** — `:` (default),
  `÷`, or `/`. The picked symbols are also echoed in the task-row label/hint texts.
- **Align the operators (+ − · :) in a column** (`alignOps`, **off**) and **Align the = signs in
  a column** (`alignEq`, **on**) — the column-alignment toggles (see "Column alignment" above).
- **Show a footer with the site link and a QR code** (`showFooter`, **on**) — draws the optional
  footer in the bottom page margin below the grid (see "Optional footer" in §2).

---

## 4. GENERATION LOGIC (sketch)

```
makeProblem(cfg):
    e = pick one enabled task type (operation + variant + operand selection)
    mul: a = random table; b = 1..10; swap 50%;            res = a*b
    div: t = random table; f = 1..10; a = t*f; b/res = {t,f} (swap 50%)  res = a/b (whole)
    add: N = range.max; a = 0..N; b = 0..(N-a);            res = a+b   (sum ≤ N)
    sub: a = 0..max; b = (range allows neg ? 0..max : 0..a); res = a-b
    if e.variant==missing: missing = 50% 'a' / 50% 'b'
    return {a, b, op:e.op, type:e.variant, missing, res, fw:opW, rw:resW}

tokensFor(problem, cfg) -> list of cells:
    // a 'miss' token marks a fill-in field: it always reserves `w` cells and carries a
    // `kind` ('operand' | 'result'); at layout time showOperandBox / showResultBox decide
    // whether a box is drawn around it (per kind). The operator glyph comes from cfg
    // (cfg.mulSymbol for ×, cfg.divSymbol for ÷).
    - operand 'a': if (missing=='a') -> {type:'miss', w:fw, kind:'operand'}
                   else each digit of 'a' as a separate cell
    - operator: mulSymbol (·/×/* for ×) | divSymbol (:/÷// for ÷) | '+' | '-'
    - operand 'b': same as the missing=='b' branch
    - '='
    - result:
        - 'result' type: {type:'miss', w:rw, kind:'result'}  (the child fills it in)
        - 'missing' type: always written out (String(res) carries a leading '-' if negative)
```

Page geometry (computed once, for the chosen page size): `BLOCK = max over enabled types of
(2*opW + 2 + resW) + GAP`; `cols = floor((usableCols + GAP) / BLOCK)`; `perPage = cols *
rowsPerPage`, where `usableCols`/`rowsPerPage` derive from the page (A4: 38/27, A5: 25/18).
The amount selector then fixes the
page count (problems-mode: `ceil(total/perPage)`; sheets-mode: the given count), and `generate`
emits that many pages, slicing the problems across them.

To draw one page: from each problem's index, compute the block column (`idx % cols`) and block
row (`floor(idx / cols)`), and from those the starting cell column (`block * BLOCK`) and cell
row (`row * 2`). Place the cells with absolute positioning inside the grid (`left = col*cellmm`,
`top = row*cellmm`, in mm) — this is more reliable when printing than CSS grid.

---

## 5. TECHNICAL NOTES / PITFALLS

- **Units in mm.** The cells, margins, and lines are all in mm — so the printed size is
  physically accurate (a cell really is 5 mm on paper). The on-screen preview shows the same,
  because the browser converts mm to ~3.78 px.
- **Absolute positioning.** The grid container is `position: relative`, the character and box
  elements are `position: absolute`. We earlier tried CSS grid, but the row heights collapsed
  — absolute mm coordinates are safer.
- **ID collision.** Make sure the preview container's ID does NOT collide with an input
  field's (e.g. don't have two `id="sheets"` — one input "Number of sheets" and one div). A
  colliding ID makes `querySelector` find the wrong element, and the sheet stays empty. This
  tripped us up too.
- **Printing.** `@media print`: hide the control panel, sheets without `box-shadow`,
  `page-break-after: always` (except the last). Turn on `print-background` so the grid
  (gradient background) is printed too.
- **"Fit to page".** In the print dialog it's worth suggesting the "Fit to page" option to the
  user, if the edge still runs off.

---

## 6. POSSIBLE EXTENSIONS (optional, if requested)
(Division, addition/subtraction, and direct PDF download via jsPDF are already implemented —
see above. Remaining ideas:)
- Automatic sizing of the problems to one page (computing the cell size from the column and
  row counts so it fills the page exactly).
- Saving the current settings in the browser (localStorage — note: not available in certain
  embedded environments, but available when opened as a standalone file).

---

## 7. STARTING FILE
`index.html` is a working reference implementation that realizes
all the parameters and features above. Feel free to start from it, or rebuild it from the
specification.

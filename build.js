/* Inline the jsPDF UMD library into the single distributable HTML file.
 *
 * The HTML keeps everything in one self-contained file that works offline.
 * jsPDF comes from npm (node_modules), so this step copies its built UMD
 * source between the <!-- jspdf:start --> / <!-- jspdf:end --> markers.
 *
 * Idempotent: re-running replaces whatever is currently between the markers.
 * Run after `npm install` and whenever the jsPDF version is bumped. Editing
 * the app's own code in the HTML does NOT require a rebuild.
 */
const fs = require('fs');
const path = require('path');

const HTML = path.join(__dirname, 'math_worksheet_generator.html');
const LIB = path.join(__dirname, 'node_modules', 'jspdf', 'dist', 'jspdf.umd.min.js');

const START = '<!-- jspdf:start -->';
const END = '<!-- jspdf:end -->';

const lib = fs.readFileSync(LIB, 'utf8');
let html = fs.readFileSync(HTML, 'utf8');

const startIdx = html.indexOf(START);
const endIdx = html.indexOf(END);
if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
  console.error(`Could not find the "${START}" / "${END}" markers in ${path.basename(HTML)}.`);
  process.exit(1);
}

// jsPDF's UMD source contains no "</script>" sequence, so it is safe to inline
// directly; guard anyway in case a future version changes that.
const safeLib = lib.replace(/<\/script>/gi, '<\\/script>');

const before = html.slice(0, startIdx + START.length);
const after = html.slice(endIdx);
const injected = `\n<script>\n${safeLib}\n</script>\n`;

html = before + injected + after;
fs.writeFileSync(HTML, html);

const kb = (Buffer.byteLength(safeLib) / 1024).toFixed(0);
console.log(`Inlined jsPDF (${kb} KB) into ${path.basename(HTML)}.`);

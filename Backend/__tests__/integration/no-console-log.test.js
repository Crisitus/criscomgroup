/**
 * Test guardia S19 — No console.log en código productivo BE
 * DA14: whitelist de archivos con console.log permitido.
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../../src');

// DA14 — whitelist: archivos boot/startup que pueden loguear con console.log
const WHITELIST = new Set([
  path.join(SRC_DIR, 'index.js'),
  path.join(SRC_DIR, 'config', 'database.js'),
  path.join(SRC_DIR, 'models', 'index.js'),
]);

function getAllJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // scripts/ no es código de runtime productivo — excluir
      if (entry.name === 'scripts') continue;
      files.push(...getAllJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('S19 — No console.log en código productivo BE (guardia)', () => {
  it('ningún archivo en Backend/src (excepto whitelist) contiene console.log', () => {
    const allFiles = getAllJsFiles(SRC_DIR);
    const violations = [];

    for (const file of allFiles) {
      if (WHITELIST.has(file)) continue;
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/console\.log/.test(line)) {
          violations.push(`${path.relative(SRC_DIR, file)}:${idx + 1} — ${line.trim()}`);
        }
      });
    }

    if (violations.length > 0) {
      throw new Error(
        `console.log encontrados en código productivo de Backend/src:\n${violations.join('\n')}`
      );
    }

    expect(violations).toHaveLength(0);
  });
});

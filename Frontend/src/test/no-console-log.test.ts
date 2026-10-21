/**
 * Test guardia S19 — No console.log en código productivo FE
 * DA14: ningún archivo productivo en Frontend/src debe contener console.log.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect } from 'vitest';

// __dirname en Vitest ESM apunta al directorio del archivo actual (Frontend/src/test/)
const SRC_DIR = join(__dirname, '..');

const EXCLUDED_DIRS = new Set(['test', '__tests__', 'node_modules']);
const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx)$/;

function getAllSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      files.push(...getAllSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !TEST_FILE_PATTERN.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('S19 — No console.log en código productivo FE (guardia)', () => {
  it('ningún archivo fuente en Frontend/src (excepto tests) contiene console.log', () => {
    const allFiles = getAllSourceFiles(SRC_DIR);
    const violations: string[] = [];

    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/console\.log/.test(line)) {
          violations.push(`${relative(SRC_DIR, file)}:${idx + 1} — ${line.trim()}`);
        }
      });
    }

    if (violations.length > 0) {
      throw new Error(
        `console.log encontrados en código productivo de Frontend/src:\n${violations.join('\n')}`
      );
    }

    expect(violations).toHaveLength(0);
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

describe('built index.html title from package.json', () => {
  it('dist/index.html title includes the package version', () => {
    const pkg = JSON.parse(readFileSync(path.resolve('package.json'), 'utf8')) as {
      version: string;
    };
    // Always rebuild so the assertion tracks the live package version.
    execSync('npx vite build', { stdio: 'pipe', cwd: path.resolve('.') });
    const html = readFileSync(path.resolve('dist/index.html'), 'utf8');
    expect(html).toMatch(new RegExp(`<title>House Edge v${pkg.version}</title>`));
    expect(html).not.toMatch(/House Edge v1\.14\./);
  });
});

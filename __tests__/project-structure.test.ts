import { existsSync } from 'fs';
import { join } from 'path';

describe('Web Kit Project Structure', () => {
  const rootDir = join(__dirname, '..');

  const requiredDirs = [
    'app',
    'components',
    'hooks',
    'lib',
    'types',
    'config'
  ];

  test.each(requiredDirs)('should have %s directory', (dir) => {
    const dirPath = join(rootDir, dir);
    expect(existsSync(dirPath)).toBe(true);
  });

  test('should have app directory with Next.js App Router structure', () => {
    const appDir = join(rootDir, 'app');
    expect(existsSync(appDir)).toBe(true);
  });

  test('should have components directory for React components', () => {
    const componentsDir = join(rootDir, 'components');
    expect(existsSync(componentsDir)).toBe(true);
  });

  test('should have hooks directory for custom React hooks', () => {
    const hooksDir = join(rootDir, 'hooks');
    expect(existsSync(hooksDir)).toBe(true);
  });

  test('should have lib directory for utilities', () => {
    const libDir = join(rootDir, 'lib');
    expect(existsSync(libDir)).toBe(true);
  });

  test('should have types directory for TypeScript types', () => {
    const typesDir = join(rootDir, 'types');
    expect(existsSync(typesDir)).toBe(true);
  });

  test('should have config directory for configuration files', () => {
    const configDir = join(rootDir, 'config');
    expect(existsSync(configDir)).toBe(true);
  });
});

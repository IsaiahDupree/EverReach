import * as fs from 'fs';
import * as path from 'path';

describe('iOS Starter Project Structure', () => {
  const rootDir = path.resolve(__dirname, '..');

  const requiredDirectories = [
    'app',
    'components',
    'hooks',
    'lib',
    'types',
    'providers',
  ];

  describe('Directory Structure', () => {
    test.each(requiredDirectories)('should have %s directory', (dir) => {
      const dirPath = path.join(rootDir, dir);
      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });

    test('all required directories should be accessible', () => {
      const missingDirs: string[] = [];

      requiredDirectories.forEach((dir) => {
        const dirPath = path.join(rootDir, dir);
        if (!fs.existsSync(dirPath)) {
          missingDirs.push(dir);
        } else if (!fs.statSync(dirPath).isDirectory()) {
          missingDirs.push(`${dir} (not a directory)`);
        }
      });

      expect(missingDirs).toEqual([]);
    });

    test('directories should have correct permissions', () => {
      requiredDirectories.forEach((dir) => {
        const dirPath = path.join(rootDir, dir);
        if (fs.existsSync(dirPath)) {
          const stats = fs.statSync(dirPath);
          // Directory should be readable and accessible
          expect(stats.isDirectory()).toBe(true);
          expect(() => fs.accessSync(dirPath, fs.constants.R_OK)).not.toThrow();
        }
      });
    });
  });
});

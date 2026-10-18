import { existsSync } from 'fs';
import { join } from 'path';

describe('HO-CLEANUP-001: Remove Duplicate Backend from iOS', () => {
  const rootDir = join(__dirname, '..');
  const iosStarterDir = join(rootDir, 'ios-starter');

  const duplicateFolders = [
    join(iosStarterDir, 'backend'),
    join(iosStarterDir, 'backend-vercel'),
    join(iosStarterDir, 'supabase'),
  ];

  test('duplicate backend folders should not exist in ios-starter', () => {
    duplicateFolders.forEach(folderPath => {
      expect(existsSync(folderPath)).toBe(false);
    });
  });

  test('main backend-kit should still have supabase folder', () => {
    const backendSupabase = join(rootDir, 'backend-kit', 'supabase');
    expect(existsSync(backendSupabase)).toBe(true);
  });

  test('ios-starter should still have essential folders', () => {
    const essentialFolders = [
      join(iosStarterDir, 'app'),
      join(iosStarterDir, 'components'),
      join(iosStarterDir, 'lib'),
      join(iosStarterDir, 'hooks'),
    ];

    essentialFolders.forEach(folderPath => {
      expect(existsSync(folderPath)).toBe(true);
    });
  });
});

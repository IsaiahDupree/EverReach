import * as fs from 'fs';
import * as path from 'path';

describe('iOS App README', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  let readmeContent: string;

  beforeAll(() => {
    // This test will initially fail (RED phase of TDD)
    expect(fs.existsSync(readmePath)).toBe(true);
    readmeContent = fs.readFileSync(readmePath, 'utf-8');
  });

  describe('Required Sections', () => {
    const requiredSections = [
      'Overview',
      'Prerequisites',
      'Quick Start',
      'Environment Setup',
      'Available Scripts',
      'Architecture',
      'Deployment',
      'Troubleshooting'
    ];

    requiredSections.forEach((section) => {
      test(`should contain ${section} section`, () => {
        const sectionRegex = new RegExp(`##\\s+${section}`, 'i');
        expect(readmeContent).toMatch(sectionRegex);
      });
    });
  });

  describe('Overview Section', () => {
    test('should describe the iOS starter kit purpose', () => {
      expect(readmeContent).toMatch(/React Native/i);
      expect(readmeContent).toMatch(/Expo/i);
      expect(readmeContent).toMatch(/Supabase/i);
    });

    test('should mention key features', () => {
      expect(readmeContent).toMatch(/authentication/i);
      expect(readmeContent).toMatch(/subscription/i);
      expect(readmeContent).toMatch(/dark mode/i);
    });
  });

  describe('Prerequisites Section', () => {
    test('should list Node.js requirement', () => {
      expect(readmeContent).toMatch(/Node\.?js/i);
      expect(readmeContent).toMatch(/18\+/);
    });

    test('should list required accounts', () => {
      expect(readmeContent).toMatch(/Supabase/i);
      expect(readmeContent).toMatch(/RevenueCat/i);
    });

    test('should mention iOS development tools', () => {
      expect(readmeContent).toMatch(/Xcode|iOS Simulator/i);
    });
  });

  describe('Quick Start Section', () => {
    test('should include installation commands', () => {
      expect(readmeContent).toMatch(/npm install/);
      expect(readmeContent).toMatch(/expo start/i);
    });

    test('should include environment setup', () => {
      expect(readmeContent).toMatch(/\.env/i);
      expect(readmeContent).toMatch(/EXPO_PUBLIC_SUPABASE_URL/);
    });

    test('should include simulator setup', () => {
      expect(readmeContent).toMatch(/iOS Simulator|expo start --ios/i);
    });
  });

  describe('Environment Setup Section', () => {
    test('should document all required environment variables', () => {
      expect(readmeContent).toMatch(/EXPO_PUBLIC_SUPABASE_URL/);
      expect(readmeContent).toMatch(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
      expect(readmeContent).toMatch(/EXPO_PUBLIC_REVENUECAT_IOS_KEY|EXPO_PUBLIC_REVENUECAT_ANDROID_KEY/);
    });

    test('should explain variable purposes', () => {
      expect(readmeContent).toMatch(/Environment Setup/i);
      expect(readmeContent).toMatch(/Supabase/i);
      expect(readmeContent).toMatch(/RevenueCat/i);
    });
  });

  describe('Available Scripts Section', () => {
    test('should document expo start', () => {
      expect(readmeContent).toMatch(/expo start|npm start/);
    });

    test('should document iOS specific commands', () => {
      expect(readmeContent).toMatch(/expo start --ios|npm run ios/);
    });

    test('should document Android specific commands', () => {
      expect(readmeContent).toMatch(/expo start --android|npm run android/);
    });

    test('should document test command', () => {
      expect(readmeContent).toMatch(/npm run test/);
    });

    test('should document type checking', () => {
      expect(readmeContent).toMatch(/type-check|tsc/);
    });
  });

  describe('Architecture Section', () => {
    test('should describe the tech stack', () => {
      expect(readmeContent).toMatch(/React Native/i);
      expect(readmeContent).toMatch(/Expo/i);
      expect(readmeContent).toMatch(/Supabase/i);
      expect(readmeContent).toMatch(/RevenueCat/i);
    });

    test('should describe folder structure', () => {
      expect(readmeContent).toMatch(/app\//);
      expect(readmeContent).toMatch(/components\//);
      expect(readmeContent).toMatch(/lib\//);
      expect(readmeContent).toMatch(/hooks\//);
      expect(readmeContent).toMatch(/providers\//);
    });

    test('should explain expo router navigation', () => {
      expect(readmeContent).toMatch(/Expo Router/i);
      expect(readmeContent).toMatch(/file-based routing|navigation/i);
    });
  });

  describe('Deployment Section', () => {
    test('should include EAS Build instructions', () => {
      expect(readmeContent).toMatch(/EAS Build|eas build/i);
    });

    test('should mention app store submission', () => {
      expect(readmeContent).toMatch(/App Store|TestFlight/i);
    });

    test('should reference eas.json configuration', () => {
      expect(readmeContent).toMatch(/eas\.json/i);
    });
  });

  describe('Troubleshooting Section', () => {
    test('should include common issues', () => {
      expect(readmeContent).toMatch(/##\s+Troubleshooting/i);
      expect(readmeContent).toMatch(/Issue:|Problem:|Common Issues/i);
      expect(readmeContent).toMatch(/Solution:|Fix:/i);
    });

    test('should cover Expo specific errors', () => {
      expect(readmeContent).toMatch(/metro|cache|watchman/i);
    });

    test('should cover simulator issues', () => {
      expect(readmeContent).toMatch(/simulator|device/i);
    });
  });

  describe('Commands Work', () => {
    test('should have valid package.json scripts referenced', () => {
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Check that documented commands exist in package.json
      expect(packageJson.scripts.start).toBeDefined();
      expect(packageJson.scripts.ios).toBeDefined();
      expect(packageJson.scripts.android).toBeDefined();
      expect(packageJson.scripts.test).toBeDefined();
    });
  });

  describe('Simulator Setup Guide', () => {
    test('should include iOS simulator setup instructions', () => {
      expect(readmeContent).toMatch(/Xcode|iOS Simulator/i);
    });

    test('should include alternative testing methods', () => {
      expect(readmeContent).toMatch(/Expo Go|physical device|QR code/i);
    });
  });
});

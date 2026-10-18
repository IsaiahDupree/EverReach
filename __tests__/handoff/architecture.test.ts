import * as fs from 'fs';
import * as path from 'path';

describe('HO-ARCH-001: Architecture Documentation', () => {
  const docsDir = path.join(__dirname, '../../docs');
  const archFilePath = path.join(docsDir, 'ARCHITECTURE.md');

  test('ARCHITECTURE.md file exists in docs/', () => {
    expect(fs.existsSync(archFilePath)).toBe(true);
  });

  describe('Required sections', () => {
    let content: string;

    beforeAll(() => {
      if (fs.existsSync(archFilePath)) {
        content = fs.readFileSync(archFilePath, 'utf-8');
      }
    });

    test('includes high-level system diagram', () => {
      expect(content).toMatch(/#+\s*(System|Architecture|Overview).*Diagram/i);
      expect(content).toMatch(/```/); // Should contain code blocks for ASCII art or mermaid diagrams
    });

    test('includes authentication flow section', () => {
      expect(content).toMatch(/#+\s*Auth(entication)?\s+Flow/i);
      expect(content).toContain('Supabase');
      // Should explain JWT, session management, OAuth
      expect(content).toMatch(/JWT|token|session/i);
    });

    test('includes data flow section', () => {
      expect(content).toMatch(/#+\s*Data\s+Flow/i);
      // Should explain client -> API -> database
      expect(content).toMatch(/client.*API.*database|database.*API.*client/i);
    });

    test('includes deployment architecture section', () => {
      expect(content).toMatch(/#+\s*Deployment/i);
      expect(content).toMatch(/Vercel|serverless/i);
      expect(content).toMatch(/Expo|EAS/i);
      expect(content).toMatch(/Supabase/i);
    });

    test('describes three-tier architecture (iOS, Backend, Web)', () => {
      expect(content).toMatch(/iOS|mobile|React Native|Expo/i);
      expect(content).toMatch(/backend|API|Next\.js API/i);
      expect(content).toMatch(/web|frontend|Next\.js/i);
    });

    test('explains subscription/payment flow', () => {
      expect(content).toMatch(/#+.*payment|#+.*subscription/i);
      expect(content).toMatch(/Stripe/i);
      expect(content).toMatch(/RevenueCat/i);
      expect(content).toMatch(/webhook/i);
    });

    test('includes technology stack section', () => {
      expect(content).toMatch(/#+\s*Tech(nology)?\s+Stack/i);
      expect(content).toContain('Supabase');
      expect(content).toContain('Next.js');
      expect(content).toContain('Expo');
    });

    test('contains visual diagrams (ASCII or Mermaid)', () => {
      // Should have at least 2 diagrams
      const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
      expect(codeBlocks.length).toBeGreaterThanOrEqual(2);
    });

    test('includes table of contents', () => {
      // Should have navigation links
      expect(content).toMatch(/#+\s*Table of Contents|##\s*Contents/i);
    });
  });

  describe('Content quality', () => {
    let content: string;

    beforeAll(() => {
      if (fs.existsSync(archFilePath)) {
        content = fs.readFileSync(archFilePath, 'utf-8');
      }
    });

    test('is comprehensive (at least 500 words)', () => {
      const wordCount = content.split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(500);
    });

    test('uses proper markdown formatting', () => {
      expect(content).toMatch(/^#\s+/m); // Has h1 title
      expect(content).toMatch(/^##\s+/m); // Has h2 sections
    });
  });
});

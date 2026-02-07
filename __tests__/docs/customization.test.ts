import fs from 'fs';
import path from 'path';

describe('CUSTOMIZATION.md Documentation', () => {
  const docsDir = path.join(__dirname, '../../docs');
  const customizationPath = path.join(docsDir, 'CUSTOMIZATION.md');

  it('should exist in the docs directory', () => {
    expect(fs.existsSync(customizationPath)).toBe(true);
  });

  describe('content requirements', () => {
    let content: string;

    beforeAll(() => {
      if (fs.existsSync(customizationPath)) {
        content = fs.readFileSync(customizationPath, 'utf-8');
      }
    });

    it('should have a file map section', () => {
      expect(content).toMatch(/file map/i);
      expect(content).toMatch(/app\//i);
      expect(content).toMatch(/components\//i);
      expect(content).toMatch(/hooks\//i);
    });

    it('should explain what to change', () => {
      expect(content).toMatch(/customize/i);
      expect(content).toMatch(/replace|change|modify/i);
      expect(content).toMatch(/keep/i);
    });

    it('should include examples', () => {
      expect(content).toMatch(/example/i);
      expect(content).toMatch(/```/); // Should have code blocks
    });

    it('should reference key files mentioned in PRD', () => {
      expect(content).toMatch(/types\/item\.ts/);
      expect(content).toMatch(/hooks\/useItems\.ts/);
      expect(content).toMatch(/app\.json/);
      expect(content).toMatch(/supabase\/schema\.sql/);
    });

    it('should have priority levels for changes', () => {
      expect(content).toMatch(/high priority|must change|required/i);
      expect(content).toMatch(/medium priority|modify|optional/i);
      expect(content).toMatch(/low priority|keep/i);
    });

    it('should include customization checklist', () => {
      expect(content).toMatch(/\[[ x]\]/); // Markdown checkboxes
      expect(content).toMatch(/branding|identity/i);
      expect(content).toMatch(/data model|entity/i);
    });

    it('should provide data flow explanation', () => {
      expect(content).toMatch(/screen|component/i);
      expect(content).toMatch(/hook/i);
      expect(content).toMatch(/supabase|database/i);
    });

    it('should include concrete examples of common use cases', () => {
      expect(content).toMatch(/e-commerce|product|fitness|task|workout/i);
    });
  });
});

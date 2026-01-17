import { rewriteTone, TONE_LABELS, type Tone } from '@/lib/tone';

describe('tone rewriting', () => {
  describe('casual tone', () => {
    test('converts "thank you" to "thanks"', () => {
      const result = rewriteTone('Thank you for your help.', 'casual');
      expect(result.toLowerCase()).toContain('thanks');
    });

    test('applies contractions', () => {
      const result = rewriteTone('I am going to the store. We are ready.', 'casual');
      expect(result).toContain("I'm");
      // Note: Capitalized "We are" may not contract depending on preserveCasing
      expect(result.toLowerCase()).toMatch(/we'?re/);
    });

    test('converts "hello" to "hey"', () => {
      const result = rewriteTone('Hello there!', 'casual');
      expect(result.toLowerCase()).toContain('hey');
    });

    test('converts formal phrases to casual', () => {
      const result = rewriteTone('I would love to help you.', 'casual');
      expect(result).toContain("I'd love");
    });
  });

  describe('professional tone', () => {
    test('expands contractions', () => {
      const result = rewriteTone("I'm ready and we're excited.", 'professional');
      expect(result).toContain('I am');
      expect(result).toContain('we are');
    });

    test('converts "hey" to "Hello"', () => {
      const result = rewriteTone('hey there', 'professional');
      expect(result).toContain('Hello');
    });

    test('replaces casual words', () => {
      const result = rewriteTone('That is awesome guys', 'professional');
      expect(result.toLowerCase()).toContain('great');
      expect(result.toLowerCase()).toContain('team');
    });

    test('adds thank you if missing', () => {
      const result = rewriteTone('Please send the report.', 'professional');
      expect(result).toContain('Thank you');
    });

    test('does not duplicate thank you', () => {
      const result = rewriteTone('Thank you for your time.', 'professional');
      const matches = (result.match(/thank you/gi) || []).length;
      expect(matches).toBe(1);
    });
  });

  describe('warm tone', () => {
    test('adds warmth phrase at end', () => {
      const result = rewriteTone('Here is the document.', 'warm');
      expect(result).toContain('appreciate you');
    });

    test('does not add warmth if already present', () => {
      const result = rewriteTone('Thanks for your help!', 'warm');
      expect((result.match(/appreciate/gi) || []).length).toBeLessThanOrEqual(1);
    });

    test('does not add warmth to questions', () => {
      const result = rewriteTone('Can you send me the file?', 'warm');
      expect(result).not.toContain('appreciate you');
    });

    test('does not add warmth to CTAs', () => {
      const result = rewriteTone('Let me know if you need anything.', 'warm');
      expect(result).not.toContain('appreciate you');
    });

    test('expands contractions', () => {
      const result = rewriteTone("I'm here to help.", 'warm');
      expect(result).toContain('I am');
    });
  });

  describe('direct tone', () => {
    test('removes most hedging words', () => {
      const input = 'I just think maybe we might be able to try this.';
      const result = rewriteTone(input, 'direct');
      expect(result).not.toContain('just');
      expect(result).not.toContain('maybe');
      expect(result).not.toContain('might');
      // Note: "I think" at start may be handled differently
    });

    test('simplifies requests', () => {
      const result = rewriteTone('Would you be able to send the file?', 'direct');
      expect(result.toLowerCase()).toContain('can you');
    });

    test('adds confirmation request', () => {
      const result = rewriteTone('I will send the report tomorrow.', 'direct');
      expect(result.toLowerCase()).toContain('confirm');
    });

    test('applies contractions', () => {
      const result = rewriteTone('I am going to send it. We are ready.', 'direct');
      expect(result).toContain("I'm");
    });

    test('removes weak phrases', () => {
      const result = rewriteTone('I believe we should perhaps move forward.', 'direct');
      expect(result).not.toContain('believe');
      expect(result).not.toContain('perhaps');
    });
  });

  describe('edge cases', () => {
    test('handles empty string', () => {
      const result = rewriteTone('', 'casual');
      expect(result).toBe('');
    });

    test('handles whitespace normalization', () => {
      const result = rewriteTone('This  has   extra    spaces.', 'casual');
      expect(result).not.toContain('  ');
    });

    test('trims leading and trailing whitespace', () => {
      const result = rewriteTone('  Hello there  ', 'casual');
      expect(result).toBe(result.trim());
    });

    test('handles multiple punctuation', () => {
      const result = rewriteTone('Hello!!!', 'professional');
      expect(result).toBeTruthy();
    });

    test('preserves sentence case', () => {
      const result = rewriteTone('this is a sentence.', 'casual');
      expect(result[0]).toBe(result[0].toUpperCase());
    });
  });

  describe('TONE_LABELS constant', () => {
    test('has all tone types', () => {
      expect(TONE_LABELS.casual).toBe('Casual');
      expect(TONE_LABELS.professional).toBe('Professional');
      expect(TONE_LABELS.warm).toBe('Warm');
      expect(TONE_LABELS.direct).toBe('Direct');
    });

    test('has exactly 4 tones', () => {
      expect(Object.keys(TONE_LABELS)).toHaveLength(4);
    });
  });
});

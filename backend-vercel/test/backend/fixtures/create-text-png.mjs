/**
 * Helper to create PNG images with embedded text
 * Uses sharp to render actual text overlays for realistic test fixtures
 */

import sharp from 'sharp';

/**
 * Generate a PNG with text rendered using SVG overlay
 * This creates a proper image that OpenAI Vision can analyze
 */
export async function createTextPNG(text, width = 800, height = 600) {
  // Split text into lines
  const lines = text.split('\n').filter(line => line.trim());
  
  // Create SVG with text overlay
  const lineHeight = 40;
  const fontSize = 28;
  const startY = 100;
  
  const svgLines = lines.map((line, i) => 
    `<text x="50" y="${startY + (i * lineHeight)}" font-size="${fontSize}" fill="#000000">${
      line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }</text>`
  ).join('\n');
  
  const svg = `
    <svg width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      ${svgLines}
    </svg>
  `;
  
  // Render SVG to PNG using sharp
  const pngBuffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();
  
  return new Uint8Array(pngBuffer);
}

/**
 * Create fixtures for testing
 */
export const fixtures = {
  businessCard: {
    name: 'business-card.png',
    text: 'John Doe\njohn.doe@example.com\n+1 (555) 123-4567\nSenior Developer\nTech Corp',
    expectedEntities: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      company: 'Tech Corp',
      role: 'Senior Developer'
    }
  },
  
  emailScreenshot: {
    name: 'email-screenshot.png',
    text: 'From: alice@startup.io\nTo: me@example.com\nSubject: Project Update\n\nHi! Here\'s the latest on the project...',
    expectedEntities: {
      email: 'alice@startup.io',
      category: 'email',
      direction: 'incoming'
    }
  },
  
  chatScreenshot: {
    name: 'chat-screenshot.png',
    text: 'Robert Johnson: Hey! Can we meet tomorrow?\nYou: Sure, what time works?',
    expectedEntities: {
      name: 'Robert Johnson',
      category: 'chat'
    }
  }
};

/**
 * Generate all fixtures
 */
export async function generateFixtures() {
  const results = {};
  
  for (const [key, fixture] of Object.entries(fixtures)) {
    results[key] = {
      ...fixture,
      data: await createTextPNG(fixture.text)
    };
  }
  
  return results;
}

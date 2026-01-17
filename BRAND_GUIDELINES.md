# EverReach CRM — Brand Guidelines

Last Updated: 2025-11-04
Version: 1.0

---

## Brand Identity

- **App Name**: EverReach (full: "AI-Enhanced Personal CRM")
- **Scheme**: everreach
- **Bundle ID**: app.rork.ai-enhanced-personal-crm
- **Domain**: everreach.app
- **Tagline**: "Never let a relationship go cold again."

---

## Logo & Assets

### Logo Files (Located in `/assets/images/`)

- **App Icon**: `icon.png` (1024×1024)
- **Splash Screen**: `splash-icon.png`
- **Favicon**: `favicon.png`
- **Android Icons**: Various densities in `/android/app/src/main/res/`

### Logo Usage

- Use on light backgrounds: Black logo
- Use on dark backgrounds: White logo
- Minimum size: 32px (digital), 0.5in (print)
- Clear space: Minimum 20% of logo height on all sides

---

## Color Palette

### Primary Colors

- **Black** (Primary): `#000000`
  - Use: Primary UI elements, text, buttons, CTAs
  - Dark mode equivalent: `#FFFFFF`

- **White** (Surface): `#FFFFFF`
  - Use: Cards, surfaces, backgrounds
  - Dark mode equivalent: `#1C1C1E`

### Background Colors

- **Light Background**: `#F8F9FA`
  - Use: App background, page background
  - Dark mode: `#000000`

### Text Colors

- **Primary Text**: `#000000`
  - Dark mode: `#FFFFFF`

- **Secondary Text**: `#666666`
  - Use: Labels, captions, help text
  - Dark mode: `#8E8E93`

### Warmth Score Colors (Signature Feature)

These are brand-defining colors for the Warmth Score feature:

- **Hot** (Priority contacts): `#FF6B6B` (Red)
  - Use: High-priority indicators, urgent actions
  - Meaning: Relationships that need immediate attention

- **Warm** (Healthy): `#FFB366` (Orange)
  - Use: Healthy relationship indicators
  - Meaning: Relationships in good standing

- **Cool** (Declining): `#4ECDC4` (Teal/Turquoise)
  - Use: Warning indicators
  - Meaning: Relationships starting to cool down

- **Cold** (At risk): `#95A5A6` (Gray)
  - Use: Low-priority, dormant contacts
  - Meaning: Relationships at risk of going cold

### Accent Colors

- **Border**: `#E5E5E5` (Light) / `#38383A` (Dark)
- **Error/Notification**: `#FF6B6B` (Light) / `#FF453A` (Dark)
- **Success**: `#10B981` (Light) / `#30D158` (Dark)

---

## Typography

### Web & Backend

- **Primary Font**: Arial, Helvetica, sans-serif
- Use system fonts for maximum compatibility and performance

### Mobile (React Native)

- **System Default Fonts**:
  - iOS: San Francisco
  - Android: Roboto
- Dynamic type support enabled

### Font Hierarchy

- **Headings**: 
  - H1: 32-40px, Bold (600-700)
  - H2: 24-28px, Semi-bold (600)
  - H3: 20-22px, Semi-bold (600)
  
- **Body Text**: 
  - Large: 18px, Regular (400)
  - Regular: 16px, Regular (400)
  - Small: 14px, Regular (400)
  - Caption: 12px, Regular (400)

- **UI Elements**:
  - Buttons: 16px, Semi-bold (600)
  - Labels: 14px, Medium (500)
  - Input: 16px, Regular (400)

### Line Height

- Headings: 1.2–1.3
- Body: 1.5–1.6
- UI: 1.4

---

## Design Principles

### Minimalist & Modern

- Clean interfaces with ample white space
- Black and white as primary palette
- Warmth Score colors as intentional accents
- Rounded corners (12px standard)

### Mobile-First

- Designed for thumb-friendly interaction
- Bottom navigation for primary actions
- Gesture-based interactions
- Dark mode support built-in

### Data-Driven

- Warmth Scores are visual and immediate
- Prioritized lists, not endless scrolling
- Context always visible
- Quick actions prominent

---

## UI Components

### Cards

- Background: `surface` color
- Border radius: 12px
- Padding: 16px
- Shadow: Subtle (0px 2px 8px rgba(0,0,0,0.05))
- Elevation: 2

### Buttons

#### Primary Button
- Background: `#000000` (Light) / `#FFFFFF` (Dark)
- Text: `#FFFFFF` (Light) / `#000000` (Dark)
- Border radius: 12px
- Padding: 12px vertical, 24px horizontal
- Font: 16px, semi-bold (600)

#### Secondary Button
- Background: Transparent or `surface`
- Border: 1px solid `border`
- Text: `primary` color
- Same dimensions as primary

#### Destructive Button
- Background: `#FF6B6B`
- Text: `#FFFFFF`
- Use sparingly for delete/cancel actions

### Input Fields

- Background: `surface`
- Border: 1px solid `border`
- Border radius: 12px
- Padding: 16px
- Font: 16px
- Focus state: Border becomes `primary` color

### Status Indicators

Use Warmth Score colors:
- Hot: `#FF6B6B` with dot or badge
- Warm: `#FFB366`
- Cool: `#4ECDC4`
- Cold: `#95A5A6`

---

## Iconography

### Icon Library

- **Primary**: Lucide React Native
- Style: Outline/stroke icons
- Weight: 2px stroke
- Size: 20-24px standard, 16px small, 32px large

### Icon Usage

- Always pair with labels (except universally recognized icons)
- Use consistent sizing within same context
- Primary color for active states
- Secondary color for inactive states

---

## Photography & Imagery

### Style Guidelines

- **Real UI screenshots** for product imagery
- **Clean, uncluttered backgrounds** for lifestyle shots
- **Diverse representation** in any people photography
- **Mobile-first framing** (vertical preferred)

### Screenshot Standards

- Use actual app UI (no mockups unless noted)
- Show Warmth Scores prominently
- Demonstrate AI message composer in action
- Include context (conversation history, notes)
- Light mode preferred for marketing (higher contrast)
- Annotate key features with subtle overlays if needed

### Image Treatments

- No heavy filters
- Natural lighting preferred
- High contrast for readability
- Optimize for web (< 200KB per image)

---

## Voice & Tone

### Brand Voice

- **Direct**: Get to the point quickly
- **Confident**: We solve a real problem
- **Helpful**: Focus on user outcomes
- **Modern**: Tech-forward but not jargony
- **Human**: Relationships are personal

### Tone Variations

**Marketing/Website**:
- Bold, benefit-driven
- "Never let a relationship go cold again"
- Action-oriented CTAs

**Product/UI**:
- Instructional and clear
- "Import contacts" not "Let's bring in your network!"
- Informative tooltips

**Support/Help**:
- Patient and thorough
- Anticipate questions
- Step-by-step guidance

**Social Media**:
- Conversational but professional
- Tips and best practices
- Customer stories and wins

---

## Messaging Hierarchy

### Primary Message
"Never let a relationship go cold again."

### Supporting Messages
1. AI-powered relationship intelligence
2. Know exactly who to reach out to
3. Maintain hundreds of relationships effortlessly
4. Your personal relationship manager

### Feature Benefits (Priority Order)
1. **Warmth Score** — See relationship health at a glance
2. **AI Message Composer** — Personalized messages in seconds
3. **Screenshot Scanner** — Business card to contact in 3 seconds
4. **3-Minute Daily Routine** — Scalable relationship maintenance
5. **Context Everywhere** — Full history at your fingertips

---

## Content Patterns

### Headlines

- Start with benefit or outcome
- Keep under 60 characters for ads
- Use action verbs
- Numbers add credibility ("3 minutes", "500+ relationships")

### Body Copy

- Lead with the problem, then solution
- One idea per paragraph
- Short sentences (under 20 words)
- Active voice
- Specific, not vague

### CTAs

- Action-oriented verbs
- Clear outcome ("Start Free Trial" vs "Learn More")
- Single primary CTA per page/screen
- High contrast for visibility

---

## Platform-Specific Guidelines

### App Store / Google Play

- **Title**: EverReach – AI Personal CRM
- **Subtitle**: Keep relationships warm with AI
- **Keywords**: Focus on "personal crm", "relationship", "ai", "contacts"
- **Screenshots**: 6-7 images showing core features in order
- **Preview Video**: 15-30 seconds, hook in first 3 seconds

### Social Media (All 9 Channels)

1. **Facebook**
   - 1200×630 link previews
   - Longer-form content welcome
   - Use cases and stories

2. **Instagram**
   - 1080×1080 or 1080×1350 (4:5)
   - Stories: 1080×1920 (9:16)
   - Reels: 1080×1920, 15-90s
   - Visual-first, minimal text on images

3. **Twitter/X**
   - 1200×675 images
   - Concise copy (under 280 chars)
   - Thread-friendly content
   - Tips and quick wins

4. **LinkedIn**
   - 1200×627 link previews
   - Professional tone
   - Founder/thought leadership
   - Case studies and ROI

5. **TikTok**
   - 1080×1920 vertical
   - 15-60s videos
   - Fast-paced, hook in first 2s
   - Trend participation

6. **YouTube**
   - 1920×1080 (16:9)
   - Thumbnails: 1280×720
   - Longer-form demos and tutorials
   - SEO-optimized titles

7. **Pinterest**
   - 1000×1500 (2:3)
   - Infographics and tip cards
   - Educational content
   - CRM tips and relationship advice

8. **Reddit**
   - Community-first, not promotional
   - Answer questions genuinely
   - Share tips in relevant subreddits
   - No hard selling

9. **WhatsApp/Telegram** (Community)
   - Updates and releases
   - Direct support
   - Community building
   - Behind-the-scenes

### Email

- **Subject lines**: Under 50 characters
- **Preview text**: Optimize (different from subject)
- **Width**: 600px max
- **Font size**: 16px minimum body text
- **CTA buttons**: 44px min height (mobile)
- **Alt text**: Always include for images

### Website

- **Hero section**: Above-the-fold CTA
- **Load time**: Under 3 seconds
- **Mobile responsive**: Design mobile-first
- **Accessibility**: WCAG 2.1 AA compliant
- **Forms**: Minimal fields, clear labels

---

## Accessibility Standards

### Color Contrast

- Text on background: 4.5:1 minimum (WCAG AA)
- Large text (18px+): 3:1 minimum
- UI elements: 3:1 minimum

### Implementation

- Alt text for all images
- Keyboard navigation support
- Screen reader compatible
- Captions for video content
- Skip links for navigation

---

## File Naming Conventions

### Images
- `everreach-[descriptor]-[size].png`
- Example: `everreach-warmth-dashboard-1200x630.png`

### Videos
- `everreach-[platform]-[topic]-[duration].mp4`
- Example: `everreach-instagram-reel-ai-composer-30s.mp4`

### Documents
- `everreach-[type]-[date].pdf`
- Example: `everreach-case-study-2025-11.pdf`

---

## Brand Don'ts

❌ Don't use gradients or complex patterns
❌ Don't use more than 3 colors in a single design
❌ Don't stretch or distort the logo
❌ Don't use low-contrast text
❌ Don't use buzzwords without substance ("revolutionary", "game-changing")
❌ Don't show fake data or mockups (use real app when possible)
❌ Don't over-promise ("never forget anyone again" → realistic claims)

---

## Proof Points (To Be Added)

Currently in beta/early launch. Once available, update with:
- User count
- Average rating
- Key metrics (messages sent, relationships maintained, etc.)
- Customer testimonials (with permission)
- Case study results

**Interim Approach**: Use "Join thousands" or remove specific numbers until verified.

---

## Multi-Language Notes

- **Current**: English (US) only
- **Planned**: Multi-language support post-successful English launch
- **Considerations**: 
  - RTL layout support for Arabic, Hebrew
  - Character set expansion for Asian languages
  - Cultural adaptation of messaging
  - Localized proof points

---

## Version Control

- v1.0 (2025-11-04): Initial brand guidelines
- Update this document as brand evolves
- Major changes require stakeholder review

---

## Contact & Questions

For brand guideline questions or asset requests:
- Marketing: marketing@everreach.app
- Design: design@everreach.app
- General: support@everreach.app

---

**These guidelines ensure consistent, professional brand presentation across all channels and touchpoints.**

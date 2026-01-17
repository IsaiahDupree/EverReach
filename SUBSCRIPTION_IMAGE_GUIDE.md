# Subscription Image Creation Guide
## 1024x1024 Pixel Image for App Store Connect

---

## 📐 Specifications

### Technical Requirements
- **Dimensions**: 1024 x 1024 pixels (exactly)
- **Format**: PNG or JPG
- **Color Space**: RGB
- **File Size**: Maximum 2 MB
- **Background**: Opaque (no transparency)
- **DPI**: 72 or higher

### Usage
This image appears in:
- Win-back offers
- Offer code redemptions
- App Store product page (if promotion enabled)
- Search results (editorial discretion)

---

## 🎨 Design Template

### Layout Structure

```
┌──────────────────────────────────────┐
│                                      │
│         [EverReach Logo]             │  ← Top 20%
│                                      │
│                                      │
│      ╔══════════════════╗           │
│      ║  Core Monthly    ║           │  ← Main Title (30%)
│      ║  Subscription    ║           │
│      ╚══════════════════╝           │
│                                      │
│   🎤        💬         🔥           │  ← Icons (20%)
│                                      │
│  Voice     Message    Warmth        │
│  Notes     Goals      Score         │
│                                      │
│                                      │
│       $14.99/month                   │  ← Pricing (15%)
│                                      │
│     Professional Networking          │  ← Tagline (15%)
│        Made Simple                   │
│                                      │
└──────────────────────────────────────┘
```

---

## 🎨 Brand Colors

### Primary Palette
```
Primary Blue:   #2563EB  (RGB: 37, 99, 235)
Dark Blue:      #1E40AF  (RGB: 30, 64, 175)
Light Blue:     #60A5FA  (RGB: 96, 165, 250)

Accent Orange:  #F97316  (RGB: 249, 115, 22)
Warmth Red:     #EF4444  (RGB: 239, 68, 68)

Neutral Gray:   #6B7280  (RGB: 107, 114, 128)
Background:     #F9FAFB  (RGB: 249, 250, 251)
Text Dark:      #111827  (RGB: 17, 24, 39)
```

### Color Usage
- **Background**: Light Blue gradient (#60A5FA → #2563EB)
- **Text**: White for contrast
- **Accents**: Orange for pricing/CTAs
- **Icons**: White with subtle shadow

---

## 📝 Text Content

### Main Title
```
Core Monthly
```
- **Font**: SF Pro Display Bold (or similar)
- **Size**: 80-100pt
- **Color**: White (#FFFFFF)
- **Alignment**: Center
- **Effect**: Drop shadow (subtle)

### Subtitle (Optional)
```
Subscription
```
- **Font**: SF Pro Display Regular
- **Size**: 48-60pt
- **Color**: White 80% opacity
- **Alignment**: Center

### Feature Labels
```
Voice Notes | Message Goals | Warmth Score
```
- **Font**: SF Pro Text Medium
- **Size**: 32-40pt
- **Color**: White (#FFFFFF)
- **Alignment**: Center under icons

### Pricing
```
$14.99/month
```
- **Font**: SF Pro Display Semibold
- **Size**: 64-80pt
- **Color**: White or Accent Orange
- **Alignment**: Center
- **Background**: Optional pill shape

### Tagline
```
Professional Networking Made Simple
```
- **Font**: SF Pro Text Regular
- **Size**: 36-42pt
- **Color**: White 90% opacity
- **Alignment**: Center

---

## 🖼️ Design Elements

### Logo
- **Size**: 200x200 pixels
- **Position**: Top center
- **Format**: White version (on colored background)
- **Margin**: 80px from top

### Feature Icons
- **Style**: Line icons or filled
- **Size**: 120x120 pixels each
- **Spacing**: 60px between icons
- **Color**: White with 2px stroke
- **Shadow**: Optional subtle drop shadow

**Icon Sources**:
- 🎤 Voice Notes: Microphone icon
- 💬 Message Goals: Speech bubble with sparkle
- 🔥 Warmth Score: Flame or heart icon

### Background
**Option 1: Gradient**
```css
background: linear-gradient(135deg, #60A5FA 0%, #2563EB 100%);
```

**Option 2: Solid with Pattern**
```
Solid #2563EB + subtle dot pattern or waves
```

**Option 3: Abstract Shapes**
```
Geometric shapes in brand colors (circles, lines)
```

---

## 🚫 What NOT to Include

### Prohibited Elements
❌ App screenshots or UI mockups
❌ Actual interface elements
❌ Time-limited offers ("Limited time!")
❌ Specific dates or deadlines
❌ "Free" claims without context
❌ Competitor names or comparisons
❌ User-generated content
❌ Stock photos of people
❌ Misleading features
❌ Prices in multiple currencies

### Why These Are Prohibited
- **App Guidelines**: Apple prohibits screenshots in promotional images
- **Misleading**: Time-based offers can't be updated easily
- **Legal**: Comparative claims require substantiation
- **Flexibility**: Image should work long-term without updates

---

## ✅ Design Checklist

### Before Export
- [ ] Dimensions are exactly 1024x1024 pixels
- [ ] No transparency (opaque background)
- [ ] Text is legible at smaller sizes (test at 200x200)
- [ ] Colors match brand guidelines
- [ ] All text is spelled correctly
- [ ] Icons are recognizable
- [ ] Pricing is accurate and current
- [ ] No prohibited elements included
- [ ] File size under 2 MB
- [ ] Saved in RGB color space

### Quality Checks
- [ ] Preview at 512x512 (half size)
- [ ] Preview at 256x256 (quarter size)
- [ ] Check on light and dark backgrounds
- [ ] Verify contrast ratios (WCAG AA minimum)
- [ ] Test on retina and non-retina displays
- [ ] Review by another team member

---

## 🛠️ Creation Tools

### Recommended Software

**1. Figma (Recommended)**
- **Pro**: Browser-based, collaborative
- **Templates**: Provided in `/marketing/templates/`
- **Export**: PNG @ 2x (1024x1024)

**2. Canva Pro**
- **Pro**: Easy to use, templates available
- **Con**: Requires Pro subscription
- **Export**: Custom dimensions → 1024x1024

**3. Adobe Photoshop**
- **Pro**: Professional, pixel-perfect
- **Template**: PSD provided
- **Export**: Save for Web (PNG-24)

**4. Sketch (Mac only)**
- **Pro**: Industry standard for UI design
- **Export**: 2x resolution

**5. Affinity Designer**
- **Pro**: One-time purchase, no subscription
- **Export**: PNG @ 2x

### Free Alternatives
- **Photopea**: Web-based Photoshop alternative
- **GIMP**: Open-source image editor
- **Inkscape**: Vector graphics (export to PNG)

---

## 📦 Figma Template Instructions

### Using the Provided Template

**Step 1: Open Template**
```
File: /marketing/templates/subscription-image.fig
Location: Figma Community or provided link
```

**Step 2: Customize**
1. Replace logo with your version
2. Update colors if needed
3. Adjust text content
4. Modify icons if necessary

**Step 3: Export**
1. Select the artboard
2. Export Settings:
   - Format: PNG
   - Scale: 2x
   - Suffix: @2x
3. Download
4. Verify dimensions: 1024x1024

---

## 🎯 Design Variations

### Option A: Gradient Background (Recommended)
```
Background: Blue gradient
Logo: White
Text: White
Icons: White with subtle shadow
Pricing: White or Accent Orange
```
**Best For**: Modern, clean look
**File**: `core-monthly-gradient.png`

### Option B: Solid with Pattern
```
Background: Solid Primary Blue + dot pattern
Logo: White
Text: White
Icons: White outline style
Pricing: Accent Orange
```
**Best For**: Professional, subtle texture
**File**: `core-monthly-pattern.png`

### Option C: Abstract Shapes
```
Background: White
Shapes: Blue circles/lines (abstract)
Logo: Primary Blue
Text: Dark Blue
Icons: Primary Blue
Pricing: Accent Orange
```
**Best For**: Light, airy feel
**File**: `core-monthly-abstract.png`

---

## 📊 A/B Testing Recommendations

### Test Variations
1. **Color Schemes**:
   - Blue gradient vs. Solid blue vs. White background
   
2. **Pricing Emphasis**:
   - Large pricing vs. Small pricing
   - Orange vs. White pricing text
   
3. **Icon Styles**:
   - Filled vs. Outline icons
   - 3 icons vs. 4 icons

4. **Text Hierarchy**:
   - Large title + small features
   - Equal sized title and features

### How to Test
- Create 2-3 variations
- Upload to App Store Connect (can change anytime)
- Monitor conversion rates
- Update after 2-4 weeks with winning design

---

## 🚀 Quick Start Guide

### For Non-Designers (5 Minutes)

**Using Canva Pro**:
1. Go to Canva.com
2. Create custom size: 1024x1024
3. Add blue gradient background
4. Add white text: "Core Monthly"
5. Add emoji icons: 🎤 💬 🔥
6. Add text: "$14.99/month"
7. Download as PNG
8. Upload to App Store Connect

**Using PowerPoint**:
1. Create new slide: 1024x1024 (in slide size settings)
2. Blue gradient background
3. Add text boxes with content
4. Insert icons or emoji
5. Export as PNG (max quality)
6. Upload to App Store Connect

---

## 📁 File Naming Convention

### Recommended Names
```
core-monthly-1024x1024.png              (Primary)
core-monthly-gradient-1024x1024.png     (Variation A)
core-monthly-pattern-1024x1024.png      (Variation B)
core-monthly-abstract-1024x1024.png     (Variation C)
```

### File Organization
```
/marketing/
├── subscription-images/
│   ├── core-monthly-1024x1024.png      (Active)
│   ├── variations/
│   │   ├── gradient.png
│   │   ├── pattern.png
│   │   └── abstract.png
│   └── archive/
│       └── previous-versions/
```

---

## ✨ Pro Tips

### Design Tips
1. **Keep it simple**: Less is more for small preview sizes
2. **High contrast**: Ensure text is readable at any size
3. **Test before upload**: View at different sizes
4. **Brand consistency**: Match app's visual style
5. **Future-proof**: Avoid time-sensitive content

### Technical Tips
1. **Use vectors**: Keep source files in vector format
2. **Export @2x**: Ensures crisp display on retina screens
3. **Compress wisely**: Use tools like TinyPNG to reduce file size
4. **Save source**: Keep PSD/Sketch/Figma file for future edits
5. **Version control**: Name files with dates (v1_2025-11-23.png)

### Marketing Tips
1. **Feature benefits**: Show value, not just features
2. **Clear pricing**: Make cost obvious and attractive
3. **Professional look**: Reflects app quality
4. **Consistency**: Use same style across all marketing
5. **A/B test**: Try different versions to optimize conversions

---

## 🆘 Troubleshooting

### Common Issues

**Issue**: File too large (>2 MB)
**Solution**: 
- Use PNG-8 instead of PNG-24
- Compress with TinyPNG.com
- Reduce gradient complexity

**Issue**: Colors look different on upload
**Solution**:
- Ensure RGB color space (not CMYK)
- Embed color profile (sRGB)
- Test on multiple devices

**Issue**: Text is blurry
**Solution**:
- Export at exact 1024x1024 (not scaled)
- Use whole pixel values for positioning
- Increase font weight if needed

**Issue**: Rejected by App Store
**Solution**:
- Remove any prohibited elements
- Ensure dimensions are exact
- Make pricing/offers clear and accurate
- Verify no trademark violations

---

## 📞 Need Help?

### Design Resources
- **Templates**: `/marketing/templates/`
- **Brand Assets**: `/marketing/brand-assets/`
- **Examples**: `/marketing/examples/`

### Internal Support
- **Design Questions**: #design-team channel
- **Technical Issues**: #app-store-submission channel
- **Approval Help**: review@everreach.app

### External Resources
- **Apple Guidelines**: [App Store Promotional Images](https://developer.apple.com/app-store/promoting-in-app-purchases/)
- **Figma Community**: Search "subscription image templates"
- **Design Inspiration**: Dribbble, Behance (search "subscription design")

---

**Version**: 1.0
**Last Updated**: November 23, 2025
**Status**: Ready to use ✅
**Next Steps**: Create image using template → Upload to App Store Connect

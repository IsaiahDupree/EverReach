# EverReach App Store Screenshots — Visual Spec

> This is the spec, not the code. It describes what each screen should *feel* like.
> Claude should read this before writing any Remotion TSX. Do NOT put pixel positions,
> frame numbers, or component props here — those belong in the code, not the spec.

---

## Brand Philosophy

EverReach is **calm confidence**. It is not a hustle tool. It is the quiet advantage
that serious people use. Every screen should feel like something you'd see in a well-designed
fintech or productivity app — premium, minimal, nothing wasted.

The goal of the screenshots is not to show features. It is to make the viewer feel like
they are missing out on something obvious and powerful.

**Tone:** Understated. Direct. Slightly aspirational.
**Never:** Cluttered. Exclamatory. Over-explained.

---

## Visual Language

- **Background:** Pure near-black. One subtle radial glow — no more.
- **Accent:** A single accent color per screen. It should feel like a signal, not decoration.
- **Typography:** Large, confident headlines. Small, quiet subtext. Maximum two type sizes per screen.
- **Whitespace:** Generous. If in doubt, remove an element.
- **Phone frame:** One clean phone mockup. Centered. No shadows fighting the glow.
- **Badges:** One small pill badge at the top. Uppercase. No border, just a muted fill.

**What to remove vs. what we currently have:**
- Remove the 3-phone cascade for screenshots (keep for preview video only)
- Remove the bottom CTA button from most screens (it adds noise — the CTA is screen 1 only)
- Remove the footer text from screens 2-4
- Reduce the number of stat items — 2 max, not 3
- One headline, one sub, done. No bullet lists on screens 2-4.

---

## The 5 Screens — Founder Angle

### Screen 1 — Hook
**What it should feel like:** The first thing someone sees. It should stop the scroll.
The headline is the whole message. Everything else supports it.

- Headline: "Your network is your pipeline."
- Sub: "Know who to reach out to, what to say, and when."
- Badge: "FREE TO START"
- CTA button: Yes — this is the only screen with a CTA button
- Proof line: Stars + "Loved by founders"
- Phone: Show the main contact list with warmth scores visible
- Glow: Subtle amber glow behind the phone — warmth metaphor

---

### Screen 2 — Problem/Solution
**What it should feel like:** A moment of recognition. "That's me."
One clean insight. No explanation needed.

- Badge: "WHO TO REACH"
- Headline: "See who's going cold before it's too late."
- Sub: "Warmth Score ranks every contact automatically."
- Phone: Show the warmth score view — the gradient bar is the hero
- No CTA. No footer. Just the headline and the screen.
- Glow: Cool blue — data, clarity

---

### Screen 3 — Magic Moment
**What it should feel like:** Effortless. Like watching a problem dissolve.
The user should think "wait, it does that?"

- Badge: "WHAT TO SAY"
- Headline: "Write in 10 seconds."
- Sub: "AI composes from your full relationship history."
- Phone: Show the compose screen mid-generation — text appearing
- No CTA. No footer.
- Glow: Accent glow — the moment of creation

---

### Screen 4 — Trust Signal
**What it should feel like:** Reassurance. You're in control. It's not sending anything without you.
Simple. Almost quiet.

- Badge: "WHEN TO REACH"
- Headline: "Never miss the right moment."
- Sub: "Smart reminders. Zero auto-sends."
- Phone: Show the reminder/notification view
- No CTA. No footer.
- Glow: None. Let this screen breathe. Plain dark background.

---

### Screen 5 — Close
**What it should feel like:** The decision screen. Everything distilled.
Two social proof quotes. One CTA. Done.

- Stars + rating line: "Built for founders. Early access."
- Headline: "The unfair advantage in every room."
- Two quotes (short — one sentence each)
- One trust row: "Zero auto-sends · You review every message · Cancel anytime"
- CTA button: "Start Free — Outperform Your Network"
- Footer: "everreach.app · iPhone & iPad"

---

## What Good Looks Like

A good screenshot set passes the **blur test**: if you blur your eyes so you can't
read the text, the composition should still look clean and intentional. The phone,
the glow, and the headline should form a clear visual hierarchy even blurred.

A bad screenshot set fails the blur test because there is too much going on —
multiple competing elements, inconsistent weight, no clear focal point.

---

## Render Settings

- Dimensions: 1320 × 2868 (iPhone 6.9" — Pro Max)
- Format: PNG, no compression artifacts
- Font: SF Pro Display (loaded via @remotion/google-fonts or staticFile)
- Background: #080808 or #0a0a0f — not pure black, just off-black
- Each screen is a `<Still>` composition, not a frame extract from a video

---

## What NOT to Do

- Do not add drop shadows to text
- Do not use more than one glow per screen
- Do not add borders around the phone frame
- Do not use gradient text (it reads as try-hard)
- Do not repeat the app logo on every screen — it's on screen 1 and screen 5 only
- Do not write more than 12 words in the sub headline
- Do not show more than one phone per screenshot screen

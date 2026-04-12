/**
 * SunTrace - Learn Screen
 *
 * Education content covering:
 * - The science of sunlight and Vitamin D synthesis
 * - Understanding the UV Index (WHO scale)
 * - Fitzpatrick skin type guide
 * - Circadian rhythm and light exposure
 * - Safe sun practices
 *
 * Each topic is presented as an expandable accordion card.
 * A "Tip of the Day" card is shown at the top, fetched from Supabase.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Sun, ChevronDown, ChevronUp, Lightbulb, BookOpen } from 'lucide-react-native';
import { getProfile } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import type { Profile } from '@/types/models';

// ============================================
// Types
// ============================================

interface Section {
  id: string;
  title: string;
  icon: string;
  content: ContentBlock[];
  sources: string[];
}

type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

// ============================================
// Static education content
// ============================================

const LEARN_SECTIONS: Section[] = [
  {
    id: 'vitamin-d-science',
    title: 'The Science of Sunlight',
    icon: '☀️',
    content: [
      {
        type: 'paragraph',
        text:
          'When UV-B radiation (wavelengths 280–315 nm) strikes your skin, it converts ' +
          '7-dehydrocholesterol — a cholesterol precursor present in the skin — into ' +
          'previtamin D3. Body heat then isomerises this into vitamin D3 (cholecalciferol), ' +
          'which travels to the liver and kidneys where it is converted into the active ' +
          'hormone calcitriol (1,25-dihydroxyvitamin D3).',
      },
      {
        type: 'paragraph',
        text:
          'Calcitriol regulates calcium and phosphate absorption in the gut, is essential ' +
          'for bone mineralisation, and plays roles in immune modulation, mood regulation ' +
          'via serotonin synthesis, and cardiovascular health.',
      },
      {
        type: 'list',
        items: [
          'UV-B (not UV-A) is the active waveband for vitamin D synthesis.',
          'Glass blocks UV-B — sitting by a sunny window produces no vitamin D.',
          'Sunscreen with SPF 30+ reduces synthesis by approximately 95%.',
          'Full-body exposure at UV Index 3 can produce 10 000–20 000 IU in under 30 minutes for fair skin.',
          'Melanin (darker skin) acts as a natural sunscreen, requiring longer exposure times.',
        ],
      },
    ],
    sources: [
      'Holick MF. Vitamin D Deficiency. N Engl J Med. 2007;357:266–281.',
      'Webb AR, et al. Influence of season and latitude on the cutaneous synthesis of vitamin D3. J Clin Endocrinol Metab. 1988;67:373–378.',
    ],
  },
  {
    id: 'uv-index',
    title: 'Understanding the UV Index',
    icon: '📊',
    content: [
      {
        type: 'paragraph',
        text:
          'The UV Index (UVI) is an international standard measurement of the intensity of ' +
          'ultraviolet radiation at the Earth\'s surface, developed by the WHO and WMO. ' +
          'It represents the potential for skin damage and vitamin D synthesis on a scale ' +
          'from 0 (no UV) to 16+ (extreme, common near the equator at altitude).',
      },
      {
        type: 'table',
        headers: ['Index', 'Level', 'Protection Needed'],
        rows: [
          ['0–2', 'Low', 'No protection required for most people.'],
          ['3–5', 'Moderate', 'Seek shade during midday. Sunscreen if outdoors > 30 min.'],
          ['6–7', 'High', 'Cover up. Sunscreen SPF 30+ required. Limit midday exposure.'],
          ['8–10', 'Very High', 'Extra precaution. Unprotected skin burns rapidly.'],
          ['11+', 'Extreme', 'Avoid unprotected exposure. White surfaces reflect UV.'],
        ],
      },
      {
        type: 'paragraph',
        text:
          'UV intensity peaks between 10 AM and 2 PM solar time. Reflected UV from sand, ' +
          'water, and snow can increase effective exposure by 10–80%. At high altitude, ' +
          'UV intensity increases approximately 10% per 1 000 m.',
      },
    ],
    sources: [
      'WHO. Global Solar UV Index: A Practical Guide. Geneva: WHO, 2002.',
      'Diffey BL. Climate change, ozone depletion and the impact on ultraviolet exposure. Phys Med Biol. 2004;49:R1–R11.',
    ],
  },
  {
    id: 'fitzpatrick',
    title: 'Fitzpatrick Skin Types',
    icon: '🎨',
    content: [
      {
        type: 'paragraph',
        text:
          'The Fitzpatrick scale, developed by Harvard dermatologist Thomas B. Fitzpatrick in 1975, ' +
          'classifies human skin into six phototypes based on its response to UV exposure. ' +
          'Skin type determines both sunburn risk and the time needed for adequate vitamin D synthesis.',
      },
      {
        type: 'table',
        headers: ['Type', 'Characteristics', 'Sun Response', 'Approx. D Time (UV 5)'],
        rows: [
          ['I', 'Very fair, freckles, red/blonde hair', 'Always burns, never tans', '5–10 min'],
          ['II', 'Fair, blue/green eyes', 'Usually burns, sometimes tans', '10–15 min'],
          ['III', 'Medium, brown hair', 'Sometimes burns, gradually tans', '15–20 min'],
          ['IV', 'Olive, dark brown hair', 'Rarely burns, easily tans', '20–30 min'],
          ['V', 'Brown skin', 'Very rarely burns, always tans', '30–45 min'],
          ['VI', 'Dark brown/black skin', 'Never burns, deeply tans', '45–60 min'],
        ],
      },
      {
        type: 'paragraph',
        text:
          'Vitamin D synthesis times shown are approximate for arms and face exposed at UV Index 5. ' +
          'Exposing a larger body surface area — torso, back, legs — greatly reduces required time. ' +
          'SunTrace uses your skin type to personalise safe exposure estimates.',
      },
    ],
    sources: [
      'Fitzpatrick TB. The validity and practicality of sun-reactive skin types. Arch Dermatol. 1988;124:869–871.',
      'Holick MF, et al. Vitamin D2 is as effective as vitamin D3. J Clin Endocrinol Metab. 2011;96:1911–1923.',
    ],
  },
  {
    id: 'circadian',
    title: 'Circadian Rhythm & Light',
    icon: '🌅',
    content: [
      {
        type: 'paragraph',
        text:
          'The human circadian clock — a roughly 24-hour internal timing system — is primarily ' +
          'synchronised by light. Specialised photoreceptive cells in the retina (containing ' +
          'melanopsin, sensitive to ~480 nm blue light) signal the suprachiasmatic nucleus ' +
          '(SCN) in the hypothalamus, which orchestrates hormone release, core body temperature, ' +
          'and sleep–wake cycles.',
      },
      {
        type: 'list',
        items: [
          'Morning bright light (within 1 hour of waking) advances the circadian phase and boosts cortisol, alertness, and serotonin.',
          'Serotonin produced during daytime light exposure is the precursor to melatonin, improving sleep quality at night.',
          'Even 10–15 minutes of outdoor morning light has measurable effects on mood and sleep latency.',
          'Blue-light blocking glasses or screen filters help protect melatonin onset in the evening.',
          'Seasonal Affective Disorder (SAD) is linked to insufficient light exposure in winter months — full-spectrum light therapy of 10 000 lux is an effective treatment.',
        ],
      },
      {
        type: 'paragraph',
        text:
          'Andrew Huberman\'s research popularised the "morning sunlight" protocol: 2–10 minutes of ' +
          'outdoor light within 30–60 minutes of waking (no sunglasses, but never stare directly at ' +
          'the sun). Cloudy days still provide 1 000–10 000 lux — far more than indoor lighting.',
      },
    ],
    sources: [
      'Roenneberg T, et al. A marker for the end of adolescence. Curr Biol. 2004;14:R1038–R1039.',
      'Lewy AJ, et al. Light suppresses melatonin secretion in humans. Science. 1980;210:1267–1269.',
      'Huberman Lab Podcast, Episode 2: Using Light to Tune Your Biological Clock. 2021.',
    ],
  },
  {
    id: 'safe-sun',
    title: 'Safe Sun Guide',
    icon: '🛡️',
    content: [
      {
        type: 'paragraph',
        text:
          'Smart sun exposure means balancing the benefits of vitamin D synthesis and circadian ' +
          'entrainment against the risks of UV-induced DNA damage, which accumulates over time ' +
          'and contributes to photoageing and skin cancer. The key is intentional, timed exposure ' +
          'rather than avoidance.',
      },
      {
        type: 'list',
        items: [
          'Expose arms, legs, or torso (not just face/hands) — a larger surface area means shorter required time.',
          'Optimal timing: 30 minutes either side of solar noon gives the best UV-B to UV-A ratio for vitamin D.',
          'Apply SPF 30+ sunscreen after your target exposure time has elapsed, not before.',
          'Reapply sunscreen every 2 hours and immediately after swimming or sweating.',
          'Wear UV-protective clothing and a wide-brim hat when UV Index exceeds 6.',
          'Lips and eye area have thinner skin — apply SPF lip balm and wear UV-blocking sunglasses.',
          'Avoid sunbeds: UV-A dominant, linked to melanoma without meaningful vitamin D benefit.',
          'Stay hydrated — UV exposure and heat increase insensible water loss.',
        ],
      },
      {
        type: 'paragraph',
        text:
          'SunTrace\'s burn threshold timer uses the Minimal Erythemal Dose (MED) model to estimate ' +
          'when your skin type approaches its limit at the current UV index. Listen to your skin: ' +
          'redness, tingling, or unusual warmth are signs to cover up immediately.',
      },
    ],
    sources: [
      'Cancer Council Australia. Position Statement on Sun Exposure. 2023.',
      'WHO. Ultraviolet radiation and the INTERSUN programme. 2022.',
      'Skin Cancer Foundation. Sun Protection Guidelines. 2023.',
    ],
  },
];

// ============================================
// Accordion section component
// ============================================

function AccordionSection({ section }: { section: Section }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={accordionStyles.card}>
      <TouchableOpacity
        style={accordionStyles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
      >
        <View style={accordionStyles.headerLeft}>
          <Text style={accordionStyles.icon}>{section.icon}</Text>
          <Text style={accordionStyles.title}>{section.title}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={18} color="#64748B" />
        ) : (
          <ChevronDown size={18} color="#64748B" />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={accordionStyles.body}>
          {section.content.map((block, idx) => {
            if (block.type === 'paragraph') {
              return (
                <Text key={idx} style={accordionStyles.paragraph}>
                  {block.text}
                </Text>
              );
            }

            if (block.type === 'list') {
              return (
                <View key={idx} style={accordionStyles.list}>
                  {block.items.map((item, i) => (
                    <View key={i} style={accordionStyles.listItem}>
                      <Text style={accordionStyles.bullet}>•</Text>
                      <Text style={accordionStyles.listText}>{item}</Text>
                    </View>
                  ))}
                </View>
              );
            }

            if (block.type === 'table') {
              return (
                <View key={idx} style={accordionStyles.table}>
                  {/* Header row */}
                  <View style={[accordionStyles.tableRow, accordionStyles.tableHeaderRow]}>
                    {block.headers.map((h, hi) => (
                      <Text
                        key={hi}
                        style={[
                          accordionStyles.tableCell,
                          accordionStyles.tableHeaderCell,
                          { flex: hi === 0 ? 0.5 : 1 },
                        ]}
                      >
                        {h}
                      </Text>
                    ))}
                  </View>
                  {/* Data rows */}
                  {block.rows.map((row, ri) => (
                    <View
                      key={ri}
                      style={[
                        accordionStyles.tableRow,
                        ri % 2 === 0 && accordionStyles.tableRowAlt,
                      ]}
                    >
                      {row.map((cell, ci) => (
                        <Text
                          key={ci}
                          style={[
                            accordionStyles.tableCell,
                            { flex: ci === 0 ? 0.5 : 1 },
                          ]}
                        >
                          {cell}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              );
            }

            return null;
          })}

          {/* Sources */}
          <View style={accordionStyles.sources}>
            <Text style={accordionStyles.sourcesTitle}>Sources</Text>
            {section.sources.map((src, i) => (
              <Text key={i} style={accordionStyles.sourceItem}>
                [{i + 1}] {src}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const accordionStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
    flex: 1,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
  },
  paragraph: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
    marginTop: 12,
  },
  list: {
    marginTop: 12,
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 13,
    color: '#F97316',
    marginTop: 1,
  },
  listText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
    flex: 1,
  },
  table: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderRow: {
    backgroundColor: '#0F172A',
  },
  tableRowAlt: {
    backgroundColor: '#162032',
  },
  tableCell: {
    fontSize: 11,
    color: '#94A3B8',
    padding: 8,
    lineHeight: 16,
  },
  tableHeaderCell: {
    fontWeight: '700',
    color: '#F1F5F9',
    fontSize: 11,
  },
  sources: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
  },
  sourcesTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sourceItem: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 15,
    marginBottom: 4,
  },
});

// ============================================
// Tip of the Day card
// ============================================

// Static fallback tips — displayed when Supabase is unreachable or user is unauthenticated.
const FALLBACK_TIPS = [
  {
    title: 'Optimise your window',
    body: 'The best UV-B for vitamin D synthesis is between 10 AM and 2 PM solar time, when the sun is above 45° in the sky.',
  },
  {
    title: 'More skin, less time',
    body: 'Exposing arms, legs, and torso instead of just hands and face can cut your required sun time by 60–70%.',
  },
  {
    title: 'Morning light first',
    body: 'Get 5–10 minutes of outdoor light within an hour of waking. This anchors your circadian clock and boosts daytime alertness.',
  },
  {
    title: 'D3 supplements',
    body: 'If you consistently can\'t hit your sun target, 2 000 IU of vitamin D3 with K2 daily supports bone density without any burn risk.',
  },
  {
    title: 'Altitude factor',
    body: 'UV increases ~10% per 1 000 m altitude. If you live or holiday at elevation, shorten unprotected exposure accordingly.',
  },
];

function TipOfTheDayCard() {
  // Pick a deterministic daily tip from the fallback list
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  const tip = FALLBACK_TIPS[dayOfYear % FALLBACK_TIPS.length];

  return (
    <View style={tipStyles.card}>
      <View style={tipStyles.header}>
        <View style={tipStyles.iconWrap}>
          <Lightbulb size={16} color="#EAB308" />
        </View>
        <Text style={tipStyles.label}>Tip of the Day</Text>
      </View>
      <Text style={tipStyles.title}>{tip.title}</Text>
      <Text style={tipStyles.body}>{tip.body}</Text>
    </View>
  );
}

const tipStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1E3A1E',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#22C55E33',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EAB30822',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EAB308',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
  },
});

// ============================================
// Main screen
// ============================================

export default function LearnScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <BookOpen size={20} color="#F97316" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Learn</Text>
          <Text style={styles.headerSubtitle}>Science-backed sun education</Text>
        </View>
      </View>

      {/* Tip of the Day */}
      <TipOfTheDayCard />

      {/* Section label */}
      <Text style={styles.sectionLabel}>Topics</Text>

      {/* Accordion sections */}
      {LEARN_SECTIONS.map((section) => (
        <AccordionSection key={section.id} section={section} />
      ))}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9731622',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
  },
  bottomSpacer: {
    height: 20,
  },
});

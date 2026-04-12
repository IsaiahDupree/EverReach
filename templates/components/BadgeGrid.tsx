/**
 * BadgeGrid
 *
 * Renders earned and locked badges in a 3-column grid.
 *
 * Earned badges:
 *   - Coloured icon (emoji from badge.icon field) + badge name
 *   - Tap to see unlock date in a small tooltip/modal
 *
 * Locked badges:
 *   - Greyed out icon + name
 *   - Lock icon overlay
 *
 * Props:
 *   badges   Array of { badge: Badge, earned: boolean, earned_at?: string }
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Lock, X } from 'lucide-react-native';
import { Badge } from '@/types/models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BadgeEntry {
  badge: Badge;
  earned: boolean;
  earned_at?: string;
}

interface BadgeGridProps {
  badges: BadgeEntry[];
}

interface TooltipState {
  badge: Badge;
  earned_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Badge Cell
// ---------------------------------------------------------------------------

function BadgeCell({
  entry,
  onPressEarned,
}: {
  entry: BadgeEntry;
  onPressEarned: (entry: BadgeEntry) => void;
}) {
  const { badge, earned } = entry;

  return (
    <TouchableOpacity
      style={[styles.cell, earned ? styles.cellEarned : styles.cellLocked]}
      onPress={() => earned && onPressEarned(entry)}
      activeOpacity={earned ? 0.7 : 1}
      disabled={!earned}
      accessibilityLabel={`${badge.name} badge${earned ? ' (earned)' : ' (locked)'}`}
    >
      {/* Badge icon */}
      <View style={[styles.iconContainer, !earned && styles.iconContainerLocked]}>
        <Text style={[styles.iconText, !earned && styles.iconTextLocked]}>
          {badge.icon}
        </Text>

        {/* Lock overlay for unearned badges */}
        {!earned && (
          <View style={styles.lockOverlay}>
            <Lock size={12} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Badge name */}
      <Text
        style={[styles.badgeName, !earned && styles.badgeNameLocked]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function BadgeGrid({ badges }: BadgeGridProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  function handlePressEarned(entry: BadgeEntry) {
    if (entry.earned_at) {
      setTooltip({ badge: entry.badge, earned_at: entry.earned_at });
    }
  }

  return (
    <>
      {/* Grid */}
      <View style={styles.grid}>
        {badges.map((entry) => (
          <BadgeCell
            key={entry.badge.id}
            entry={entry}
            onPressEarned={handlePressEarned}
          />
        ))}
        {/* Fill empty cells to maintain 3-column layout */}
        {badges.length % 3 !== 0 &&
          Array.from({ length: 3 - (badges.length % 3) }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.cellPlaceholder} />
          ))}
      </View>

      {/* Unlock date modal */}
      <Modal
        visible={tooltip !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTooltip(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setTooltip(null)}>
          {tooltip && (
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setTooltip(null)}
                hitSlop={8}
              >
                <X size={16} color="#6B7280" />
              </TouchableOpacity>

              <Text style={styles.modalIcon}>{tooltip.badge.icon}</Text>
              <Text style={styles.modalBadgeName}>{tooltip.badge.name}</Text>
              <Text style={styles.modalDescription}>{tooltip.badge.description}</Text>
              <View style={styles.modalDivider} />
              <Text style={styles.modalUnlocked}>
                Unlocked {formatDate(tooltip.earned_at)}
              </Text>
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    width: '30%',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    gap: 6,
  },
  cellEarned: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  cellLocked: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cellPlaceholder: {
    width: '30%',
  },
  iconContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerLocked: {
    backgroundColor: '#E5E7EB',
  },
  iconText: {
    fontSize: 22,
  },
  iconTextLocked: {
    opacity: 0.35,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeNameLocked: {
    color: '#9CA3AF',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  modalBadgeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  modalUnlocked: {
    fontSize: 13,
    color: '#F97316',
    fontWeight: '600',
  },
});

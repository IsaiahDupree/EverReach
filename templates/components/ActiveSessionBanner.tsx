/**
 * SunTrace — ActiveSessionBanner
 *
 * Fixed-to-bottom banner shown when a sun session is in progress.
 * Reads state from sessionStore — no props required.
 * Tapping navigates to the session tab.
 * Shows elapsed time, IU accumulated, and a stop button.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sun, Zap, Square } from 'lucide-react-native';
import { useSessionStore } from '@/store/sessionStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ActiveSessionBanner() {
  const router = useRouter();
  const { session, stopSession } = useSessionStore();
  const [elapsed, setElapsed] = useState(0);

  // Tick elapsed time locally so we don't need a store counter
  useEffect(() => {
    if (!session.isActive || session.startTime === null) {
      setElapsed(0);
      return;
    }

    // Sync to current elapsed on mount / session resume
    const sync = () => {
      const seconds = Math.floor((Date.now() - session.startTime!.getTime()) / 1000);
      setElapsed(seconds);
    };

    sync();
    const interval = setInterval(sync, 1000);
    return () => clearInterval(interval);
  }, [session.isActive, session.startTime]);

  if (!session.isActive) {
    return null;
  }

  const handleStop = () => {
    stopSession();
  };

  const handleTap = () => {
    router.push('/(tabs)/session');
  };

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={handleTap}
      activeOpacity={0.85}
      testID="active-session-banner"
    >
      {/* Left: sun icon + UV */}
      <View style={styles.uvPill}>
        <Sun size={14} color="#F97316" />
        <Text style={styles.uvText}>UV {session.currentUV.toFixed(1)}</Text>
      </View>

      {/* Center: elapsed time */}
      <View style={styles.center}>
        <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>
        <View style={styles.iuRow}>
          <Zap size={11} color="#F97316" />
          <Text style={styles.iuText}>{Math.round(session.dEarned)} IU</Text>
        </View>
      </View>

      {/* Right: stop button */}
      <TouchableOpacity
        style={styles.stopButton}
        onPress={handleStop}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID="stop-session-button"
      >
        <Square size={14} color="white" fill="white" />
        <Text style={styles.stopText}>Stop</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default ActiveSessionBanner;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 16,
    right: 16,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  uvPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9731622',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  uvText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  elapsed: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: 1,
  },
  iuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  iuText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F97316',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  stopText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },
});

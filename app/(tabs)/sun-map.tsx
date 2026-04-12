import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { MapPin, Navigation, Plus } from 'lucide-react-native';
import { getAllSpots, getNearbySpots, submitSpot } from '@/services/suntraceApi';
import { fetchUVForecast } from '@/services/openMeteo';
import { getUVCategory } from '@/services/uvCalculations';
import { SUNTRACE_COLORS } from '@/constants/suntrace';
import { SunSpot } from '@/types/suntrace';
import { useSubscription } from '@/hooks/useSubscription';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SunMapScreen() {
  const { isPro } = useSubscription();
  const [spots, setSpots] = useState<SunSpot[]>([]);
  const [nearbySpots, setNearbySpots] = useState<SunSpot[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [spotUVMap, setSpotUVMap] = useState<Record<string, number>>({});
  const [selectedSpot, setSelectedSpot] = useState<SunSpot | null>(null);

  const loadData = useCallback(async () => {
    // Get location
    let lat = 40.7128, lon = -74.006;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
        setUserLocation({ lat, lon });
      }
    } catch {}

    // Load all spots + nearby
    const [all, nearby] = await Promise.all([
      getAllSpots(),
      getNearbySpots(lat, lon, 10),
    ]);
    setSpots(all);
    setNearbySpots(nearby);

    // Fetch current UV for a sample of spots (to avoid too many API calls)
    // Use a regional UV for nearby spots based on user's location
    try {
      const fc = await fetchUVForecast(lat, lon, 1);
      const currentUV = fc.current_uv;
      // Apply same UV to nearby spots (they share similar location)
      const uvMap: Record<string, number> = {};
      for (const spot of nearby) {
        uvMap[spot.id] = currentUV; // Regional UV proxy
      }
      setSpotUVMap(uvMap);
    } catch {}
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  function SpotRow({ spot }: { spot: SunSpot }) {
    const uv = spotUVMap[spot.id] ?? null;
    const uvCat = uv !== null ? getUVCategory(uv) : null;
    const isSelected = selectedSpot?.id === spot.id;
    const typeEmoji: Record<string, string> = {
      park: '🌿', beach: '🏖️', rooftop: '🏙️',
      garden: '🌸', trail: '🥾', plaza: '⛲',
    };
    return (
      <TouchableOpacity
        style={[styles.spotRow, isSelected && styles.spotRowSelected]}
        onPress={() => setSelectedSpot(isSelected ? null : spot)}
      >
        <Text style={styles.spotEmoji}>{typeEmoji[spot.spot_type] ?? '📍'}</Text>
        <View style={styles.spotInfo}>
          <Text style={styles.spotName}>{spot.name}</Text>
          <Text style={styles.spotLocation}>{spot.city}, {spot.state}</Text>
          {spot.description && isSelected && (
            <Text style={styles.spotDesc}>{spot.description}</Text>
          )}
        </View>
        <View style={styles.spotRight}>
          {uv !== null && uvCat && (
            <View style={[styles.uvBadge, { backgroundColor: uvCat.color + '22' }]}>
              <Text style={[styles.uvBadgeText, { color: uvCat.color }]}>UV {uv.toFixed(1)}</Text>
            </View>
          )}
          {spot.is_verified && <Text style={styles.verifiedDot}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sun Spots</Text>
        {isPro && (
          <TouchableOpacity style={styles.addBtn} onPress={() => Alert.alert('Add Spot', 'Submit a new sun spot coming soon.')}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Map placeholder — Mapbox integration requires native module setup */}
      <View style={styles.mapPlaceholder}>
        <MapPin size={40} color={SUNTRACE_COLORS.primary} />
        <Text style={styles.mapPlaceholderTitle}>Interactive Map</Text>
        <Text style={styles.mapPlaceholderText}>
          {spots.length} sun spots across the US
        </Text>
        {userLocation && (
          <View style={styles.locationRow}>
            <Navigation size={14} color={SUNTRACE_COLORS.accent} />
            <Text style={styles.locationText}>
              {userLocation.lat.toFixed(3)}, {userLocation.lon.toFixed(3)}
            </Text>
          </View>
        )}
      </View>

      {/* Nearby spots */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {nearbySpots.length > 0
            ? `${nearbySpots.length} Nearby Spots`
            : 'All Sun Spots'}
        </Text>
      </View>

      <FlatList
        data={nearbySpots.length > 0 ? nearbySpots : spots}
        keyExtractor={s => s.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SUNTRACE_COLORS.primary} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <SpotRow spot={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>No spots found</Text>
            <Text style={styles.emptySubtitle}>Enable location to see nearby sun spots.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SUNTRACE_COLORS.bgDark },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: SUNTRACE_COLORS.textPrimary },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: SUNTRACE_COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: SUNTRACE_COLORS.bgCard,
    marginHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SUNTRACE_COLORS.primary + '33',
    borderStyle: 'dashed',
  },
  mapPlaceholderTitle: { fontSize: 16, fontWeight: '700', color: SUNTRACE_COLORS.textPrimary },
  mapPlaceholderText: { fontSize: 13, color: SUNTRACE_COLORS.textSecondary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: SUNTRACE_COLORS.accent },
  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: SUNTRACE_COLORS.textPrimary },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SUNTRACE_COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  spotRowSelected: { borderColor: SUNTRACE_COLORS.primary },
  spotEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  spotInfo: { flex: 1 },
  spotName: { fontSize: 15, fontWeight: '600', color: SUNTRACE_COLORS.textPrimary },
  spotLocation: { fontSize: 12, color: SUNTRACE_COLORS.textSecondary, marginTop: 2 },
  spotDesc: { fontSize: 12, color: SUNTRACE_COLORS.textSecondary, marginTop: 6, lineHeight: 17 },
  spotRight: { alignItems: 'flex-end', gap: 4 },
  uvBadge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  uvBadgeText: { fontSize: 11, fontWeight: '700' },
  verifiedDot: { fontSize: 12, color: SUNTRACE_COLORS.accent },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: SUNTRACE_COLORS.textPrimary },
  emptySubtitle: { fontSize: 14, color: SUNTRACE_COLORS.textSecondary, textAlign: 'center' },
});

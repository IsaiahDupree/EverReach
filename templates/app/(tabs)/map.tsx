/**
 * SunTrace - Sun Map Screen
 *
 * Features:
 * - Displays nearby sun spots on a map
 * - User can tap spots to see details (name, avg UV, best time)
 * - Pro users can submit new sun spots
 * - Pulls spots from Supabase with geo filtering
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Sun, Lock, Plus, Star } from 'lucide-react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useSubscription } from '@/hooks/useSubscription';
import { APP_CONFIG } from '@/constants/config';
import type { SunSpot } from '@/types/models';

// ============================================
// Sun Spot card
// ============================================
function SpotCard({
  spot,
  onPress,
}: {
  spot: SunSpot;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={spotStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={spotStyles.iconCol}>
        <View style={spotStyles.iconBg}>
          <Sun size={20} color="#F97316" />
        </View>
      </View>
      <View style={spotStyles.info}>
        <Text style={spotStyles.name}>{spot.name}</Text>
        {spot.city && (
          <View style={spotStyles.locationRow}>
            <MapPin size={11} color="#64748B" />
            <Text style={spotStyles.locationText}>
              {[spot.city, spot.state].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}
        <View style={spotStyles.metaRow}>
          {spot.avg_uv_index != null && (
            <Text style={spotStyles.uvChip}>UV {spot.avg_uv_index.toFixed(1)}</Text>
          )}
          {spot.best_time_start && (
            <Text style={spotStyles.timeChip}>
              Best: {formatSpotTime(spot.best_time_start)}–{formatSpotTime(spot.best_time_end)}
            </Text>
          )}
          {spot.rating != null && (
            <View style={spotStyles.ratingRow}>
              <Star size={11} color="#EAB308" fill="#EAB308" />
              <Text style={spotStyles.ratingText}>{spot.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
      {spot.is_verified && (
        <View style={spotStyles.verifiedBadge}>
          <Text style={spotStyles.verifiedText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function formatSpotTime(timeStr?: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

const spotStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
  },
  iconCol: {},
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F9731611',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#F1F5F9' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  locationText: { fontSize: 12, color: '#64748B' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  uvChip: {
    fontSize: 11,
    color: '#F97316',
    backgroundColor: '#F9731611',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '700',
  },
  timeChip: { fontSize: 11, color: '#64748B' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 11, color: '#EAB308', fontWeight: '600' },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: { fontSize: 11, color: 'white', fontWeight: '800' },
});

// ============================================
// Fetch nearby spots from Supabase
// ============================================
async function fetchNearbySunSpots(
  lat: number,
  lng: number,
  radiusKm = 50
): Promise<SunSpot[]> {
  // Use PostGIS-style bounding box approximation (1 deg ≈ 111 km)
  const delta = radiusKm / 111;

  const { data, error } = await supabase
    .from('sun_spots')
    .select('*')
    .gte('lat', lat - delta)
    .lte('lat', lat + delta)
    .gte('lng', lng - delta)
    .lte('lng', lng + delta)
    .order('rating', { ascending: false })
    .limit(30);

  if (error) throw error;
  return data ?? [];
}

// ============================================
// Main Screen
// ============================================
export default function MapScreen() {
  const router = useRouter();
  const { isPro } = useSubscription();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  const {
    data: spots = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<SunSpot[]>({
    queryKey: ['sun-spots', coords?.lat, coords?.lng],
    queryFn: () =>
      coords
        ? fetchNearbySunSpots(coords.lat, coords.lng)
        : Promise.resolve([]),
    enabled: !!coords,
    staleTime: 1000 * 60 * 10,
  });

  const handleSubmitSpot = () => {
    if (!isPro) {
      router.push('/paywall');
      return;
    }
    // TODO: navigate to spot submission form
    router.push('/submit-spot' as any);
  };

  const handleSpotPress = (spot: SunSpot) => {
    // TODO: navigate to spot detail
    router.push(`/spot/${spot.id}` as any);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sun Spots</Text>
          <Text style={styles.subtitle}>
            {coords ? 'Spots near you' : 'Enable location to find spots'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, !isPro && styles.addBtnLocked]}
          onPress={handleSubmitSpot}
          activeOpacity={0.85}
        >
          {isPro ? (
            <Plus size={18} color="white" />
          ) : (
            <Lock size={14} color="#64748B" />
          )}
          <Text style={[styles.addBtnText, !isPro && styles.addBtnTextLocked]}>
            {isPro ? 'Add Spot' : 'Pro'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location denied notice */}
      {locationDenied && (
        <View style={styles.locationBanner}>
          <MapPin size={16} color="#EAB308" />
          <Text style={styles.locationBannerText}>
            Location permission required to find sun spots near you.
          </Text>
        </View>
      )}

      {/* Map placeholder — replace with MapView when native map is available */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapOverlay}>
          <MapPin size={32} color="#F97316" />
          <Text style={styles.mapNote}>Map view available on device</Text>
          {coords && (
            <Text style={styles.coordsText}>
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </Text>
          )}
        </View>
      </View>

      {/* Spots list */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>
          {spots.length > 0 ? `${spots.length} spots found` : 'Nearby Spots'}
        </Text>
      </View>

      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator color="#F97316" />
          <Text style={styles.loadingText}>Finding spots...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Failed to load spots</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && (
        <ScrollView
          contentContainerStyle={styles.spotsList}
          showsVerticalScrollIndicator={false}
        >
          {spots.length === 0 ? (
            <View style={styles.emptyState}>
              <Sun size={40} color="#334155" />
              <Text style={styles.emptyTitle}>No spots near you yet</Text>
              <Text style={styles.emptySubtitle}>
                {isPro
                  ? 'Be the first to add a sun spot in your area!'
                  : 'Upgrade to Pro to submit sun spots.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={handleSubmitSpot}
              >
                {!isPro && <Lock size={14} color="white" />}
                <Text style={styles.emptyBtnText}>
                  {isPro ? 'Add a Sun Spot' : 'Upgrade to Add Spots'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            spots.map((spot) => (
              <SpotCard
                key={spot.id}
                spot={spot}
                onPress={() => handleSpotPress(spot)}
              />
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#F1F5F9' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 3 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F97316',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  addBtnLocked: { backgroundColor: '#1E293B' },
  addBtnText: { fontSize: 13, fontWeight: '700', color: 'white' },
  addBtnTextLocked: { color: '#64748B' },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAB30811',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  locationBannerText: { fontSize: 13, color: '#EAB308', flex: 1 },
  mapPlaceholder: {
    height: 220,
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  mapOverlay: { alignItems: 'center', gap: 8 },
  mapNote: { fontSize: 13, color: '#64748B' },
  coordsText: { fontSize: 11, color: '#475569', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  listSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  listTitle: { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8 },
  loading: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 14, color: '#64748B' },
  errorState: { padding: 20, alignItems: 'center', gap: 8 },
  errorText: { fontSize: 14, color: '#64748B' },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1E293B', borderRadius: 8 },
  retryText: { color: '#F97316', fontWeight: '600' },
  spotsList: { paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingTop: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#F1F5F9' },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', paddingHorizontal: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: 'white' },
});

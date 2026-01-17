import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import type { UserProfile, MatchCandidate } from '@/types/message';

export default function ConciergeDemo() {
  const [phoneNumber, setPhoneNumber] = useState<string>('+1234567890');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const startOnboardingMutation = trpc.concierge.onboarding.start.useMutation();

  const handleStartOnboarding = async () => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneNumber.match(phoneRegex)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const result = await startOnboardingMutation.mutateAsync({
        phoneE164: phoneNumber,
        platformPref: 'sms'
      });
      
      setProfile(result.profile);
      Alert.alert('Success', result.isExisting ? 'Welcome back!' : 'Profile created!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start onboarding');
    } finally {
      setLoading(false);
    }
  };

  const updateProfileMutation = trpc.concierge.onboarding.updateProfile.useMutation();

  const handleCompleteProfile = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const updatedProfile = await updateProfileMutation.mutateAsync({
        userId: profile.userId,
        bio: 'Tech enthusiast and coffee lover. Building the future one line of code at a time.',
        interests: ['Technology', 'Coffee', 'Startups', 'AI', 'React Native'],
        location: {
          city: 'San Francisco',
          region: 'California',
          country: 'United States'
        },
        timezone: 'America/Los_Angeles',
        onboardingStage: 'complete'
      });
      
      setProfile(updatedProfile);
      Alert.alert('Success', 'Profile completed!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const findMatchesQuery = trpc.concierge.matching.findMatches.useQuery(
    { userId: profile?.userId || '', limit: 5 },
    { enabled: false }
  );

  const handleFindMatches = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const matchResults = await findMatchesQuery.refetch();
      
      if (matchResults.data) {
        setMatches(matchResults.data);
        Alert.alert('Success', `Found ${matchResults.data.length} potential matches!`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to find matches');
    } finally {
      setLoading(false);
    }
  };

  const createIntroMutation = trpc.concierge.matching.createIntro.useMutation();

  const handleSendIntro = async (candidateId: string) => {
    if (!profile) return;

    setLoading(true);
    try {
      const result = await createIntroMutation.mutateAsync({
        requesterId: profile.userId,
        targetAId: profile.userId,
        targetBId: candidateId,
        customMessage: 'Demo introduction from the concierge app!'
      });
      
      Alert.alert('Success', `Intro created! Status: ${result.status}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send intro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'AI Concierge Demo', headerShown: true }} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>AI Texting Concierge</Text>
        <Text style={styles.subtitle}>Demo the matching and intro flow</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Enter Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+1234567890"
            keyboardType="phone-pad"
          />
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleStartOnboarding}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Starting...' : 'Start Onboarding'}
            </Text>
          </TouchableOpacity>
        </View>

        {profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Complete Profile</Text>
            <Text style={styles.profileInfo}>User ID: {profile.userId}</Text>
            <Text style={styles.profileInfo}>Phone: {profile.phoneE164}</Text>
            <Text style={styles.profileInfo}>Stage: {profile.onboardingStage}</Text>
            
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleCompleteProfile}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Updating...' : 'Complete Profile'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {profile && profile.onboardingStage === 'complete' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Find Matches</Text>
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleFindMatches}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Searching...' : 'Find Matches'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {matches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Potential Matches</Text>
            {matches.map((match, index) => (
              <View key={match.userId} style={styles.matchCard}>
                <Text style={styles.matchName}>Match #{index + 1}</Text>
                <Text style={styles.matchScore}>Score: {match.score.toFixed(2)}</Text>
                <Text style={styles.matchReason}>{match.reasoning}</Text>
                
                <TouchableOpacity 
                  style={[styles.smallButton, loading && styles.buttonDisabled]} 
                  onPress={() => handleSendIntro(match.userId)}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Sending...' : 'Send Intro'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.infoText}>
            1. Users onboard via SMS/iMessage with their phone number{"\n"}
            2. They share interests, bio, and location{"\n"}
            3. AI finds compatible matches using embeddings{"\n"}
            4. System creates introductions via preferred messaging platform{"\n"}
            5. Users can accept/decline and start conversations
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  smallButton: {
    backgroundColor: '#34C759',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  profileInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  matchCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  matchScore: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  matchReason: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
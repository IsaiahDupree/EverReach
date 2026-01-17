/**
 * Auth v2 Test Screen
 * Test the new auth system without breaking the main app
 */

import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { AuthProvider, useAuth } from '@/providers/AuthProviderV2';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AppSettingsProvider } from '@/providers/AppSettingsProvider';

function TestContent() {
  const {
    session,
    user,
    loading,
    isAuthenticated,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.text}>Loading auth state...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Auth v2 Test Screen</Text>
      
      <View style={styles.statusBox}>
        <Text style={styles.label}>Status:</Text>
        <Text style={[styles.status, isAuthenticated ? styles.success : styles.error]}>
          {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
        </Text>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.label}>User:</Text>
        <Text style={styles.value}>{user?.email || 'None'}</Text>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.label}>Session:</Text>
        <Text style={styles.value}>{session ? 'Active' : 'None'}</Text>
      </View>

      {isAuthenticated ? (
        <TouchableOpacity style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={signInWithGoogle}
          >
            <Text style={styles.buttonText}>Sign In with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              // Test with dummy credentials
              signInWithEmail('test@example.com', 'password')
                .catch((err: any) => alert(err.message));
            }}
          >
            <Text style={styles.buttonText}>Test Email Sign-In</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.info}>
        <Text style={styles.infoText}>
          This screen uses AuthProvider.v2
        </Text>
        <Text style={styles.infoText}>
          Check console for detailed logs with [Auth v2] prefix
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function AuthV2Test() {
  return (
    <ThemeProvider>
      <AppSettingsProvider>
        <AuthProvider>
          <TestContent />
        </AuthProvider>
      </AppSettingsProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  statusBox: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  status: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  success: {
    color: '#10B981',
  },
  error: {
    color: '#EF4444',
  },
  button: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 5,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

/**
 * Analyzing Loader Component
 * 
 * Shows analysis progress
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function AnalyzingLoader() {
  const fadeAnim1 = useRef(new Animated.Value(0.3)).current;
  const fadeAnim2 = useRef(new Animated.Value(0.3)).current;
  const fadeAnim3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      createPulse(fadeAnim1, 0),
      createPulse(fadeAnim2, 200),
      createPulse(fadeAnim3, 400),
    ]);

    animation.start();

    return () => animation.stop();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>🤖 Assistant</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.mainText}>⏳ Analyzing screenshot...</Text>

        <View style={styles.steps}>
          <Animated.View style={[styles.step, { opacity: fadeAnim1 }]}>
            <Text style={styles.stepText}>• Extracting text (OCR)</Text>
          </Animated.View>

          <Animated.View style={[styles.step, { opacity: fadeAnim2 }]}>
            <Text style={styles.stepText}>• Detecting contacts</Text>
          </Animated.View>

          <Animated.View style={[styles.step, { opacity: fadeAnim3 }]}>
            <Text style={styles.stepText}>• Finding action items</Text>
          </Animated.View>
        </View>

        <Text style={styles.subText}>This may take a few moments...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  header: {
    marginBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
  },
  content: {
    paddingLeft: 8,
  },
  mainText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 16,
  },
  steps: {
    marginLeft: 12,
    marginBottom: 16,
  },
  step: {
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    color: '#6c757d',
  },
  subText: {
    fontSize: 13,
    color: '#adb5bd',
    fontStyle: 'italic',
  },
});

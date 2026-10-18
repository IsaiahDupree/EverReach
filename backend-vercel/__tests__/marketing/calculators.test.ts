/**
 * Marketing Calculators Tests
 * 
 * Tests for:
 * - Intent Calculator
 * - Magnetism Calculator
 */

import { describe, it, expect } from '@jest/globals';
import { calculateMagnetismIndex, calculateMagnetismTrend, predictMagnetism, compareToCohort, MagnetismInputs } from '../../lib/marketing/magnetism-calculator';

describe('Magnetism Calculator', () => {
  describe('calculateMagnetismIndex', () => {
    it('should calculate magnetism index correctly', () => {
      const inputs: MagnetismInputs = {
        intent_score: 75,
        engagement_days_7d: 5,
        engagement_weeks_4w: 3,
        reactivation_count_30d: 6,
        email_opens_30d: 8,
        email_clicks_30d: 4,
        email_sends_30d: 10,
        social_returns_30d: 3,
        trial_started: true,
        purchase_completed: false
      };

      const result = calculateMagnetismIndex(inputs);

      expect(result.index).toBeGreaterThan(0);
      expect(result.index).toBeLessThanOrEqual(100);
      expect(result.band).toBeDefined();
      expect(['cold', 'cooling', 'warm', 'hot']).toContain(result.band);
    });

    it('should return hot band for high engagement', () => {
      const inputs: MagnetismInputs = {
        intent_score: 90,
        engagement_days_7d: 7,
        engagement_weeks_4w: 4,
        reactivation_count_30d: 10,
        email_opens_30d: 15,
        email_clicks_30d: 12,
        email_sends_30d: 15,
        social_returns_30d: 5,
        trial_started: true,
        purchase_completed: true
      };

      const result = calculateMagnetismIndex(inputs);

      expect(result.index).toBeGreaterThanOrEqual(70);
      expect(result.band).toBe('hot');
      expect(result.risk_level).toBe('excellent');
    });

    it('should return cold band for low engagement', () => {
      const inputs: MagnetismInputs = {
        intent_score: 10,
        engagement_days_7d: 0,
        engagement_weeks_4w: 0,
        reactivation_count_30d: 0,
        email_opens_30d: 0,
        email_clicks_30d: 0,
        email_sends_30d: 5,
        social_returns_30d: 0,
        trial_started: false,
        purchase_completed: false
      };

      const result = calculateMagnetismIndex(inputs);

      expect(result.index).toBeLessThan(30);
      expect(result.band).toBe('cold');
      expect(result.risk_level).toBe('high_risk');
    });

    it('should include all 5 components', () => {
      const inputs: MagnetismInputs = {
        intent_score: 50,
        engagement_days_7d: 3,
        engagement_weeks_4w: 2,
        reactivation_count_30d: 4,
        email_opens_30d: 5,
        email_clicks_30d: 2,
        email_sends_30d: 10,
        social_returns_30d: 2,
        trial_started: false,
        purchase_completed: false
      };

      const result = calculateMagnetismIndex(inputs);

      expect(result.components).toBeDefined();
      expect(result.components.intent).toBeGreaterThan(0);
      expect(result.components.engagement).toBeGreaterThan(0);
      expect(result.components.reactivation).toBeGreaterThan(0);
      expect(result.components.email_ctr).toBeGreaterThan(0);
      expect(result.components.social_returns).toBeGreaterThan(0);
    });

    it('should generate recommendations', () => {
      const inputs: MagnetismInputs = {
        intent_score: 30,
        engagement_days_7d: 1,
        engagement_weeks_4w: 1,
        reactivation_count_30d: 1,
        email_opens_30d: 2,
        email_clicks_30d: 0,
        email_sends_30d: 5,
        social_returns_30d: 0,
        trial_started: false,
        purchase_completed: false
      };

      const result = calculateMagnetismIndex(inputs);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate churn risk inversely to magnetism', () => {
      const highEngagementInputs: MagnetismInputs = {
        intent_score: 80,
        engagement_days_7d: 6,
        engagement_weeks_4w: 4,
        reactivation_count_30d: 8,
        email_opens_30d: 10,
        email_clicks_30d: 8,
        email_sends_30d: 10,
        social_returns_30d: 4,
        trial_started: true,
        purchase_completed: true
      };

      const lowEngagementInputs: MagnetismInputs = {
        intent_score: 20,
        engagement_days_7d: 0,
        engagement_weeks_4w: 0,
        reactivation_count_30d: 0,
        email_opens_30d: 0,
        email_clicks_30d: 0,
        email_sends_30d: 5,
        social_returns_30d: 0,
        trial_started: false,
        purchase_completed: false
      };

      const highResult = calculateMagnetismIndex(highEngagementInputs);
      const lowResult = calculateMagnetismIndex(lowEngagementInputs);

      expect(highResult.churn_risk).toBeLessThan(lowResult.churn_risk);
    });

    it('should cap magnetism at 100', () => {
      const maxInputs: MagnetismInputs = {
        intent_score: 100,
        engagement_days_7d: 7,
        engagement_weeks_4w: 4,
        reactivation_count_30d: 20,
        email_opens_30d: 50,
        email_clicks_30d: 50,
        email_sends_30d: 50,
        social_returns_30d: 20,
        trial_started: true,
        purchase_completed: true
      };

      const result = calculateMagnetismIndex(maxInputs);

      expect(result.index).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateMagnetismTrend', () => {
    it('should detect upward trend', () => {
      const trend = calculateMagnetismTrend(70, 50);

      expect(trend.direction).toBe('up');
      expect(trend.change).toBe(20);
      expect(trend.percentage_change).toBeGreaterThan(0);
    });

    it('should detect downward trend', () => {
      const trend = calculateMagnetismTrend(40, 60);

      expect(trend.direction).toBe('down');
      expect(trend.change).toBe(-20);
      expect(trend.percentage_change).toBeLessThan(0);
    });

    it('should detect stable trend for small changes', () => {
      const trend = calculateMagnetismTrend(52, 50);

      expect(trend.direction).toBe('stable');
      expect(Math.abs(trend.change)).toBeLessThan(5);
    });

    it('should calculate velocity correctly', () => {
      const accelerating = calculateMagnetismTrend(80, 50);
      const steady = calculateMagnetismTrend(55, 50);

      expect(accelerating.velocity).toBe('accelerating');
      expect(steady.velocity).toBe('steady');
    });
  });

  describe('predictMagnetism', () => {
    it('should predict future magnetism based on trend', () => {
      const historicalScores = [
        { date: '2025-10-15', score: 50 },
        { date: '2025-10-16', score: 52 },
        { date: '2025-10-17', score: 54 },
        { date: '2025-10-18', score: 56 },
        { date: '2025-10-19', score: 58 }
      ];

      const prediction = predictMagnetism(historicalScores, 7);

      expect(prediction.predicted_score).toBeGreaterThan(58);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.trend).toBe('improving');
    });

    it('should detect declining trend', () => {
      const historicalScores = [
        { date: '2025-10-15', score: 70 },
        { date: '2025-10-16', score: 65 },
        { date: '2025-10-17', score: 60 },
        { date: '2025-10-18', score: 55 },
        { date: '2025-10-19', score: 50 }
      ];

      const prediction = predictMagnetism(historicalScores, 7);

      expect(prediction.trend).toBe('declining');
      expect(prediction.predicted_score).toBeLessThan(50);
    });

    it('should handle insufficient data gracefully', () => {
      const historicalScores = [
        { date: '2025-10-15', score: 50 }
      ];

      const prediction = predictMagnetism(historicalScores, 7);

      expect(prediction.predicted_score).toBe(50);
      expect(prediction.confidence).toBeLessThan(0.5);
    });

    it('should cap predicted score between 0 and 100', () => {
      const historicalScores = [
        { date: '2025-10-15', score: 95 },
        { date: '2025-10-16', score: 97 },
        { date: '2025-10-17', score: 99 }
      ];

      const prediction = predictMagnetism(historicalScores, 30);

      expect(prediction.predicted_score).toBeGreaterThanOrEqual(0);
      expect(prediction.predicted_score).toBeLessThanOrEqual(100);
    });
  });

  describe('compareToCohort', () => {
    it('should calculate percentile correctly', () => {
      const cohortScores = [30, 40, 50, 60, 70, 80, 90];
      const userScore = 70;

      const comparison = compareToCohort(userScore, cohortScores);

      expect(comparison.percentile).toBeGreaterThanOrEqual(0);
      expect(comparison.percentile).toBeLessThanOrEqual(100);
      expect(comparison.above_average).toBe(true);
    });

    it('should identify above average users', () => {
      const cohortScores = [30, 40, 50, 60, 70];
      const userScore = 80;

      const comparison = compareToCohort(userScore, cohortScores);

      expect(comparison.above_average).toBe(true);
      expect(comparison.difference).toBeGreaterThan(0);
    });

    it('should identify below average users', () => {
      const cohortScores = [50, 60, 70, 80, 90];
      const userScore = 40;

      const comparison = compareToCohort(userScore, cohortScores);

      expect(comparison.above_average).toBe(false);
      expect(comparison.difference).toBeLessThan(0);
    });

    it('should handle empty cohort gracefully', () => {
      const comparison = compareToCohort(50, []);

      expect(comparison.percentile).toBe(50);
      expect(comparison.cohort_average).toBe(0);
      expect(comparison.difference).toBe(0);
    });

    it('should calculate cohort average', () => {
      const cohortScores = [40, 50, 60];
      const userScore = 55;

      const comparison = compareToCohort(userScore, cohortScores);

      expect(comparison.cohort_average).toBe(50);
    });
  });
});

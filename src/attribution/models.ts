/**
 * Attribution models for multi-channel marketing attribution
 */

import { Event } from '../types/event';

export type AttributionModel = 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based';

export interface AttributionResult {
  model: AttributionModel;
  touches: Array<{
    event: Event;
    credit: number;
    percentage: number;
  }>;
  totalCredit: number;
  conversionValue?: number;
}

/**
 * First-touch attribution: All credit to first touchpoint
 */
export function firstTouchAttribution(touches: Event[], conversionValue: number = 1): AttributionResult {
  if (touches.length === 0) {
    return {
      model: 'first_touch',
      touches: [],
      totalCredit: 0,
    };
  }

  const firstTouch = touches[0];
  return {
    model: 'first_touch',
    touches: touches.map((touch, idx) => ({
      event: touch,
      credit: idx === 0 ? conversionValue : 0,
      percentage: idx === 0 ? 100 : 0,
    })),
    totalCredit: conversionValue,
    conversionValue,
  };
}

/**
 * Last-touch attribution: All credit to last touchpoint
 */
export function lastTouchAttribution(touches: Event[], conversionValue: number = 1): AttributionResult {
  if (touches.length === 0) {
    return {
      model: 'last_touch',
      touches: [],
      totalCredit: 0,
    };
  }

  const lastIdx = touches.length - 1;
  return {
    model: 'last_touch',
    touches: touches.map((touch, idx) => ({
      event: touch,
      credit: idx === lastIdx ? conversionValue : 0,
      percentage: idx === lastIdx ? 100 : 0,
    })),
    totalCredit: conversionValue,
    conversionValue,
  };
}

/**
 * Linear attribution: Equal credit to all touchpoints
 */
export function linearAttribution(touches: Event[], conversionValue: number = 1): AttributionResult {
  if (touches.length === 0) {
    return {
      model: 'linear',
      touches: [],
      totalCredit: 0,
    };
  }

  const creditPerTouch = conversionValue / touches.length;
  return {
    model: 'linear',
    touches: touches.map((touch) => ({
      event: touch,
      credit: creditPerTouch,
      percentage: (creditPerTouch / conversionValue) * 100,
    })),
    totalCredit: conversionValue,
    conversionValue,
  };
}

/**
 * Time-decay attribution: More credit to recent touchpoints
 */
export function timeDecayAttribution(touches: Event[], conversionValue: number = 1, halfLife: number = 7 * 24 * 60 * 60 * 1000): AttributionResult {
  if (touches.length === 0) {
    return {
      model: 'time_decay',
      touches: [],
      totalCredit: 0,
    };
  }

  const lastTimestamp = touches[touches.length - 1].timestamp;
  const weights = touches.map((touch) => {
    const daysAgo = (lastTimestamp - touch.timestamp) / halfLife;
    return Math.pow(2, -daysAgo); // Exponential decay
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  return {
    model: 'time_decay',
    touches: touches.map((touch, idx) => {
      const credit = (weights[idx] / totalWeight) * conversionValue;
      return {
        event: touch,
        credit,
        percentage: (credit / conversionValue) * 100,
      };
    }),
    totalCredit: conversionValue,
    conversionValue,
  };
}

/**
 * Position-based (U-shaped) attribution: 40% to first, 40% to last, 20% to middle
 */
export function positionBasedAttribution(touches: Event[], conversionValue: number = 1): AttributionResult {
  if (touches.length === 0) {
    return {
      model: 'position_based',
      touches: [],
      totalCredit: 0,
    };
  }

  if (touches.length === 1) {
    return {
      model: 'position_based',
      touches: [
        {
          event: touches[0],
          credit: conversionValue,
          percentage: 100,
        },
      ],
      totalCredit: conversionValue,
      conversionValue,
    };
  }

  if (touches.length === 2) {
    return {
      model: 'position_based',
      touches: touches.map((touch, idx) => ({
        event: touch,
        credit: conversionValue / 2,
        percentage: 50,
      })),
      totalCredit: conversionValue,
      conversionValue,
    };
  }

  const firstCredit = conversionValue * 0.4;
  const lastCredit = conversionValue * 0.4;
  const middleCredit = conversionValue * 0.2;
  const middleCount = touches.length - 2;
  const creditPerMiddle = middleCredit / middleCount;

  return {
    model: 'position_based',
    touches: touches.map((touch, idx) => {
      let credit = 0;
      let percentage = 0;

      if (idx === 0) {
        credit = firstCredit;
        percentage = 40;
      } else if (idx === touches.length - 1) {
        credit = lastCredit;
        percentage = 40;
      } else {
        credit = creditPerMiddle;
        percentage = (creditPerMiddle / conversionValue) * 100;
      }

      return {
        event: touch,
        credit,
        percentage,
      };
    }),
    totalCredit: conversionValue,
    conversionValue,
  };
}

/**
 * Apply attribution model
 */
export function attributeConversion(
  touches: Event[],
  model: AttributionModel,
  conversionValue: number = 1
): AttributionResult {
  switch (model) {
    case 'first_touch':
      return firstTouchAttribution(touches, conversionValue);
    case 'last_touch':
      return lastTouchAttribution(touches, conversionValue);
    case 'linear':
      return linearAttribution(touches, conversionValue);
    case 'time_decay':
      return timeDecayAttribution(touches, conversionValue);
    case 'position_based':
      return positionBasedAttribution(touches, conversionValue);
    default:
      return lastTouchAttribution(touches, conversionValue);
  }
}

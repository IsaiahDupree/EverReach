export interface WarmthColorScheme {
  background: string;
  text: string;
  border: string;
  gradient: [string, string];
}

export function getWarmthColor(score: number): string {
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  if (normalizedScore <= 20) {
    return '#B91C1C';
  } else if (normalizedScore <= 40) {
    return '#DC2626';
  } else if (normalizedScore <= 60) {
    return '#F59E0B';
  } else if (normalizedScore <= 80) {
    return '#10B981';
  } else {
    return '#059669';
  }
}

export function getWarmthColorScheme(score: number): WarmthColorScheme {
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  if (normalizedScore <= 20) {
    return {
      background: '#FEE2E2',
      text: '#991B1B',
      border: '#FCA5A5',
      gradient: ['#FEE2E2', '#FECACA'],
    };
  } else if (normalizedScore <= 40) {
    return {
      background: '#FED7AA',
      text: '#9A3412',
      border: '#FDBA74',
      gradient: ['#FED7AA', '#FED7AA'],
    };
  } else if (normalizedScore <= 60) {
    return {
      background: '#FEF3C7',
      text: '#92400E',
      border: '#FDE68A',
      gradient: ['#FEF3C7', '#FDE047'],
    };
  } else if (normalizedScore <= 80) {
    return {
      background: '#D1FAE5',
      text: '#065F46',
      border: '#6EE7B7',
      gradient: ['#D1FAE5', '#A7F3D0'],
    };
  } else {
    return {
      background: '#A7F3D0',
      text: '#064E3B',
      border: '#34D399',
      gradient: ['#A7F3D0', '#6EE7B7'],
    };
  }
}

export function getWarmthLabel(score: number): string {
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  if (normalizedScore <= 20) {
    return 'Very Cold';
  } else if (normalizedScore <= 40) {
    return 'Cold';
  } else if (normalizedScore <= 60) {
    return 'Neutral';
  } else if (normalizedScore <= 80) {
    return 'Warm';
  } else {
    return 'Very Warm';
  }
}

export const WARMTH_COLORS = {
  veryCold: {
    main: '#B91C1C',
    background: '#FEE2E2',
    text: '#991B1B',
    border: '#FCA5A5',
  },
  cold: {
    main: '#DC2626',
    background: '#FED7AA',
    text: '#9A3412',
    border: '#FDBA74',
  },
  neutral: {
    main: '#F59E0B',
    background: '#FEF3C7',
    text: '#92400E',
    border: '#FDE68A',
  },
  warm: {
    main: '#10B981',
    background: '#D1FAE5',
    text: '#065F46',
    border: '#6EE7B7',
  },
  veryWarm: {
    main: '#059669',
    background: '#A7F3D0',
    text: '#064E3B',
    border: '#34D399',
  },
} as const;

export function getWarmthColorInterpolated(score: number): string {
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  const red = [185, 28, 28];
  const orange = [245, 158, 11];
  const green = [5, 150, 105];
  
  let r: number, g: number, b: number;
  
  if (normalizedScore <= 50) {
    const t = normalizedScore / 50;
    r = Math.round(red[0] + (orange[0] - red[0]) * t);
    g = Math.round(red[1] + (orange[1] - red[1]) * t);
    b = Math.round(red[2] + (orange[2] - red[2]) * t);
  } else {
    const t = (normalizedScore - 50) / 50;
    r = Math.round(orange[0] + (green[0] - orange[0]) * t);
    g = Math.round(orange[1] + (green[1] - orange[1]) * t);
    b = Math.round(orange[2] + (green[2] - orange[2]) * t);
  }
  
  return `rgb(${r}, ${g}, ${b})`;
}

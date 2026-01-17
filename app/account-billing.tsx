import React, { useEffect } from 'react';
import { router } from 'expo-router';

export default function AccountBillingScreen() {
  useEffect(() => {
    // Redirect to subscription-plans which now has all billing info
    router.replace('/subscription-plans');
  }, []);

  return null;
}

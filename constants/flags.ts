import Constants from 'expo-constants';

const envLocalOnly = process.env.EXPO_PUBLIC_LOCAL_ONLY;
const extraLocalOnly = (Constants?.expoConfig as any)?.extra?.LOCAL_ONLY as string | undefined;

export const FLAGS = {
  LOCAL_ONLY: (envLocalOnly ?? extraLocalOnly ?? 'false') === 'true',
};

export const CLOUD_ENABLED = !FLAGS.LOCAL_ONLY;

console.log('🏁 App flags:', FLAGS, {
  envLocalOnly,
  extraLocalOnly,
});
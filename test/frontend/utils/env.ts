export function getApiBase(baseURL: string): string | null {
  if (process.env.TEST_API_BASE && process.env.TEST_API_BASE.trim()) return process.env.TEST_API_BASE.trim();
  if (baseURL && baseURL.includes('localhost:8081')) return baseURL.replace('8081', '3000');
  return null;
}

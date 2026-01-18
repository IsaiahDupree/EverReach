# Testing Guide

## Ensure Your App Works Before Launch

This guide covers testing strategies for React Native apps with Supabase backends.

---

## Testing Strategy Overview

| Test Type | Tool | Coverage |
|-----------|------|----------|
| Unit Tests | Jest + React Native Testing Library | Components, hooks, utils |
| Integration Tests | Jest + MSW | API interactions |
| E2E Tests (Mobile) | Detox or Maestro | User flows |
| E2E Tests (Web) | Playwright | Web user flows |
| Manual Testing | Simulator + Device | Real-world validation |

---

## Unit Testing Setup

### Install Dependencies

```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native jest-expo
```

### Configure Jest

```javascript
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

### Example Component Test

```typescript
// __tests__/components/ItemCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ItemCard } from '@/components/ItemCard';

describe('ItemCard', () => {
  const mockItem = {
    id: '1',
    name: 'Test Item',
    description: 'A test description',
    status: 'active',
  };

  it('renders item name', () => {
    const { getByText } = render(
      <ItemCard item={mockItem} onPress={() => {}} />
    );
    expect(getByText('Test Item')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ItemCard item={mockItem} onPress={onPress} />
    );
    fireEvent.press(getByTestId('item-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows description if provided', () => {
    const { getByText } = render(
      <ItemCard item={mockItem} onPress={() => {}} />
    );
    expect(getByText('A test description')).toBeTruthy();
  });
});
```

### Example Hook Test

```typescript
// __tests__/hooks/useItems.test.tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useItems } from '@/hooks/useItems';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            range: () => Promise.resolve({
              data: [{ id: '1', name: 'Test' }],
              count: 1,
            }),
          }),
        }),
      }),
    }),
  },
}));

describe('useItems', () => {
  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );

  it('fetches items successfully', async () => {
    const { result } = renderHook(() => useItems(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].name).toBe('Test');
  });
});
```

---

## Integration Testing

### Mock API with MSW

```typescript
// __tests__/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('https://xxx.supabase.co/rest/v1/items', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: '1', name: 'Item 1', user_id: 'user-1' },
        { id: '2', name: 'Item 2', user_id: 'user-1' },
      ])
    );
  }),

  rest.post('https://xxx.supabase.co/rest/v1/items', async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.json({ id: '3', ...body })
    );
  }),
];
```

### Test API Flow

```typescript
// __tests__/integration/createItem.test.tsx
import { server } from '../mocks/server';
import { rest } from 'msw';
import { createItem } from '@/services/api';

describe('createItem', () => {
  it('creates an item successfully', async () => {
    const newItem = await createItem({ name: 'New Item' });
    
    expect(newItem.id).toBeDefined();
    expect(newItem.name).toBe('New Item');
  });

  it('handles server error', async () => {
    server.use(
      rest.post('https://xxx.supabase.co/rest/v1/items', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );

    await expect(createItem({ name: 'Test' })).rejects.toThrow();
  });
});
```

---

## E2E Testing with Maestro

### Install Maestro

```bash
# macOS
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify
maestro --version
```

### Example Flow

```yaml
# e2e/flows/login.yaml
appId: com.yourcompany.yourapp
---
- launchApp
- tapOn: "Sign In"
- tapOn:
    id: "email-input"
- inputText: "test@example.com"
- tapOn:
    id: "password-input"
- inputText: "testpassword123"
- tapOn: "Sign In"
- assertVisible: "Welcome"
```

### Create Item Flow

```yaml
# e2e/flows/create-item.yaml
appId: com.yourcompany.yourapp
---
- launchApp
# Assume already logged in
- tapOn:
    id: "add-button"
- tapOn:
    id: "name-input"
- inputText: "My New Item"
- tapOn:
    id: "description-input"
- inputText: "This is a test item"
- tapOn: "Save"
- assertVisible: "My New Item"
```

### Run Tests

```bash
# Run single flow
maestro test e2e/flows/login.yaml

# Run all flows
maestro test e2e/flows/
```

---

## Web E2E Testing with Playwright

### Setup

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Example Test

```typescript
// e2e/web/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can sign up', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('[data-testid="email"]', 'newuser@test.com');
    await page.fill('[data-testid="password"]', 'SecurePass123!');
    await page.fill('[data-testid="name"]', 'Test User');
    
    await page.click('[data-testid="signup-button"]');
    
    // Should redirect to home after signup
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('user can sign in', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email"]', 'existing@test.com');
    await page.fill('[data-testid="password"]', 'ExistingPass123!');
    
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/');
  });
});
```

---

## Manual Testing Checklist

### Before Launch

**Authentication:**
- [ ] Sign up with email
- [ ] Sign in with email
- [ ] Sign in with Google (if enabled)
- [ ] Sign in with Apple (if enabled)
- [ ] Password reset flow
- [ ] Sign out
- [ ] Session persists on app restart

**Core Features:**
- [ ] Create item
- [ ] View item details
- [ ] Edit item
- [ ] Delete item
- [ ] Search works correctly
- [ ] List pagination (if applicable)

**Subscription:**
- [ ] Free tier limits enforced
- [ ] Paywall appears at limit
- [ ] Purchase flow (sandbox)
- [ ] Subscription status updates
- [ ] Restore purchases

**Edge Cases:**
- [ ] App works offline (or shows appropriate message)
- [ ] Empty states display correctly
- [ ] Error messages are user-friendly
- [ ] Loading states appear
- [ ] Pull-to-refresh works

**Platform Specific:**
- [ ] iOS: Works on iPhone and iPad
- [ ] iOS: Works in dark mode
- [ ] Android: Works on different screen sizes
- [ ] Android: Back button works correctly
- [ ] Web: Responsive on mobile/tablet/desktop

---

## Test Data Management

### Seed Test Data

```typescript
// scripts/seed-test-data.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedTestData() {
  // Create test user
  const { data: user } = await supabase.auth.admin.createUser({
    email: 'test@example.com',
    password: 'testpassword123',
    email_confirm: true,
  });

  // Create test items
  await supabase.from('items').insert([
    { user_id: user.user.id, name: 'Test Item 1', status: 'active' },
    { user_id: user.user.id, name: 'Test Item 2', status: 'active' },
    { user_id: user.user.id, name: 'Test Item 3', status: 'archived' },
  ]);

  console.log('Test data seeded!');
}

seedTestData();
```

### Clean Test Data

```typescript
// scripts/clean-test-data.ts
async function cleanTestData() {
  // Delete test user (cascades to their data)
  await supabase.auth.admin.deleteUser('test-user-id');
  
  // Or clean specific tables
  await supabase.from('items').delete().eq('name', 'LIKE', 'Test%');
}
```

---

## CI/CD Testing

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test

  e2e-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

---

## Next Steps

- Set up CI/CD with automated testing
- Create comprehensive test coverage for critical paths
- Run manual testing on real devices before launch

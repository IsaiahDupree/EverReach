# UI Testing Framework Setup (TEST-005)

## Testing Library Integration
- [x] @testing-library/react-native configured
- [x] React Test Renderer integrated
- [x] User event simulation available
- [x] Custom render utilities created

## Test Organization
```
__tests__/
├── unit/          # Unit tests
├── integration/   # Integration tests
├── e2e/          # End-to-end tests
└── utils/        # Test utilities
```

## UI Testing Utilities

### Custom Render Function
```typescript
import { render } from '@testing-library/react-native';

const renderWithProviders = (component) => {
  return render(
    <SubscriptionProvider>
      <Component />
    </SubscriptionProvider>
  );
};
```

### Query Methods
- `getByText()` - Find by visible text
- `getByTestId()` - Find by test ID
- `getByRole()` - Find by accessibility role
- `findBy*()` - Async queries for async rendering

### User Events
- `fireEvent()` - Fire events on elements
- `userEvent` - User interaction simulation
- `waitFor()` - Wait for async updates

## Running UI Tests

### Single Test File
```bash
npm test -- path/to/test.test.tsx
```

### All UI Tests
```bash
npm run test:ui
```

### With Coverage
```bash
npm run test:ui:coverage
```

### Watch Mode
```bash
npm test -- --watch
```

## Example UI Test

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Button, Text } from 'react-native';

test('button click updates text', async () => {
  const { getByText } = render(
    <Button title="Click Me" onPress={() => {}} />
  );

  const button = getByText('Click Me');
  fireEvent.press(button);

  await waitFor(() => {
    expect(getByText('Updated Text')).toBeTruthy();
  });
});
```

## Best Practices
- Use `getByRole` or `getByTestId` instead of `getByText` when possible
- Query elements as users would interact with them
- Use `waitFor` for async operations
- Test behavior, not implementation
- Keep tests focused and independent
- Mock external dependencies

## CI Integration
- Tests run on every push
- Failure blocks merging to main
- Coverage reports uploaded to Codecov
- Results visible in PR checks

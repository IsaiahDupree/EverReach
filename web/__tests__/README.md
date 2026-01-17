# Component Tests

## Overview

This directory contains **minimal component tests** for pure UI components using **Vitest + React Testing Library**.

Following the FRONTEND_TESTING_PLAN.md, component tests are ONLY for isolated UI logic—no API calls, no routing, no complex state management.

---

## What to Test with Component Tests

### ✅ DO Test
- Pure UI components (buttons, cards, modals, forms)
- Component prop variations
- User interactions that don't involve APIs (clicks, typing)
- CSS/Tailwind class application
- Conditional rendering
- Accessibility attributes (ARIA roles, labels)
- Form validation (client-side only)

### ❌ DON'T Test
- API calls or data fetching
- Full page routes
- Authentication flows
- Navigation/routing
- Complex state management
- Backend integration

---

## Running Component Tests

```bash
# Run all component tests
npm run test:unit

# Run in watch mode (auto-rerun on changes)
npm run test:watch

# Run specific test file
npx vitest run __tests__/components/Button.test.tsx

# Run with coverage
npx vitest run --coverage
```

---

## Test Files

### Button.test.tsx
Tests for button components:
- Rendering with text
- Click handlers
- Disabled state
- Variants (primary, secondary, danger)
- Sizes (sm, md, lg)
- Custom className
- Button types (submit, reset)
- Icon support

**Tests**: 9

### Card.test.tsx
Tests for card/container components:
- Rendering children
- Title and footer
- Variants (default, bordered, elevated)
- Padding classes
- Custom attributes
- Complex content

**Tests**: 9

### Input.test.tsx
Tests for form input components:
- Basic rendering
- Labels and required indicators
- User input handling
- Error messages
- Helper text
- Disabled state
- Different input types (text, email, password)
- Controlled inputs
- Accessibility attributes

**Tests**: 11

### Modal.test.tsx
Tests for modal/dialog components:
- Open/close state
- Title and footer
- Close button
- Backdrop clicks
- Size variants
- Accessibility attributes
- Complex content
- State management

**Tests**: 14

**Total Component Tests**: 43

---

## Writing New Component Tests

### Template

```typescript
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { YourComponent } from '@/components/ui/YourComponent'

describe('YourComponent', () => {
  it('renders successfully', () => {
    render(<YourComponent>Content</YourComponent>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    
    render(<YourComponent onClick={handleClick}>Click me</YourComponent>)
    
    await user.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Best Practices

1. **Use semantic queries**:
   ```typescript
   // ✅ Good
   screen.getByRole('button', { name: /submit/i })
   screen.getByLabelText('Email')
   
   // ❌ Avoid
   container.querySelector('.btn-submit')
   ```

2. **Test user behavior, not implementation**:
   ```typescript
   // ✅ Good
   await user.click(screen.getByRole('button'))
   expect(screen.getByText('Success')).toBeVisible()
   
   // ❌ Avoid
   expect(component.state.isSubmitting).toBe(false)
   ```

3. **Use userEvent over fireEvent**:
   ```typescript
   // ✅ Good
   const user = userEvent.setup()
   await user.type(input, 'text')
   
   // ❌ Avoid
   fireEvent.change(input, { target: { value: 'text' } })
   ```

4. **Test accessibility**:
   ```typescript
   expect(screen.getByRole('button')).toHaveAccessibleName('Submit')
   expect(input).toHaveAttribute('aria-invalid', 'true')
   expect(input).toHaveAttribute('aria-describedby', 'error-message')
   ```

---

## Common Queries

### Finding Elements

```typescript
// By role (preferred)
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: 'Email' })
screen.getByRole('heading', { level: 1 })

// By label text
screen.getByLabelText('Password')

// By placeholder
screen.getByPlaceholderText('Enter email')

// By text content
screen.getByText(/welcome/i)

// By test ID (last resort)
screen.getByTestId('custom-element')
```

### Assertions

```typescript
// Presence
expect(element).toBeInTheDocument()
expect(element).toBeVisible()

// State
expect(button).toBeDisabled()
expect(input).toHaveValue('text')
expect(checkbox).toBeChecked()

// Classes & Attributes
expect(element).toHaveClass('active')
expect(element).toHaveAttribute('aria-label', 'Close')

// Text content
expect(element).toHaveTextContent('Hello')
```

---

## Coverage Goals

- **Overall**: 80%+ for UI components
- **Critical components**: 90%+
- **Pure UI logic**: 100%

Current coverage is tracked in component tests only—E2E tests provide integration coverage.

---

## Debugging Tests

### Run with UI
```bash
npx vitest --ui
```

### Debug specific test
```bash
npx vitest run --reporter=verbose __tests__/components/Button.test.tsx
```

### View test output
```bash
npx vitest run --reporter=verbose --no-coverage
```

### Check what's rendered
```typescript
import { screen } from '@testing-library/react'

// Print DOM
screen.debug()

// Print specific element
screen.debug(screen.getByRole('button'))
```

---

## Configuration

Tests use `vitest.config.mjs`:
- Environment: jsdom
- Setup file: `test/setupTests.mjs`
- Path alias: `@/` → project root
- CSS support enabled
- Globals enabled

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [jest-dom Matchers](https://github.com/testing-library/jest-dom)
- [User Event](https://testing-library.com/docs/user-event/intro)

---

## Notes

- **Replace mock components**: Current tests use mock components. Replace with actual component imports when components are built.
- **Keep tests simple**: Component tests should be fast (<100ms per test).
- **No API mocking**: If a component needs API data, test it in E2E tests instead.
- **Test in isolation**: Mock child components if needed to keep tests focused.

---

**Status**: ✅ Example component tests created  
**Coverage**: Pure UI components only  
**Primary Testing**: E2E tests (Playwright) provide full integration coverage

import { debounce } from '@/lib/debounce';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('delays function execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 250);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(250);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('cancels previous calls when called again', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 250);

    debounced();
    jest.advanceTimersByTime(100);
    debounced();
    jest.advanceTimersByTime(100);
    debounced();

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(250);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('passes arguments correctly', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 250);

    debounced('hello', 42, { foo: 'bar' });
    jest.advanceTimersByTime(250);

    expect(fn).toHaveBeenCalledWith('hello', 42, { foo: 'bar' });
  });

  test('uses last call arguments when multiple calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 250);

    debounced('first');
    jest.advanceTimersByTime(100);
    debounced('second');
    jest.advanceTimersByTime(100);
    debounced('third');
    jest.advanceTimersByTime(250);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
  });

  test('uses default delay of 250ms', () => {
    const fn = jest.fn();
    const debounced = debounce(fn);

    debounced();
    jest.advanceTimersByTime(249);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('works with custom delay', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 500);

    debounced();
    jest.advanceTimersByTime(499);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

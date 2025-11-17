/**
 * Async Operations Utilities
 * Provides robust handling for asynchronous operations with timeout, retry, and abort support
 */

export interface AsyncOperationOptions {
  timeout?: number; // Timeout in milliseconds
  retries?: number; // Number of retry attempts
  retryDelay?: number; // Delay between retries in milliseconds
  signal?: AbortSignal; // External abort signal
  onTimeout?: () => void; // Callback when operation times out
  onRetry?: (attempt: number, error: Error) => void; // Callback on retry
}

export class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a fetch request with timeout, retry, and abort support
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & AsyncOperationOptions = {}
): Promise<Response> {
  const {
    timeout = 30000, // Default 30s timeout
    retries = 0,
    retryDelay = 1000,
    signal,
    onTimeout,
    onRetry,
    ...fetchOptions
  } = options;

  // Create abort controller for timeout
  const controller = new AbortController();
  const combinedSignal = signal
    ? createCombinedSignal(signal, controller.signal)
    : controller.signal;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Set timeout
      const timeoutId = setTimeout(() => {
        controller.abort();
        if (onTimeout) onTimeout();
      }, timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: combinedSignal,
        });

        clearTimeout(timeoutId);
        
        // Retry on server errors (5xx) if retries are configured
        if (response.status >= 500 && response.status < 600 && attempt < retries) {
          lastError = new Error(`Server error: ${response.status}`);
          if (onRetry) onRetry(attempt + 1, lastError);
          await delay(retryDelay * (attempt + 1)); // Exponential backoff
          continue;
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      if (error instanceof Error) {
        // Don't retry on abort
        if (error.name === 'AbortError') {
          if (controller.signal.aborted) {
            throw new TimeoutError(
              `Request timed out after ${timeout}ms`,
              timeout
            );
          }
          throw error; // External abort
        }

        // Network errors - retry if configured
        if (attempt < retries) {
          lastError = error;
          if (onRetry) onRetry(attempt + 1, error);
          await delay(retryDelay * (attempt + 1)); // Exponential backoff
          continue;
        }

        throw error;
      }
      throw error;
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Creates a combined abort signal from multiple signals
 */
function createCombinedSignal(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }

    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounces an async function to prevent rapid successive calls
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastAbortController: AbortController | null = null;

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    // Cancel previous pending call
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (lastAbortController) {
      lastAbortController.abort();
    }

    const abortController = new AbortController();
    lastAbortController = abortController;

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        if (abortController.signal.aborted) {
          reject(new Error('Debounced call aborted'));
          return;
        }

        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          if (lastAbortController === abortController) {
            lastAbortController = null;
          }
        }
      }, delay);
    });
  }) as T;
}

/**
 * Prevents duplicate simultaneous calls to the same async function
 */
export function preventDuplicateCalls<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  let pending: Promise<any> | null = null;

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (pending) {
      console.log('[preventDuplicateCalls] Duplicate call prevented, returning existing promise');
      return pending;
    }

    pending = fn(...args);

    try {
      const result = await pending;
      return result;
    } finally {
      pending = null;
    }
  }) as T;
}

/**
 * Creates a loading state manager for async operations
 */
export function useAsyncOperation<T>(
  operation: (signal?: AbortSignal) => Promise<T>,
  options: AsyncOperationOptions = {}
) {
  const abortControllerRef = { current: new AbortController() };

  const execute = async (): Promise<T | null> => {
    // Abort any pending operation
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const result = await operation(abortControllerRef.current.signal);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[useAsyncOperation] Operation aborted');
        return null;
      }
      throw error;
    }
  };

  const cancel = () => {
    abortControllerRef.current.abort();
  };

  return { execute, cancel };
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delayMs = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        if (onRetry) onRetry(attempt + 1, lastError);
        await delay(delayMs);
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

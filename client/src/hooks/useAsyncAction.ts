/**
 * React hook for managing async operations with loading state, error handling, and abort support
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseAsyncActionOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  preventDuplicateCalls?: boolean;
  timeout?: number; // in milliseconds
}

export interface UseAsyncActionReturn<T, Args extends any[]> {
  execute: (...args: Args) => Promise<T | null>;
  loading: boolean;
  error: Error | null;
  data: T | null;
  reset: () => void;
  cancel: () => void;
}

/**
 * Hook for managing async actions with loading state, error handling, and abort support
 * 
 * @example
 * const shareImage = useAsyncAction(
 *   async (imageId: string) => {
 *     const response = await fetch(`/api/share/${imageId}`, { method: 'POST' });
 *     return response.json();
 *   },
 *   {
 *     onSuccess: (data) => console.log('Shared:', data),
 *     onError: (error) => console.error('Failed:', error),
 *     preventDuplicateCalls: true,
 *     timeout: 10000, // 10 seconds
 *   }
 * );
 * 
 * // In component:
 * <button onClick={() => shareImage.execute('img-123')} disabled={shareImage.loading}>
 *   {shareImage.loading ? 'Sharing...' : 'Share'}
 * </button>
 */
export function useAsyncAction<T, Args extends any[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncActionOptions<T> = {}
): UseAsyncActionReturn<T, Args> {
  const {
    onSuccess,
    onError,
    preventDuplicateCalls = false,
    timeout,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingRef = useRef<Promise<T | null> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      // Prevent duplicate calls if option is enabled
      if (preventDuplicateCalls && pendingRef.current) {
        console.log('[useAsyncAction] Duplicate call prevented');
        return pendingRef.current;
      }

      // Cancel any pending operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      setError(null);

      // Set up timeout if specified
      let timeoutId: NodeJS.Timeout | undefined;
      if (timeout) {
        timeoutId = setTimeout(() => {
          abortController.abort();
          setError(new Error(`Operation timed out after ${timeout}ms`));
          setLoading(false);
        }, timeout);
      }

      const executePromise = (async () => {
        try {
          const result = await asyncFunction(...args);

          // Check if aborted
          if (abortController.signal.aborted) {
            return null;
          }

          setData(result);
          setLoading(false);

          if (onSuccess) {
            onSuccess(result);
          }

          return result;
        } catch (err) {
          // Check if aborted
          if (abortController.signal.aborted) {
            if (err instanceof Error && err.name === 'AbortError') {
              console.log('[useAsyncAction] Operation aborted');
              setLoading(false);
              return null;
            }
          }

          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setLoading(false);

          if (onError) {
            onError(error);
          } else {
            console.error('[useAsyncAction] Async operation failed:', error);
          }

          return null;
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          // Clear pending ref if this is still the current operation
          setTimeout(() => {
            if (pendingRef.current === executePromise) {
              pendingRef.current = null;
            }
          }, 0);
        }
      })();

      pendingRef.current = executePromise;
      return executePromise;
    },
    [asyncFunction, onSuccess, onError, preventDuplicateCalls, timeout]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    pendingRef.current = null;
    setLoading(false);
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset,
    cancel,
  };
}

/**
 * Hook for managing multiple related async operations
 * Useful for operations like "save", "delete", "update" on the same resource
 */
export function useAsyncActions<T extends Record<string, (...args: any[]) => Promise<any>>>(
  actions: T,
  options: UseAsyncActionOptions<any> = {}
): {
  [K in keyof T]: UseAsyncActionReturn<
    Awaited<ReturnType<T[K]>>,
    Parameters<T[K]>
  >;
} & {
  anyLoading: boolean;
  cancelAll: () => void;
} {
  const actionHooks = {} as any;
  let anyLoading = false;
  const cancelFunctions: (() => void)[] = [];

  for (const [key, action] of Object.entries(actions)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const hook = useAsyncAction(action, options);
    actionHooks[key] = hook;
    if (hook.loading) {
      anyLoading = true;
    }
    cancelFunctions.push(hook.cancel);
  }

  const cancelAll = useCallback(() => {
    cancelFunctions.forEach(cancel => cancel());
  }, [cancelFunctions]);

  return {
    ...actionHooks,
    anyLoading,
    cancelAll,
  };
}

# Async Operations Guide

This guide documents the async operation utilities and patterns implemented to improve reliability, performance, and user experience in the AI MagicBox platform.

## Overview

The platform now includes comprehensive utilities for handling asynchronous operations with:
- **Request cancellation** via AbortController
- **Timeout handling** with configurable limits
- **Retry logic** with exponential backoff
- **Request deduplication** to prevent duplicate operations
- **Race condition handling** on both client and server

## Core Utilities

### 1. `async-utils.ts` - Core Async Utilities

Location: `client/src/lib/async-utils.ts`

#### Features

**Request Cancellation**
```typescript
import { createAbortableFetch } from '@/lib/async-utils';

const abortableFetch = createAbortableFetch();

// Make request with automatic abort support
const result = await abortableFetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
});

// Cancel if needed
abortableFetch.abort();
```

**Timeout Handling**
```typescript
import { withTimeout } from '@/lib/async-utils';

// 30 second timeout (default)
const result = await withTimeout(asyncOperation());

// Custom timeout
const result = await withTimeout(longOperation(), 60000); // 60s
```

**Retry Logic with Exponential Backoff**
```typescript
import { withRetry } from '@/lib/async-utils';

const result = await withRetry(
  async () => {
    const response = await fetch('/api/unstable-endpoint');
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  },
  {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    shouldRetry: (error) => {
      // Only retry on network errors or 5xx responses
      return error.message.includes('NetworkError') || 
             error.message.includes('500');
    }
  }
);
```

**Request Deduplication**
```typescript
import { createDedupedRequest } from '@/lib/async-utils';

const dedupedFetch = createDedupedRequest();

// Multiple calls with same key will share the same promise
const promise1 = dedupedFetch('user-123', () => fetchUser('123'));
const promise2 = dedupedFetch('user-123', () => fetchUser('123'));
// Both resolve to same result - only one fetch executed

// Clear cache when needed
dedupedFetch.clear('user-123');
```

### 2. `useAsyncAction` Hook - React Integration

Location: `client/src/hooks/useAsyncAction.ts`

A comprehensive React hook for managing async operations with built-in state management.

#### Basic Usage

```typescript
import { useAsyncAction } from '@/hooks/useAsyncAction';

function MyComponent() {
  const generateImage = useAsyncAction(
    async (prompt: string) => {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });
      return response.json();
    },
    {
      timeout: 60000, // 60 second timeout for image generation
      preventDuplicateCalls: true,
      onSuccess: (result) => {
        console.log('Image generated:', result);
        toast({ title: 'Success!' });
      },
      onError: (error) => {
        console.error('Generation failed:', error);
        toast({ title: 'Failed', variant: 'destructive' });
      }
    }
  );

  return (
    <div>
      <Button 
        onClick={() => generateImage.execute('A beautiful sunset')}
        disabled={generateImage.loading}
        data-testid="button-generate"
      >
        {generateImage.loading ? 'Generating...' : 'Generate Image'}
      </Button>
      
      {generateImage.error && (
        <div className="text-destructive">{generateImage.error.message}</div>
      )}
      
      {generateImage.data && (
        <img src={generateImage.data.imageUrl} alt="Generated" />
      )}
    </div>
  );
}
```

#### Options

```typescript
interface UseAsyncActionOptions<T> {
  // Maximum time to wait (in ms) before aborting
  timeout?: number;
  
  // Prevent duplicate calls while operation is pending
  preventDuplicateCalls?: boolean;
  
  // Called when operation succeeds
  onSuccess?: (data: T) => void;
  
  // Called when operation fails
  onError?: (error: Error) => void;
}
```

#### Return Value

```typescript
interface AsyncActionResult<T, Args extends any[]> {
  // Execute the async operation
  execute: (...args: Args) => Promise<T | null>;
  
  // Current loading state
  loading: boolean;
  
  // Last error (if any)
  error: Error | null;
  
  // Last successful result (if any)
  data: T | null;
  
  // Reset all state
  reset: () => void;
  
  // Cancel pending operation
  cancel: () => void;
}
```

#### Advanced Usage

**With Cancellation**
```typescript
const mutation = useAsyncAction(slowOperation);

// Start operation
mutation.execute();

// Cancel if user navigates away
useEffect(() => {
  return () => mutation.cancel();
}, []);
```

**With State Reset**
```typescript
const mutation = useAsyncAction(createProject);

const handleSubmit = async (data) => {
  mutation.reset(); // Clear previous errors
  await mutation.execute(data);
};
```

## Server-Side Improvements

### Enhanced `ensureUser` Function

Location: `server/routes.ts`

The `ensureUser` function now includes robust race condition handling with retry logic.

#### Features

1. **PostgreSQL Error Code Detection**: Uses error code `23505` for reliable constraint violation detection
2. **Exponential Backoff**: Retries with increasing delays (100ms, 200ms, 300ms)
3. **Max Retry Limit**: Default 3 attempts before failing
4. **Detailed Logging**: Logs race condition occurrences for debugging

#### Implementation Details

```typescript
async function ensureUser(req: Request, maxRetries: number = 3): Promise<User> {
  // ... (see server/routes.ts for full implementation)
}
```

The function:
1. Checks if user exists by ID
2. Falls back to email lookup
3. Attempts to create user if not found
4. Detects PostgreSQL unique constraint violations (error code 23505)
5. Retries with exponential backoff on race conditions
6. Provides detailed error messages for debugging

## Recommended Timeouts

Based on operation complexity:

| Operation Type | Recommended Timeout | Rationale |
|---------------|-------------------|-----------|
| Standard API calls | 30s (default) | Sufficient for most operations |
| Image generation | 60s | AI image generation can be slow |
| Complex AI operations | 90s | Multiple AI calls or large payloads |
| Database queries | 10s | Should be fast; longer suggests issues |

## Best Practices

### 1. Always Use Timeouts

```typescript
// ❌ Bad: No timeout
const result = await fetch('/api/slow-endpoint');

// ✅ Good: With timeout
const result = await withTimeout(
  fetch('/api/slow-endpoint'),
  30000
);
```

### 2. Handle Cancellation in Components

```typescript
// ✅ Good: Cleanup on unmount
function MyComponent() {
  const operation = useAsyncAction(asyncFn);
  
  useEffect(() => {
    return () => operation.cancel();
  }, []);
  
  // ...
}
```

### 3. Use Deduplication for Expensive Operations

```typescript
// ✅ Good: Prevent duplicate AI calls
const dedupedGenerate = createDedupedRequest();

const result = await dedupedGenerate(
  `generate-${prompt}`,
  () => generateImage(prompt)
);
```

### 4. Provide User Feedback

```typescript
// ✅ Good: Show loading state and errors
const mutation = useAsyncAction(saveProject, {
  onSuccess: () => toast({ title: 'Saved!' }),
  onError: (error) => toast({ 
    title: 'Save failed', 
    description: error.message,
    variant: 'destructive' 
  })
});
```

### 5. Set Appropriate Timeouts

```typescript
// ✅ Good: Different timeouts for different operations
const quickMutation = useAsyncAction(updateName, { timeout: 10000 });
const slowMutation = useAsyncAction(generateImage, { timeout: 60000 });
```

## Migration Guide

### Migrating Existing Code

**Before:**
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);

const handleGenerate = async () => {
  setLoading(true);
  setError(null);
  try {
    const result = await fetch('/api/generate', { method: 'POST' });
    // ... handle result
  } catch (err) {
    setError(err as Error);
  } finally {
    setLoading(false);
  }
};
```

**After:**
```typescript
const generateAction = useAsyncAction(
  async () => {
    const result = await fetch('/api/generate', { method: 'POST' });
    return result.json();
  },
  {
    timeout: 60000,
    preventDuplicateCalls: true
  }
);

const handleGenerate = () => generateAction.execute();
```

## Performance Considerations

### Memory Management

The utilities automatically clean up resources:
- AbortControllers are properly disposed
- Deduplication cache can be manually cleared
- Timeouts are cleared on completion

### Network Efficiency

- Request deduplication prevents duplicate network calls
- Cancellation stops processing of abandoned requests
- Retry logic uses exponential backoff to avoid overwhelming servers

## Troubleshooting

### Operation Times Out

1. Check if timeout is appropriate for operation
2. Verify network connectivity
3. Check server logs for slow operations
4. Consider increasing timeout for complex operations

### Race Conditions

1. Use `preventDuplicateCalls: true` for mutations
2. Use request deduplication for queries
3. Check server logs for race condition detection

### Memory Leaks

1. Ensure components cancel operations on unmount
2. Clear deduplication cache when appropriate
3. Use AbortController for long-running operations

## Future Enhancements

Potential improvements to consider:

1. **Progress Tracking**: Add progress callbacks for long operations
2. **Offline Support**: Queue operations when offline
3. **Optimistic Updates**: Update UI before server confirms
4. **Request Batching**: Combine multiple requests into one
5. **Caching Layer**: Add intelligent caching with TTL

## Examples

See `client/src/pages/workspace.tsx` for real-world usage examples in:
- Image generation with timeout handling
- Campaign saving with cancellation support
- AI text generation with error handling
- Community sharing with race condition prevention

## Summary

These async operation improvements provide:

✅ **Reliability**: Proper timeout and error handling  
✅ **Performance**: Request deduplication and cancellation  
✅ **User Experience**: Loading states and clear error messages  
✅ **Maintainability**: Consistent patterns across the codebase  
✅ **Robustness**: Race condition handling on client and server

By following these patterns, the platform ensures smooth operation even under heavy load or poor network conditions.

import { apiCache } from './apiCache';

/**
 * Options for API request with retry
 */
interface RequestOptions {
  cacheKey?: string;
  cacheTTL?: number;
  maxRetries?: number;
  retryDelay?: number;
  skipCache?: boolean;
}

/**
 * Global request queue to prevent rate limiting
 * Ensures only one request per endpoint is active at a time
 */
class RequestQueue {
  private activeRequests = new Map<string, Promise<any>>();
  
  async queueRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If a request for this key is already active, wait for it
    if (this.activeRequests.has(key)) {
      console.log(`Request for ${key} already in progress, waiting...`);
      return this.activeRequests.get(key)!;
    }
    
    // Start new request
    const requestPromise = requestFn().finally(() => {
      this.activeRequests.delete(key);
    });
    
    this.activeRequests.set(key, requestPromise);
    return requestPromise;
  }
}

const requestQueue = new RequestQueue();

/**
 * Sleep utility for delays
 * @param ms - Milliseconds to sleep
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Makes an API request with caching, retry logic, and exponential backoff
 * Handles rate limiting (429) errors gracefully by retrying with increasing delays
 * 
 * @param requestFn - Async function that makes the API call
 * @param options - Configuration options for caching and retries
 * @returns Promise with the API response data
 * 
 * @example
 * const data = await fetchWithRetry(
 *   () => gamesAPI.getWeeklyGames(),
 *   { cacheKey: 'weekly-games', cacheTTL: 60000, maxRetries: 3 }
 * );
 */
export async function fetchWithRetry<T>(
  requestFn: () => Promise<T>,
  options: RequestOptions = {}
): Promise<T> {
  const {
    cacheKey,
    cacheTTL,
    maxRetries = 3,
    retryDelay = 1000,
    skipCache = false,
  } = options;

  // Check cache first if cacheKey provided
  if (cacheKey && !skipCache) {
    const cached = apiCache.get<T>(cacheKey, cacheTTL);
    if (cached) {
      console.log(`Cache hit for ${cacheKey}`);
      return cached;
    }
  }

  // Use request queue to prevent rate limiting
  const queueKey = cacheKey || 'default';
  return requestQueue.queueRequest(queueKey, async () => {
    let lastError: any;
    
    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const data = await requestFn();
        
        // Cache successful response
        if (cacheKey) {
          apiCache.set(cacheKey, data);
        }
        
        return data;
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;
        
        // Don't retry on client errors (except 429 rate limit)
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
        
        // If we haven't exceeded max retries, wait and try again
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          const delay = retryDelay * Math.pow(2, attempt);
          console.log(
            `Request failed (attempt ${attempt + 1}/${maxRetries + 1}). ` +
            `Retrying in ${delay}ms...`,
            status === 429 ? 'Rate limited' : ''
          );
          await sleep(delay);
        }
      }
    }
    
    // All retries exhausted
    throw lastError;
  });
}

/**
 * Stagger multiple API calls to avoid rate limiting
 * Executes requests with delays between them
 * 
 * @param requests - Array of request functions to execute
 * @param delayMs - Delay in milliseconds between requests (default 200ms)
 * @returns Promise that resolves when all requests complete
 * 
 * @example
 * await staggerRequests([
 *   () => fetchWithRetry(() => gamesAPI.getWeeklyGames(), { cacheKey: 'weekly' }),
 *   () => fetchWithRetry(() => friendRequestsAPI.getPending(), { cacheKey: 'friends' }),
 * ], 300);
 */
export async function staggerRequests<T>(
  requests: Array<() => Promise<T>>,
  delayMs: number = 200
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < requests.length; i++) {
    if (i > 0) {
      await sleep(delayMs);
    }
    results.push(await requests[i]());
  }
  
  return results;
}


import { logger } from './logger';
import { config } from '../config/environment';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export const retry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxAttempts = config.sync.maxRetryAttempts,
    delay = 1000,
    backoff = true,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        logger.error('Max retry attempts reached', {
          error: lastError.message,
          attempts: maxAttempts
        });
        throw lastError;
      }

      const currentDelay = backoff ? delay * Math.pow(2, attempt - 1) : delay;
      
      logger.warn(`Operation failed, retrying in ${currentDelay}ms`, {
        error: lastError.message,
        attempt,
        maxAttempts
      });

      if (onRetry) {
        onRetry(lastError, attempt);
      }

      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }

  throw lastError!;
};

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
};
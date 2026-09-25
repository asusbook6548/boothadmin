import toast from 'react-hot-toast';

interface ApiErrorResponse {
  message?: string;
  error?: string;
  errors?: Array<{ message?: string; path?: string[] } | string> | Record<string, string[] | string>;
  success?: boolean;
}

interface AxiosLikeError {
  response?: {
    status?: number;
    statusText?: string;
    data?: ApiErrorResponse | string;
  };
  code?: string;
  message?: string;
}

/**
 * Parses and extracts a clean, human-readable error message from backend error responses.
 * Handles Zod validation arrays (both parsed & stringified), field error objects,
 * HTTP status codes, and network failures.
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback;

  const err = error as AxiosLikeError;

  // 1. Network / Connection errors
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Unable to connect to server. Please check your internet connection or verify the backend is running.';
  }

  if (err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'))) {
    return 'Request timed out. Please try again.';
  }

  // 2. Server response payload
  if (err.response?.data) {
    const data = err.response.data;

    // Plain string response
    if (typeof data === 'string' && data.trim().length > 0) {
      // Check if string is serialized JSON
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(data);
          return getErrorMessage({ response: { ...err.response, data: parsed } }, fallback);
        } catch {
          return data;
        }
      }
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      // 2a. Message field
      if (typeof data.message === 'string' && data.message.trim().length > 0) {
        const msg = data.message.trim();
        // Check if message is stringified Zod issues array
        if (msg.startsWith('[') && msg.endsWith(']')) {
          try {
            const parsed = JSON.parse(msg);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const formatted = parsed
                .map((item) => {
                  const path = Array.isArray(item.path) && item.path.length > 0 ? item.path.join('.') : '';
                  return path ? `${path}: ${item.message || 'Invalid value'}` : item.message || 'Invalid value';
                })
                .filter(Boolean)
                .join('; ');
              if (formatted) return formatted;
            }
          } catch {
            // Not json, return raw msg
          }
        }
        return msg;
      }

      // 2b. Error field
      if (typeof data.error === 'string' && data.error.trim().length > 0) {
        return data.error;
      }

      // 2c. Errors array/object (common in validation)
      if (data.errors) {
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          const formatted = data.errors
            .map((item) => {
              if (typeof item === 'string') return item;
              if (typeof item === 'object' && item !== null) {
                const path = Array.isArray(item.path) && item.path.length > 0 ? item.path.join('.') : '';
                return path ? `${path}: ${item.message || 'Invalid'}` : item.message || 'Invalid';
              }
              return '';
            })
            .filter(Boolean)
            .join('; ');
          if (formatted) return formatted;
        } else if (typeof data.errors === 'object') {
          const entries = Object.entries(data.errors);
          if (entries.length > 0) {
            return entries
              .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
              .join('; ');
          }
        }
      }
    }
  }

  // 3. HTTP Status code fallbacks
  if (err.response?.status) {
    const status = err.response.status;
    if (status === 400) return fallback || 'Invalid request. Please check your inputs.';
    if (status === 401) return 'Session expired or invalid credentials. Please log in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested resource was not found.';
    if (status === 409) return 'A conflict occurred. The resource already exists.';
    if (status === 422) return 'Validation error. Please verify the submitted data.';
    if (status >= 500) return 'Server error. Please try again later.';
  }

  // 4. Standard Error object message
  if (err.message && !err.message.startsWith('Request failed with status code')) {
    return err.message;
  }

  return fallback;
}

/**
 * Display a toast notification with the proper backend error message.
 */
export function showErrorToast(error: unknown, fallback?: string): string {
  const message = getErrorMessage(error, fallback);
  toast.error(message);
  return message;
}

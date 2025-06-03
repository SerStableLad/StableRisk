import pTimeout from 'p-timeout';

const DEFAULT_TIMEOUT = 5000; // 5 seconds

/**
 * Wraps an API call with a timeout
 * @param {Promise} promise - The API call promise
 * @param {number} [timeout] - Timeout in milliseconds (default: 5000)
 * @returns {Promise} - Promise that rejects if the timeout is reached
 */
export async function withTimeout(promise, timeout = DEFAULT_TIMEOUT) {
  return pTimeout(promise, {
    milliseconds: timeout,
    message: 'API request timed out'
  });
}

/**
 * Creates an axios instance with timeout handling
 * @param {Object} axiosInstance - Axios instance to wrap
 * @returns {Object} - Wrapped axios instance
 */
export function createTimeoutAxios(axiosInstance) {
  // Add request interceptor
  axiosInstance.interceptors.request.use((config) => {
    config.timeout = DEFAULT_TIMEOUT;
    return config;
  });

  // Add response interceptor
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ECONNABORTED') {
        throw new Error('API request timed out');
      }
      throw error;
    }
  );

  return axiosInstance;
}
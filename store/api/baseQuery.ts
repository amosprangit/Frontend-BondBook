import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError, FetchBaseQueryMeta } from '@reduxjs/toolkit/query';
import { API_URL } from '@env';

interface CustomBaseQueryConfig {
  prepareHeaders?: (headers: Headers) => Headers;
}

// Create a logging wrapper around any baseQuery
export const createBaseQueryWithLogger = (
  config?: CustomBaseQueryConfig
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, {}, FetchBaseQueryMeta> => {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      // Always add auth token
      const token = (getState() as any).auth.token;
      console.log('🔑 Token exists:', !!token, token ? `(${token.substring(0, 20)}...)` : '');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      // Apply custom headers if provided
      if (config?.prepareHeaders) {
        return config.prepareHeaders(headers);
      }
      return headers;
    },
  });

  return (args, api, extraOptions) => {
    // Build full URL for logging
    const url = typeof args === 'string' ? args : args.url;
    const method = typeof args === 'string' ? 'GET' : (args.method || 'GET');
    const fullUrl = `${API_URL}${url.startsWith('/') ? url : '/' + url}`;

    console.log(`🌐 [${method}] ${fullUrl}`);

    const startTime = Date.now();

    // Call the raw query and handle result in .then()
    const resultPromise = rawBaseQuery(args, api, extraOptions);

    resultPromise.then((result) => {
      const duration = Date.now() - startTime;
      if (result.error) {
        console.log(`❌ [${method}] ${fullUrl} - Error: ${result.error.status} (${duration}ms)`);
      } else {
        console.log(`✅ [${method}] ${fullUrl} - Success (${duration}ms)`);
      }
    }).catch(() => {
      // Silent catch - errors are handled by RTK Query
    });

    return resultPromise;
  };
};

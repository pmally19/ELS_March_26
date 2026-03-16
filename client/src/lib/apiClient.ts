/**
 * API Client utility for making API requests
 * This utility helps handle errors consistently and ensures proper JSON parsing
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Parse error response and extract meaningful error message
 */
function parseErrorResponse(response: Response, errorText: string): string {
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    try {
      const err = JSON.parse(errorText);
      return err.message || err.error || `${response.status} ${response.statusText}`;
    } catch {
      return `${response.status} ${response.statusText}`;
    }
  }
  
  // Check if the response is HTML
  if (errorText.includes('<!DOCTYPE')) {
    return `Server error (${response.status}): HTML response`;
  }
  
  return errorText || `API Error: ${response.status} ${response.statusText}`;
}

/**
 * Make a generic API request
 * @param url The URL to make the request to
 * @param method The HTTP method to use
 * @param data The data to send in the request body (for POST/PUT)
 * @returns The parsed JSON response
 */
export async function apiRequest<T>(url: string, method: string, data?: any): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  };

  // Include JSON body for methods that accept a payload
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = parseErrorResponse(response, errorText);
      throw new Error(errorMessage);
    }

    // Check if response has content before parsing
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    
    // If response is empty, return null
    if (!text || text.trim() === '') {
      return null as T;
    }

    // Parse the response as JSON
    try {
      return JSON.parse(text) as T;
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', text);
      throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Make a GET request to the API
 * @param url The URL to make the request to
 * @returns The parsed JSON response
 */
export async function apiGet<T>(url: string): Promise<T> {
  try {
    // Make request with explicit headers
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = parseErrorResponse(response, errorText);
      throw new Error(errorMessage);
    }

    // Check if response has content before parsing
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    
    // If response is empty, return empty array or null based on expected type
    if (!text || text.trim() === '') {
      // Check if we're expecting an array, return empty array
      if (url.includes('fiscal-calendars') || url.includes('fiscal-period')) {
        return [] as T;
      }
      return null as T;
    }

    // Parse the response as JSON
    try {
      return JSON.parse(text) as T;
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', text);
      throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Make a POST request to the API
 * @param url The URL to make the request to
 * @param data The data to send in the request body
 * @returns The parsed JSON response
 */
export async function apiPost<T>(url: string, data: any): Promise<T> {
  try {
    // Make request with explicit headers
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = parseErrorResponse(response, errorText);
      throw new Error(errorMessage);
    }

    // Check if response has content before parsing
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    
    // If response is empty, return null
    if (!text || text.trim() === '') {
      return null as T;
    }

    // Parse the response as JSON
    try {
      return JSON.parse(text) as T;
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', text);
      throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Make a PUT request to the API
 * @param url The URL to make the request to
 * @param data The data to send in the request body
 * @returns The parsed JSON response
 */
export async function apiPut<T>(url: string, data: any): Promise<T> {
  try {
    // Make request with explicit headers
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = parseErrorResponse(response, errorText);
      throw new Error(errorMessage);
    }

    // Check if response has content before parsing
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    
    // If response is empty, return null
    if (!text || text.trim() === '') {
      return null as T;
    }

    // Parse the response as JSON
    try {
      return JSON.parse(text) as T;
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', text);
      throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Make a DELETE request to the API
 * @param url The URL to make the request to
 * @returns The parsed JSON response
 */
export async function apiDelete<T>(url: string): Promise<T> {
  try {
    // Make request with explicit headers
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = parseErrorResponse(response, errorText);
      throw new Error(errorMessage);
    }

    // Check if response has content before parsing
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    
    // If response is empty, return null
    if (!text || text.trim() === '') {
      return null as T;
    }

    // Parse the response as JSON
    try {
      return JSON.parse(text) as T;
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', text);
      throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
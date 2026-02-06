import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // First check if we can parse as JSON
      const contentType = res.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        // Include details if available for more informative error messages
        const errorMsg = data.details || data.message || data.error || `${res.status}: ${res.statusText}`;
        const error = new Error(errorMsg);
        // Attach full error data to the error object for access in error handlers
        (error as any).errorData = data;
        throw error;
      } else {
        // Try to get text response
        const text = await res.text();

        // Check if it's HTML with doctype (server error page)
        if (text.includes("<!DOCTYPE")) {
          throw new Error(`Server error (${res.status}): The server returned an HTML page instead of JSON`);
        } else {
          throw new Error(`${res.status}: ${text || res.statusText}`);
        }
      }
    } catch (parseError) {
      if (parseError instanceof Error) {
        throw parseError;
      }
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const isFormData = options?.body instanceof FormData;
  const isString = typeof options?.body === 'string';
  // Robust check for things that should be stringified (plain objects/arrays)
  // vs things that fetch handles natively (FormData, Blob, URLSearchParams)
  const isBlob = options?.body instanceof Blob;
  const isURLSearchParams = options?.body instanceof URLSearchParams;
  const isNativeBody = isFormData || isString || isBlob || isURLSearchParams;

  // If it's not a native body type and it exists, treat it as JSON
  const shouldStringify = options?.body && !isNativeBody;

  if (options?.method === 'POST' || options?.method === 'PUT') {
    console.log('🔍 apiRequest Debug:', {
      url,
      method: options?.method,
      isFormData,
      isString,
      shouldStringify,
      bodyType: typeof options?.body,
      bodyConstructor: options?.body?.constructor?.name,
      headers: options?.headers
    });
  }

  // Explicitly construct headers to ensure Content-Type is set correctly
  const headers = new Headers(options?.headers || {});

  if (shouldStringify) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Accept", "application/json");

  console.log('🔍 apiRequest FINAL CHECK:', {
    shouldStringify,
    originalBodyType: typeof options?.body,
    isNativeBody,
    finalBody: shouldStringify ? JSON.stringify(options.body) : 'NATIVE_BODY',
    headers: Object.fromEntries(headers.entries())
  });

  const res = await fetch(url, {
    ...options,
    body: shouldStringify ? JSON.stringify(options.body) : options?.body as BodyInit,
    headers,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        });

        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null;
        }

        await throwIfResNotOk(res);

        // Safely parse the JSON
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return await res.json();
          } else {
            const text = await res.text();
            if (text.includes("<!DOCTYPE")) {
              throw new Error("Server returned HTML instead of JSON");
            }
            // Try to parse it as JSON anyway
            try {
              return JSON.parse(text);
            } catch (parseError) {
              console.error("Failed to parse response as JSON:", text);
              throw new Error("Invalid response format");
            }
          }
        } catch (parseError) {
          console.error("Error parsing response:", parseError);
          throw parseError;
        }
      } catch (error) {
        console.error("Query error:", error);
        throw error;
      }
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

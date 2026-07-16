"use client";

import {
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from "@tanstack/react-query";
import { useState } from "react";
import { getApiStatus } from "@/lib/api-error";

function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = getApiStatus(error);
  if (status && [401, 403, 404, 409, 410, 422].includes(status)) return false;
  return failureCount < 1;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: shouldRetry,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export type { QueryKey };

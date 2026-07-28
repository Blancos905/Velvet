import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { AdminAuthProvider } from "../auth/AdminAuthProvider";
import { LuxuryAuthProvider } from "../auth/LuxuryAuthProvider";
import { LuxuryFcmTokenSync } from "../components/LuxuryFcmTokenSync";
import { isLikelyNetworkFetchError } from "../api/fetchWithTimeout";

function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (isLikelyNetworkFetchError(error)) {
            return failureCount < 1;
          }
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(750 * 2 ** attempt, 4_000),
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createAppQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <LuxuryAuthProvider>
        <LuxuryFcmTokenSync />
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </LuxuryAuthProvider>
    </QueryClientProvider>
  );
}

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const defaultOptions = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
};

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(defaultOptions));
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

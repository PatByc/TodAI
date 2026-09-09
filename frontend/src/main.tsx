import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { routeTree } from "./routeTree.gen"
import "@/styles/globals.css"

// Create a TanStack Router instance
const router = createRouter({ routeTree })

// Register the router for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Create a TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s
      retry: 1,
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

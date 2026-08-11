'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WalletProvider } from '../components/WalletContext'
import { ToastContainer } from '../components/Toast'
import { useState, ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        {children}
        <ToastContainer />
      </WalletProvider>
    </QueryClientProvider>
  )
}

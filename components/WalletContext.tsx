'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { showToast } from './Toast'

type WalletContextType = {
  connected: boolean
  publicKey: string | null
  connecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  publicKey: null,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      const { requestAccess, getAddress } = await import('@stellar/freighter-api')

      const accessObj = await requestAccess()
      if (accessObj.error) {
        showToast({
          type: 'error',
          title: 'Wallet not found',
          message: 'Install the Freighter extension at freighter.app, then try again.',
        })
        return
      }

      const addrObj = await getAddress()
      if (addrObj.error) {
        showToast({ type: 'error', title: 'Could not read address', message: addrObj.error })
        return
      }

      setPublicKey(addrObj.address)

      // 🎉 Success toast
      const short = `${addrObj.address.slice(0, 6)}...${addrObj.address.slice(-4)}`
      showToast({
        type: 'success',
        title: 'Wallet connected',
        message: `Freighter · ${short} · Stellar Testnet`,
      })
    } catch (err) {
      console.error('Freighter not detected:', err)
      showToast({
        type: 'error',
        title: 'Freighter not detected',
        message: 'Install from freighter.app and refresh the page.',
      })
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setPublicKey(null)
    showToast({ type: 'info', title: 'Wallet disconnected' })
  }, [])

  return (
    <WalletContext.Provider value={{ connected: !!publicKey, publicKey, connecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}

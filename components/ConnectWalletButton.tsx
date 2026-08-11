'use client'
import { useWallet } from './WalletContext'

export function ConnectWalletButton() {
  const { connected, publicKey, connecting, connect, disconnect } = useWallet()

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/25">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="font-mono text-xs text-success">
            {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="text-xs text-muted hover:text-primary transition-colors px-2 py-1 rounded hover:bg-elevated"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="btn-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-60"
      id="connect-wallet-btn"
    >
      {connecting ? (
        <>
          <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
          </svg>
          Connect Wallet
        </>
      )}
    </button>
  )
}

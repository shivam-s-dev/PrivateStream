'use client'
import { useState, useRef, useEffect } from 'react'
import { useWallet } from './WalletContext'

export function ConnectWalletButton() {
  const { connected, publicKey, connecting, connect, disconnect } = useWallet()

  if (connected && publicKey) {
    return (
      <div className="inline-flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/25">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="font-mono text-xs text-success break-all max-w-[200px] truncate" title={publicKey}>
            {publicKey}
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

  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [dropdownRef])

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={connecting}
        className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2 disabled:opacity-60"
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

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-elevated border border-border ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            <button
              onClick={() => { connect(); setShowDropdown(false) }}
              className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-surface hover:text-accent"
              role="menuitem"
            >
              Freighter
            </button>
            <div className="relative group block w-full text-left px-4 py-2 text-sm text-muted cursor-not-allowed" role="menuitem">
              xBull <span className="text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded ml-2">Coming Soon</span>
            </div>
            <div className="relative group block w-full text-left px-4 py-2 text-sm text-muted cursor-not-allowed" role="menuitem">
              Albedo <span className="text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded ml-2">Coming Soon</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

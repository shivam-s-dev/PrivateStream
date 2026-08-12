'use client'
import { use, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ConnectWalletButton } from '../../../components/ConnectWalletButton'
import { useWallet } from '../../../components/WalletContext'

const C = {
  base: '#08080E', surface: '#0F0F1A', elevated: '#17172A',
  border: '#2C2C45', borderStrong: '#44446A',
  primary: '#EEEEFF', secondary: '#9898BB', muted: '#5A5A7A',
  accent: '#7B6FFF', accentLight: '#9088FF', success: '#22D3A0',
}

type Dataset = {
  id: string
  title: string
  description: string
  category: string
  pricePerSecond: number
  provider: { displayName: string; walletAddress: string }
}

export default function DatasetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { connected, publicKey } = useWallet()
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [budget, setBudget] = useState('1.00')

  useEffect(() => {
    async function fetchDataset() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const res = await fetch(`${apiUrl}/api/datasets/${id}`, { signal: AbortSignal.timeout(4000) })
        if (res.ok) {
          setDataset(await res.json())
          return
        }
      } catch { /* API offline — fall back to list endpoint */ }

      // Try the list endpoint as a fallback (already fetched on explore page)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const res = await fetch(`${apiUrl}/api/datasets`, { signal: AbortSignal.timeout(4000) })
        if (res.ok) {
          const all: Dataset[] = await res.json()
          const found = all.find(d => d.id === id)
          if (found) { setDataset(found); return }
        }
      } catch { /* both failed */ }

      setLoading(false)
    }
    fetchDataset().finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!dataset) {
    return (
      <div style={{ minHeight: '100vh', background: C.base, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: C.secondary }}>Dataset not found or the API is offline.</p>
        <Link href="/explore" className="btn-primary">← Back to Explore</Link>
      </div>
    )
  }

  const estimatedCostPerMinute = (dataset.pricePerSecond * 60).toFixed(4)

  return (
    <div style={{ minHeight: '100vh', background: C.base, color: C.primary }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${C.border}`, background: 'rgba(8,8,14,0.85)', backdropFilter: 'blur(12px)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/explore" style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.secondary, fontSize: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Explore
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/logo.png" alt="PrivateStream" width={22} height={22} style={{ borderRadius: 5, objectFit: 'contain' }} />
          <ConnectWalletButton />
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Category badge */}
          <span style={{ background: `${C.accent}18`, color: C.accentLight, border: `1px solid ${C.accent}30`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-block', marginBottom: 20 }}>
            {dataset.category.replace(/_/g, ' ')}
          </span>

          <h1 style={{ fontSize: 30, fontWeight: 800, color: C.primary, letterSpacing: '-0.02em', marginBottom: 12 }}>{dataset.title}</h1>
          <p style={{ fontSize: 16, color: C.secondary, lineHeight: 1.7, marginBottom: 36 }}>{dataset.description}</p>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="stat-card">
              <span className="stat-label">Price per second</span>
              <span className="stat-value" style={{ fontSize: 20, color: C.accent, fontFamily: 'monospace' }}>
                ${Number(dataset.pricePerSecond).toFixed(6)}
              </span>
              <span className="stat-sub">USDC / sec</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Est. cost per minute</span>
              <span className="stat-value" style={{ fontSize: 20, fontFamily: 'monospace' }}>
                ${estimatedCostPerMinute}
              </span>
              <span className="stat-sub">USDC</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Provider</span>
              <span className="stat-value" style={{ fontSize: 16 }}>{dataset.provider.displayName}</span>
              <span className="stat-sub" style={{ fontFamily: 'monospace', fontSize: 10 }}>
                {dataset.provider.walletAddress.slice(0, 6)}...{dataset.provider.walletAddress.slice(-4)}
              </span>
            </div>
          </div>

          {/* Privacy callout */}
          <div style={{ background: `${C.accent}0E`, border: `1px solid ${C.accent}28`, borderRadius: 16, padding: 20, marginBottom: 28, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>🔐</span>
            <div>
              <p style={{ fontWeight: 600, color: C.primary, fontSize: 14, marginBottom: 6 }}>Confidential payment settlement</p>
              <p style={{ fontSize: 13, color: C.secondary, lineHeight: 1.6 }}>
                When you open a session, payments are routed through Stellar Confidential Tokens.
                The amount you pay is hidden on-chain via Pedersen commitments — your wallet address is visible for compliance, but the amount stays private.
              </p>
            </div>
          </div>

          {/* CTA */}
          {connected ? (
            <motion.div whileHover={{ y: -2 }} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 }}>
              <h2 style={{ fontWeight: 700, color: C.primary, marginBottom: 8, fontSize: 16 }}>Open an MPP Session</h2>
              <p style={{ fontSize: 14, color: C.secondary, marginBottom: 20 }}>
                Set a USDC budget. Data streams immediately and payments tick per second. Close any time — you only pay for what you used.
              </p>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
                Connected as: <span style={{ fontFamily: 'monospace', color: C.secondary }}>{publicKey?.slice(0, 8)}...{publicKey?.slice(-6)}</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  id="session-budget"
                  type="number"
                  placeholder="Budget (USDC)"
                  min="0.01"
                  step="0.01"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  style={{ flex: 1, background: C.elevated, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.primary, fontSize: 14, outline: 'none', fontFamily: 'monospace' }}
                />
                <Link
                  href={`/session/${id}?budget=${budget}&datasetId=${id}`}
                  className="btn-primary"
                  style={{ padding: '10px 24px', flexShrink: 0, fontSize: 14 }}
                >
                  Open Session
                </Link>
              </div>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
                Estimated stream time: ~{Math.floor(parseFloat(budget || '1') / dataset.pricePerSecond)}s at this price
              </p>
            </motion.div>
          ) : (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 32, textAlign: 'center' }}>
              <p style={{ color: C.secondary, marginBottom: 20, fontSize: 15 }}>
                Connect your Freighter wallet to open an MPP session
              </p>
              <ConnectWalletButton />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

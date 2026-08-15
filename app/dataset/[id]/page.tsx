'use client'
import { use, useEffect, useState, useCallback } from 'react'
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
  warning: '#FBBF24', danger: '#F75270',
}

type Dataset = {
  id: string
  title: string
  description: string
  category: string
  pricePerSecond: number
  totalEarned: number
  totalSessions: number
  provider: { displayName: string; walletAddress: string }
}

type ProviderStats = {
  totalEarned: number
  totalSessions: number
  activeSessions: number
  recentSessions: { id: string; status: string; budgetUsdc: number; spentUsdc: number; openedAt: string }[]
  liveSample: any
}

export default function DatasetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { connected, publicKey } = useWallet()
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [budget, setBudget] = useState('1.00')
  const [stats, setStats] = useState<ProviderStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  useEffect(() => {
    async function fetchDataset() {
      try {
        const res = await fetch(`${apiUrl}/api/datasets/${id}`, { signal: AbortSignal.timeout(4000) })
        if (res.ok) { setDataset(await res.json()); return }
      } catch { /* fallback */ }
      try {
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
  }, [id, apiUrl])

  const isOwner = !!(dataset && publicKey && dataset.provider.walletAddress === publicKey)

  const fetchStats = useCallback(async () => {
    if (!publicKey || !dataset) return
    setLoadingStats(true)
    try {
      const res = await fetch(`${apiUrl}/api/datasets/${id}/stats?walletAddress=${publicKey}`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) setStats(await res.json())
    } catch { /* silently fail */ }
    finally { setLoadingStats(false) }
  }, [publicKey, dataset, id, apiUrl])

  useEffect(() => {
    if (!isOwner) return
    fetchStats()
    const iv = setInterval(fetchStats, 10000)
    return () => clearInterval(iv)
  }, [isOwner, fetchStats])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!dataset) return (
    <div style={{ minHeight: '100vh', background: C.base, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <p style={{ color: C.secondary }}>Dataset not found or the API is offline.</p>
      <Link href="/explore" className="btn-primary">← Back to Explore</Link>
    </div>
  )

  const estimatedCostPerMinute = (Number(dataset.pricePerSecond) * 60).toFixed(4)

  return (
    <div style={{ minHeight: '100vh', background: C.base, color: C.primary }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${C.border}`, background: 'rgba(8,8,14,0.85)', backdropFilter: 'blur(12px)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/explore" style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.secondary, fontSize: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Back to Explore
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/logo.png" alt="PrivateStream" width={22} height={22} style={{ borderRadius: 5, objectFit: 'contain' }} />
          <ConnectWalletButton />
        </div>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span style={{ background: `${C.accent}18`, color: C.accentLight, border: `1px solid ${C.accent}30`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-block', marginBottom: 20 }}>
            {dataset.category.replace(/_/g, ' ')}
          </span>

          <h1 style={{ fontSize: 30, fontWeight: 800, color: C.primary, letterSpacing: '-0.02em', marginBottom: 12 }}>{dataset.title}</h1>
          <p style={{ fontSize: 16, color: C.secondary, lineHeight: 1.7, marginBottom: 36 }}>{dataset.description}</p>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="stat-card">
              <span className="stat-label">Price per second</span>
              <span className="stat-value" style={{ fontSize: 20, color: C.accent, fontFamily: 'monospace' }}>${Number(dataset.pricePerSecond).toFixed(6)}</span>
              <span className="stat-sub">USDC / sec</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Est. cost per minute</span>
              <span className="stat-value" style={{ fontSize: 20, fontFamily: 'monospace' }}>${estimatedCostPerMinute}</span>
              <span className="stat-sub">USDC</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Provider</span>
              <span className="stat-value" style={{ fontSize: 16 }}>{dataset.provider.displayName}</span>
              <span className="stat-sub" style={{ fontFamily: 'monospace', fontSize: 10 }}>{dataset.provider.walletAddress.slice(0, 6)}...{dataset.provider.walletAddress.slice(-4)}</span>
            </div>
          </div>

          {/* ── PROVIDER MONITOR PANEL — only visible to dataset owner ── */}
          {isOwner && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: C.primary, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.success, display: 'inline-block' }} />
                  Provider Monitor
                </h2>
                <button onClick={fetchStats} disabled={loadingStats}
                  style={{ fontSize: 12, color: C.muted, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                  {loadingStats ? 'Refreshing…' : '↻ Refresh'}
                </button>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Active Sessions', value: stats ? String(stats.activeSessions) : '—', color: stats?.activeSessions ? C.success : C.muted },
                  { label: 'Total Sessions',  value: stats ? String(stats.totalSessions)  : '—', color: C.primary },
                  { label: 'Total Earned',    value: stats ? `$${Number(stats.totalEarned).toFixed(4)}` : '—', color: C.accent },
                ].map(k => (
                  <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
                    <p style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{k.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'monospace' }}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Recent Sessions table */}
              {stats && stats.recentSessions.length > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Recent Sessions
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          {['Session ID', 'Status', 'Budget', 'Earned', 'Opened'].map(h => (
                            <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: C.muted, fontWeight: 500, fontSize: 11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentSessions.map((s, i) => (
                          <tr key={s.id} style={{ borderBottom: i < stats.recentSessions.length - 1 ? `1px solid ${C.border}` : 'none', background: i % 2 === 0 ? 'transparent' : `${C.elevated}55` }}>
                            <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: C.muted, fontSize: 11 }}>{s.id.slice(0, 14)}…</td>
                            <td style={{ padding: '9px 14px' }}>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: s.status === 'OPEN' ? `${C.success}18` : `${C.muted}18`, color: s.status === 'OPEN' ? C.success : C.muted, fontWeight: 600 }}>
                                {s.status}
                              </span>
                            </td>
                            <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: C.secondary }}>${Number(s.budgetUsdc).toFixed(4)}</td>
                            <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: C.accent }}>${Number(s.spentUsdc ?? 0).toFixed(4)}</td>
                            <td style={{ padding: '9px 14px', color: C.muted, fontSize: 11 }}>{new Date(s.openedAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Live data sample from provider's own endpoint */}
              {stats?.liveSample && (
                <div style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.success, display: 'inline-block' }} />
                    Live Data Sample (your endpoint)
                  </div>
                  <pre style={{ padding: 16, fontSize: 11, color: C.secondary, overflowX: 'auto', margin: 0, maxHeight: 220, overflowY: 'auto', lineHeight: 1.6 }}>
                    {JSON.stringify(stats.liveSample, null, 2).slice(0, 1500)}
                  </pre>
                </div>
              )}
            </motion.div>
          )}

          {/* Privacy callout */}
          <div style={{ background: `${C.accent}0E`, border: `1px solid ${C.accent}28`, borderRadius: 16, padding: 20, marginBottom: 28, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>🔐</span>
            <div>
              <p style={{ fontWeight: 600, color: C.primary, fontSize: 14, marginBottom: 6 }}>Confidential payment settlement</p>
              <p style={{ fontSize: 13, color: C.secondary, lineHeight: 1.6 }}>
                Payments are routed through Stellar Confidential Tokens. Amounts are hidden on-chain via Pedersen commitments — wallet addresses visible for compliance, amounts stay private.
              </p>
            </div>
          </div>

          {/* CTA — only show to buyers, not to the owner */}
          {!isOwner && (
            connected ? (
              <motion.div whileHover={{ y: -2 }} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 }}>
                <h2 style={{ fontWeight: 700, color: C.primary, marginBottom: 4, fontSize: 16 }}>Open an MPP Session</h2>
                <div style={{ fontSize: 11, color: C.accent, marginBottom: 8, background: `${C.accent}15`, padding: '4px 8px', borderRadius: 4, display: 'inline-block' }}>
                  ℹ️ <b>Micropayment Channel (MPP):</b> Streams data instantly without blockchain fees per second. Settlement happens only once when you close!
                </div>
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
                  <Link href={`/session/${id}?budget=${budget}&datasetId=${id}`} className="btn-primary" style={{ padding: '10px 24px', flexShrink: 0, fontSize: 14 }}>
                    Open Session
                  </Link>
                </div>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
                  Estimated stream time: ~{Math.floor(parseFloat(budget || '1') / Number(dataset.pricePerSecond))}s at this price
                </p>
              </motion.div>
            ) : (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 32, textAlign: 'center' }}>
                <p style={{ color: C.secondary, marginBottom: 20, fontSize: 15 }}>Connect your Freighter wallet to open an MPP session</p>
                <ConnectWalletButton />
              </div>
            )
          )}
        </motion.div>
      </div>
    </div>
  )
}

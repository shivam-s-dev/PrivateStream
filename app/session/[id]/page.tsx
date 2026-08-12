'use client'
import { useEffect, useState, useCallback, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ConnectWalletButton } from '../../../components/ConnectWalletButton'
import { useWallet } from '../../../components/WalletContext'

const C = {
  base: '#08080E', surface: '#0F0F1A', elevated: '#17172A',
  border: '#2C2C45', primary: '#EEEEFF', secondary: '#9898BB',
  muted: '#5A5A7A', accent: '#7B6FFF', success: '#22D3A0',
  warning: '#FBBF24', danger: '#F75270',
}

type SessionState = {
  status: 'OPEN' | 'CLOSED'
  spent: number
  budget: number
  dataPoints: number
  duration: number
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const budgetParam = parseFloat(searchParams.get('budget') ?? '1.00')
  const datasetId = searchParams.get('datasetId') ?? id

  const { publicKey } = useWallet()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [openingSession, setOpeningSession] = useState(false)
  const [state, setState] = useState<SessionState>({ status: 'OPEN', spent: 0, budget: budgetParam, dataPoints: 0, duration: 0 })
  const [apiOnline, setApiOnline] = useState(false)
  const [closing, setClosing] = useState(false)
  const [settlementHash, setSettlementHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamData, setStreamData] = useState<any>(null)
  const [streamTitle, setStreamTitle] = useState<string>('')

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  // Step 1: Open session via API on mount (if wallet connected and no session yet)
  useEffect(() => {
    if (!publicKey || sessionId || openingSession) return

    // If the URL ID looks like an existing session CUID, verify it via API directly
    async function openSession() {
      setOpeningSession(true)
      try {
        const res = await fetch(`${apiUrl}/api/sessions/open`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ datasetId, budgetUsdc: budgetParam, walletAddress: publicKey }),
          signal: AbortSignal.timeout(10000)
        })
        if (res.ok) {
          const data = await res.json()
          setSessionId(data.sessionId)
          setStreamTitle(data.datasetTitle || 'Data Stream')
          setApiOnline(true)
        } else {
          const errData = await res.json().catch(() => ({}))
          setError(errData.error || 'Could not open session. Please try again.')
          setSessionId(id)
        }
      } catch {
        setError('Could not connect to PrivateStream API. Please check your connection and try again.')
        setSessionId(id)
        setApiOnline(false)
      } finally {
        setOpeningSession(false)
      }
    }

    openSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  // Step 2: Poll /state every 2s once we have a session ID
  const poll = useCallback(async () => {
    if (!sessionId) return
    try {
      // Call /stream — this fetches real data from the provider AND ticks the spend counter in Redis
      const streamRes = await fetch(`${apiUrl}/api/sessions/${sessionId}/stream`, { signal: AbortSignal.timeout(4000) })
      if (streamRes.ok) {
        const data = await streamRes.json()
        setStreamData(data)
        setApiOnline(true)
      }
    } catch { /* stream fetch failed, still try state */ }

    // Always also poll /state to get accurate spend/duration figures
    try {
      const stateRes = await fetch(`${apiUrl}/api/sessions/${sessionId}/state`, { signal: AbortSignal.timeout(3000) })
      if (stateRes.ok) {
        const data = await stateRes.json()
        setState({
          status: data.status,
          spent: Number(data.spent ?? 0),
          budget: Number(data.budget ?? budgetParam),
          dataPoints: Number(data.dataPoints ?? 0),
          duration: Number(data.duration ?? 0),
        })
        setApiOnline(true)
        return
      }
    } catch { /* fall through to simulation */ }

    // Offline fallback simulation
    setApiOnline(false)
    setState(prev => {
      if (prev.status === 'CLOSED') return prev
      const newSpent = Math.min(prev.spent + 0.000042, prev.budget)
      return {
        ...prev,
        spent: newSpent,
        dataPoints: prev.dataPoints + 1,
        duration: prev.duration + 2,
        status: newSpent >= prev.budget ? 'CLOSED' : 'OPEN',
      }
    })
  }, [sessionId, apiUrl, budgetParam])

  useEffect(() => {
    if (!sessionId) return
    poll()
    const iv = setInterval(poll, 2000)
    return () => clearInterval(iv)
  }, [poll, sessionId])

  // Step 3: Close & settle
  async function handleClose() {
    if (!sessionId) return
    setClosing(true)
    setError(null)
    try {
      if (apiOnline) {
        const res = await fetch(`${apiUrl}/api/sessions/${sessionId}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spent: state.spent, walletAddress: publicKey }),
          signal: AbortSignal.timeout(20000) // Stellar consensus can take ~5s
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Settlement could not be completed. Please try again.')
          return
        }
        setSettlementHash(data.hash)
      } else {
        setError('Cannot settle: connection to PrivateStream API was lost. Please refresh and try again.')
        return
      }
      setState(prev => ({ ...prev, status: 'CLOSED' }))
    } finally {
      setClosing(false)
    }
  }

  const budgetPct = state.budget > 0 ? (state.spent / state.budget) * 100 : 0
  const barColor = budgetPct > 80 ? C.danger : budgetPct > 60 ? C.warning : C.accent
  const displayId = sessionId ?? id

  if (openingSession) {
    return (
      <div style={{ minHeight: '100vh', background: C.base, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: C.secondary, fontSize: 14 }}>Opening session on PrivateStream API…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.base, color: C.primary }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${C.border}`, background: 'rgba(8,8,14,0.85)', backdropFilter: 'blur(12px)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.secondary, fontSize: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/logo.png" alt="PrivateStream" width={22} height={22} style={{ borderRadius: 5, objectFit: 'contain' }} />
          <ConnectWalletButton />
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-7">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: C.primary }}>Live Session</h1>
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: C.muted, marginTop: 4 }}>{displayId}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* API status badge */}
            <span style={{ fontSize: 11, color: apiOnline ? C.success : C.warning, background: apiOnline ? `${C.success}15` : `${C.warning}15`, border: `1px solid ${apiOnline ? C.success : C.warning}30`, padding: '3px 10px', borderRadius: 99 }}>
              {apiOnline ? '● API Live' : '○ API Offline (simulated)'}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '5px 14px', borderRadius: 99,
              background: state.status === 'OPEN' ? `${C.success}15` : `${C.muted}20`,
              color: state.status === 'OPEN' ? C.success : C.muted,
              border: `1px solid ${state.status === 'OPEN' ? C.success + '35' : C.border}`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: state.status === 'OPEN' ? C.success : C.muted, display: 'inline-block' }} />
              {state.status}
            </span>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Spent',       value: `$${Number(state.spent).toFixed(6)}`,        color: C.accent  },
            { label: 'Budget',      value: `$${Number(state.budget).toFixed(2)}`,        color: C.primary },
            { label: 'Data points', value: state.dataPoints.toLocaleString(),            color: C.primary },
            { label: 'Duration',    value: formatDuration(Number(state.duration)),       color: C.primary },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'monospace', letterSpacing: '-0.01em' }}>{s.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Budget bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
            <span style={{ color: C.secondary }}>Budget used</span>
            <span style={{ color: C.primary, fontWeight: 600 }}>{budgetPct.toFixed(2)}%</span>
          </div>
          <div style={{ height: 10, background: C.elevated, borderRadius: 99, overflow: 'hidden' }}>
            <motion.div animate={{ width: `${Math.min(budgetPct, 100)}%` }} transition={{ duration: 0.5 }}
              style={{ height: '100%', background: barColor, borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginTop: 8 }}>
            <span>$0</span>
            <span style={{ color: C.success }}>🔐 Payments hidden via Confidential Tokens</span>
            <span>${Number(state.budget).toFixed(2)}</span>
          </div>
        </motion.div>

        {/* ── YOUR STREAMING ENDPOINT ── */}
        {sessionId && state.status === 'OPEN' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: C.surface, border: `1px solid ${C.accent}40`, borderRadius: 14, padding: 20, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>🔗</span>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>Your Authorized Streaming Endpoint</h3>
            </div>
            <p style={{ fontSize: 12, color: C.secondary, marginBottom: 12, lineHeight: 1.6 }}>
              Use this URI in your app or scripts to fetch real-time data. Every call deducts from your budget at the dataset&apos;s rate.
            </p>
            <div style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <code style={{ fontSize: 12, color: '#9088FF', wordBreak: 'break-all', flex: 1, fontFamily: 'monospace' }}>
                {apiUrl}/api/sessions/{sessionId}/stream
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${apiUrl}/api/sessions/${sessionId}/stream`)
                  const btn = document.getElementById('copy-uri-btn')
                  if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => { if (btn) btn.textContent = 'Copy URI' }, 2000) }
                }}
                id="copy-uri-btn"
                style={{ fontSize: 12, color: C.primary, background: `${C.accent}25`, border: `1px solid ${C.accent}40`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', flexShrink: 0, fontWeight: 600 }}
              >
                Copy URI
              </button>
            </div>
            <div style={{ background: '#0A0A16', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ fontSize: 10, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>curl example</p>
              <code style={{ fontSize: 11, color: C.success, wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {`curl "${apiUrl}/api/sessions/${sessionId}/stream"`}
              </code>
            </div>
          </motion.div>
        )}

        {/* Privacy note */}
        <div style={{ background: `${C.accent}0E`, border: `1px solid ${C.accent}28`, borderRadius: 14, padding: 16, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🔐</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.primary, marginBottom: 3 }}>Payments routed through Confidential Tokens</p>
            <p style={{ fontSize: 12, color: C.secondary, lineHeight: 1.5 }}>Amount hidden on-chain via Pedersen commitments. Wallet addresses visible. Compliant with auditor key.</p>
          </div>
        </div>

        {/* ── LIVE DATA FEED — what the buyer is actually streaming ── */}
        {state.status === 'OPEN' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: apiOnline ? C.success : C.muted, display: 'inline-block', animation: apiOnline ? 'pulse 1.5s infinite' : 'none' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>
                  {streamTitle || 'Live Data Stream'}
                </span>
              </div>
              <span style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>
                {state.dataPoints} records received · refreshes every 2s
              </span>
            </div>
            <div style={{ padding: 16, minHeight: 120 }}>
              {streamData ? (
                <pre style={{ margin: 0, fontSize: 11, color: C.secondary, overflowX: 'auto', maxHeight: 260, overflowY: 'auto', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(streamData, null, 2).slice(0, 2000)}
                </pre>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, gap: 10, color: C.muted, fontSize: 13 }}>
                  <div style={{ width: 16, height: 16, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Fetching first data packet…
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: `${C.danger}10`, border: `1px solid ${C.danger}30`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: C.danger }}>
            ⚠️ {error}
          </div>
        )}

        {/* Close / Settled */}
        {state.status === 'OPEN' && (
          <motion.button onClick={handleClose} disabled={closing} whileTap={{ scale: 0.97 }}
            id="close-session-btn"
            style={{
              width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: `${C.danger}12`, color: C.danger, border: `1.5px solid ${C.danger}35`,
              borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'background 0.15s',
              opacity: closing ? 0.55 : 1,
            }}>
            {closing ? <>
              <span style={{ width: 16, height: 16, border: `2px solid ${C.danger}40`, borderTopColor: C.danger, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              Settling on Stellar… (waiting for network)
            </> : 'Close session & settle'}
          </motion.button>
        )}

        {state.status === 'CLOSED' && (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            {settlementHash && (
              <div style={{ marginBottom: 24, padding: '20px', background: `${C.success}10`, border: `1px solid ${C.success}30`, borderRadius: 16, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: C.success }}>Settlement Confirmed on Stellar Testnet</h3>
                </div>
                <p style={{ fontSize: 13, color: C.secondary, marginBottom: 16, lineHeight: 1.5 }}>
                  A real transaction was submitted to the Stellar Testnet. The memo field contains your session ID for auditing.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.elevated, padding: '12px 16px', borderRadius: 10, border: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.muted, wordBreak: 'break-all' }}>
                    {settlementHash}
                  </span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${settlementHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, color: C.accent, textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                  >
                    View on Stellar Expert ↗
                  </a>
                </div>
              </div>
            )}
            <Link href="/dashboard" className="btn-primary" style={{ padding: '12px 32px', fontSize: 15 }}>Back to dashboard</Link>
          </div>
        )}
      </div>
    </div>
  )
}

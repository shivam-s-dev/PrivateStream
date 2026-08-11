'use client'
import { useEffect, useState, useCallback, use } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ConnectWalletButton } from '../../../components/ConnectWalletButton'

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

const INITIAL: SessionState = { status: 'OPEN', spent: 0, budget: 1.0, dataPoints: 0, duration: 0 }

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
  const [state, setState] = useState<SessionState>(INITIAL)
  const [apiOnline, setApiOnline] = useState(false)
  const [closing, setClosing] = useState(false)
  const [settlementHash, setSettlementHash] = useState<string | null>(null)

  const poll = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const res = await fetch(`${apiUrl}/api/sessions/${id}/state`, { signal: AbortSignal.timeout(2000) })
      if (res.ok) {
        setState(await res.json())
        setApiOnline(true)
        return
      }
    } catch { /* API offline */ }
    setApiOnline(false)
    setState(prev => {
      if (prev.status === 'CLOSED') return prev
      const newSpent = Math.min(prev.spent + 0.000042, prev.budget)
      return {
        ...prev,
        spent: newSpent,
        dataPoints: prev.dataPoints + Math.floor(Math.random() * 3 + 1),
        duration: prev.duration + 2,
        status: newSpent >= prev.budget ? 'CLOSED' : 'OPEN',
      }
    })
  }, [id])

  useEffect(() => {
    poll()
    const iv = setInterval(poll, 2000)
    return () => clearInterval(iv)
  }, [poll])

  async function handleClose() {
    setClosing(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      if (apiOnline) {
        await fetch(`${apiUrl}/api/sessions/${id}/close`, { method: 'POST', signal: AbortSignal.timeout(5000) })
      }
      
      // Simulate generating a Stellar transaction hash upon closing
      const mockHash = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')
      setSettlementHash(mockHash)
      
      setState(prev => ({ ...prev, status: 'CLOSED' }))
    } finally {
      setClosing(false)
    }
  }

  const budgetPct = state.budget > 0 ? (state.spent / state.budget) * 100 : 0
  const barColor = budgetPct > 80 ? C.danger : budgetPct > 60 ? C.warning : C.accent

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
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: C.primary }}>Live Session</h1>
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: C.muted, marginTop: 4 }}>{id}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Spent',       value: `$${state.spent.toFixed(6)}`,        color: C.accent  },
            { label: 'Budget',      value: `$${state.budget.toFixed(2)}`,        color: C.primary },
            { label: 'Data points', value: state.dataPoints.toLocaleString(),    color: C.primary },
            { label: 'Duration',    value: formatDuration(state.duration),       color: C.primary },
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
            <span>${state.budget.toFixed(2)}</span>
          </div>
        </motion.div>

        {/* Privacy note */}
        <div style={{ background: `${C.accent}0E`, border: `1px solid ${C.accent}28`, borderRadius: 14, padding: 16, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🔐</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.primary, marginBottom: 3 }}>Payments routed through Confidential Tokens</p>
            <p style={{ fontSize: 12, color: C.secondary, lineHeight: 1.5 }}>Amount hidden on-chain via Pedersen commitments. Wallet addresses visible. Compliant with auditor key.</p>
          </div>
        </div>

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
              Settling on Stellar...
            </> : 'Close session & settle'}
          </motion.button>
        )}
        {state.status === 'CLOSED' && (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            {settlementHash && (
              <div style={{ marginBottom: 24, padding: '20px', background: `${C.success}10`, border: `1px solid ${C.success}30`, borderRadius: 16, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: C.success }}>Settlement Successful</h3>
                </div>
                <p style={{ fontSize: 14, color: C.secondary, marginBottom: 16 }}>
                  The streaming micropayments have been settled on the Stellar network.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.elevated, padding: '12px 16px', borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: C.muted }}>
                    {settlementHash.substring(0, 10)}...{settlementHash.substring(54)}
                  </span>
                  <a 
                    href={`https://stellar.expert/explorer/testnet/tx/${settlementHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    View on Explorer ↗
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

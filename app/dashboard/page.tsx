'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ConnectWalletButton } from '../../components/ConnectWalletButton'
import { useWallet } from '../../components/WalletContext'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

const STATUS_STYLE: Record<string, string> = {
  OPEN:    'badge-success',
  CLOSED:  'badge-muted',
  EXPIRED: 'badge-warning',
}

// ── Shared nav ─────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid #2C2C45', background: 'rgba(8,8,14,0.85)', backdropFilter: 'blur(12px)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Image src="/logo.png" alt="PrivateStream" width={26} height={26} style={{ borderRadius: 6, objectFit: 'contain' }} />
        <span style={{ fontWeight: 600, color: '#EEEEFF', fontSize: 15 }}>PrivateStream</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/explore" style={{ color: '#9898BB', fontSize: 14, transition: 'color 0.15s' }} className="hover-text-primary">Explore</Link>
        <ConnectWalletButton />
      </div>
    </nav>
  )
}

// ── Not-connected gate ─────────────────────────────────────────────────────
function WalletGate() {
  return (
    <div style={{ minHeight: '100vh', background: '#08080E', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 400 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(123,111,255,0.1)', border: '1.5px solid rgba(123,111,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 30 }}>
            🔐
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#EEEEFF', marginBottom: 10, letterSpacing: '-0.02em' }}>
            Connect your wallet
          </h1>
          <p style={{ color: '#9898BB', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
            Your Dashboard is private. Connect your Freighter wallet to view your sessions, earnings, and privacy status.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ConnectWalletButton />
          </div>
          <p style={{ color: '#5A5A7A', fontSize: 12, marginTop: 20 }}>
            Don&apos;t have Freighter?{' '}
            <a href="https://www.freighter.app" target="_blank" rel="noreferrer" style={{ color: '#9088FF' }}>
              Install it free →
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

type Session = {
  id: string
  dataset: { title: string }
  status: string
  spentUsdc: number
  budgetUsdc: number
  createdAt: string
}

export default function DashboardPage() {
  const { connected, publicKey } = useWallet()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSession, setLoadingSession] = useState(true)
  const [apiOnline, setApiOnline] = useState(false)

  useEffect(() => {
    if (!connected || !publicKey) return
    async function fetchSessions() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const res = await fetch(`${apiUrl}/api/sessions?walletAddress=${publicKey}`, {
          signal: AbortSignal.timeout(4000)
        })
        if (res.ok) {
          setSessions(await res.json())
          setApiOnline(true)
        }
      } catch {
        setApiOnline(false)
      } finally {
        setLoadingSession(false)
      }
    }
    fetchSessions()
  }, [connected, publicKey])

  if (!connected) return <WalletGate />

  const totalSpent    = sessions.reduce((a, s) => a + (s.spentUsdc ?? 0), 0)
  const openSessions  = sessions.filter(s => s.status === 'OPEN').length

  // Earnings chart — derived from closed sessions by day
  const earningsData = [
    { day: 'Mon', usdc: 0 }, { day: 'Tue', usdc: 0 }, { day: 'Wed', usdc: 0 },
    { day: 'Thu', usdc: 0 }, { day: 'Fri', usdc: 0 }, { day: 'Sat', usdc: 0 }, { day: 'Sun', usdc: 0 },
  ]
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  sessions.forEach(s => {
    const day = days[new Date(s.createdAt).getDay()]
    const entry = earningsData.find(e => e.day === day)
    if (entry) entry.usdc += s.spentUsdc ?? 0
  })
  const totalEarnings = earningsData.reduce((a, e) => a + e.usdc, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#08080E', color: '#EEEEFF' }}>
      <Nav />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#EEEEFF', letterSpacing: '-0.02em', marginBottom: 4 }}>Dashboard</h1>
            <p className="address">{publicKey?.slice(0, 14)}...{publicKey?.slice(-10)}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: apiOnline ? '#22D3A0' : '#FBBF24', background: apiOnline ? 'rgba(34,211,160,0.1)' : 'rgba(251,191,36,0.1)', border: `1px solid ${apiOnline ? 'rgba(34,211,160,0.25)' : 'rgba(251,191,36,0.25)'}`, padding: '3px 10px', borderRadius: 99 }}>
              {apiOnline ? '● API Live' : '○ API Offline'}
            </span>
            <Link href="/dataset/create" style={{ padding: '8px 18px', fontSize: 14, color: '#9898BB', border: '1px solid #2C2C45', borderRadius: 8, transition: 'all 0.2s' }} className="hover:bg-[#1A1A2B] hover:text-[#EEEEFF]">
              List Dataset
            </Link>
            <Link href="/explore" className="btn-primary" style={{ padding: '8px 18px', fontSize: 14 }}>
              + Open Session
            </Link>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          {[
            { label: 'Total spent',     value: `$${totalSpent.toFixed(4)}`,        sub: 'USDC (buyer)',    color: '#EEEEFF' },
            { label: 'Sessions opened', value: String(sessions.length),            sub: 'all time',        color: '#EEEEFF' },
            { label: 'Total earned',    value: `$${totalEarnings.toFixed(4)}`,      sub: 'USDC (provider)', color: '#7B6FFF' },
            { label: 'Active now',      value: String(openSessions),               sub: 'live sessions',   color: '#22D3A0' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="stat-card">
              <span className="stat-label">{s.label}</span>
              <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
              <span className="stat-sub">{s.sub}</span>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">

          {/* Earnings chart */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="card">
            <p className="stat-label" style={{ marginBottom: 4 }}>Weekly spend (buyer)</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#22D3A0', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
              ${totalEarnings.toFixed(4)} <span style={{ fontSize: 13, color: '#9898BB', fontFamily: 'inherit' }}>USDC</span>
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={earningsData}>
                <defs>
                  <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22D3A0" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22D3A0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: '#5A5A7A', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#17172A', border: '1px solid #2C2C45', borderRadius: 10, fontSize: 12, color: '#EEEEFF' }}
                  formatter={(v: unknown) => [`$${(v as number).toFixed(4)}`, 'USDC']}
                />
                <Area type="monotone" dataKey="usdc" stroke="#22D3A0" strokeWidth={2} fill="url(#earnGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Privacy card */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <p className="stat-label" style={{ marginBottom: 16 }}>Privacy status</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Payment amounts',  status: 'Hidden via CT',         icon: '🔐', ok: true  },
                  { label: 'Wallet addresses', status: 'Visible (compliant)',    icon: '👁️', ok: false },
                  { label: 'Auditor key',      status: 'Configured',            icon: '🔑', ok: true  },
                  { label: 'Settlement',       status: 'Confidential Token',    icon: '⚡', ok: true  },
                ].map(p => (
                  <div key={p.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#9898BB', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{p.icon}</span>{p.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: p.ok ? '#22D3A0' : '#5A5A7A' }}>{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #2C2C45' }}>
              <p style={{ fontSize: 11, color: '#5A5A7A', marginBottom: 4 }}>
                Contract: <span style={{ fontFamily: 'monospace', fontSize: 10 }}>CDBD72V...TUUNBE</span>
              </p>
              <a href="https://stellar.expert/explorer/testnet/contract/CDBD72VIJTM4QNV2MR3C3OBRQUHA56PSBFSUJFRHZBYUSUOCQ5TUUNBE"
                 target="_blank" rel="noreferrer"
                 style={{ fontSize: 12, color: '#9088FF' }}>
                View on Stellar Expert →
              </a>
            </div>
          </motion.div>
        </div>

        {/* Session history */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ background: '#0F0F1A', border: '1px solid #2C2C45', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2C2C45', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: 600, color: '#EEEEFF', fontSize: 14 }}>Session History</p>
            <span style={{ fontSize: 12, color: '#5A5A7A' }}>{sessions.length} sessions</span>
          </div>

          {loadingSession ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#5A5A7A', fontSize: 13 }}>Loading sessions…</div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: '#5A5A7A', fontSize: 14, marginBottom: 16 }}>
                {apiOnline ? 'No sessions yet. Open your first session below.' : 'Connect to the API to see your session history.'}
              </p>
              <Link href="/explore" className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>Browse Datasets →</Link>
            </div>
          ) : (
            sessions.map((s, i) => (
              <motion.div key={s.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
                style={{ borderBottom: i < sessions.length - 1 ? '1px solid #17172A' : 'none', transition: 'background 0.15s' }}
                className="p-4 sm:px-5 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 hover-surface"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#EEEEFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.dataset?.title ?? s.id}</p>
                  <p className="address" style={{ marginTop: 2, fontSize: 11 }}>{s.id.slice(0, 8)}… · {new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontFamily: 'monospace', color: '#EEEEFF' }}>${(s.spentUsdc ?? 0).toFixed(6)}</p>
                  <p style={{ fontSize: 11, color: '#5A5A7A' }}>of ${s.budgetUsdc} budget</p>
                </div>
                <span className={`badge ${STATUS_STYLE[s.status] ?? 'badge-muted'}`}>{s.status}</span>
                {s.status === 'OPEN' && (
                  <Link href={`/session/${s.id}`} style={{ fontSize: 12, color: '#9088FF' }}>View →</Link>
                )}
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  )
}

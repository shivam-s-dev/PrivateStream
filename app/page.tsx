'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { ConnectWalletButton } from '../components/ConnectWalletButton'

// ─── Design tokens (inline so they always work) ───────────────────────────────
const C = {
  base:         '#08080E',
  surface:      '#0F0F1A',
  elevated:     '#17172A',
  border:       '#2C2C45',
  borderStrong: '#44446A',
  primary:      '#EEEEFF',
  secondary:    '#9898BB',
  muted:        '#5A5A7A',
  accent:       '#7B6FFF',
  accentLight:  '#9088FF',
  success:      '#22D3A0',
  warning:      '#FBBF24',
}

// ─── Activity feed ────────────────────────────────────────────────────────────
const ACTIVITY = [
  { type: 'open',   text: 'Buyer 0xG3Xf opened session · DEX Analytics',      time: 'just now' },
  { type: 'pay',    text: 'Payment $0.0043 streamed · Wallet Intelligence',    time: '2s ago'   },
  { type: 'settle', text: 'Session settled $1.24 · USDC → Soroban',          time: '5s ago'   },
  { type: 'open',   text: 'Buyer 0xT8Yq opened session · Price Feeds',        time: '9s ago'   },
  { type: 'pay',    text: 'Payment $0.0012 streamed · Orderbook Data',         time: '14s ago'  },
  { type: 'settle', text: 'Session settled $0.87 · Confidential Token wrap',  time: '21s ago'  },
  { type: 'open',   text: 'Buyer 0xK2Mv opened session · Credit Scoring',     time: '28s ago'  },
  { type: 'pay',    text: 'Payment $0.0067 streamed · Compliance Data',        time: '35s ago'  },
]
const DOT: Record<string, string> = { open: C.accent, pay: C.success, settle: C.warning }

// ─── Chart data ───────────────────────────────────────────────────────────────
const genChart = () => {
  let v = 0.4
  return Array.from({ length: 30 }, (_, i) => {
    v = Math.max(0.1, v + (Math.random() - 0.45) * 0.15)
    return { t: i, usdc: parseFloat(v.toFixed(4)) }
  })
}

// ─── Count-up ─────────────────────────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [n, setN] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    const t0 = Date.now()
    const step = () => {
      const p = Math.min((Date.now() - t0) / 1800, 1)
      setN(Math.floor((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, target])
  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>
}

const FEATURES = [
  { icon: '🔐', title: 'Confidential Payments', badge: 'Stellar CT',     desc: 'Payment amounts hidden on-chain via Pedersen commitments. Addresses stay visible for compliance — amounts stay private forever.' },
  { icon: '⚡', title: 'Machine Payment Protocol', badge: 'MPP Sessions', desc: 'Stream micro-payments per second as data flows. Open a channel once, pay exactly what you use. No pre-payments, no waste.' },
  { icon: '📊', title: 'Any Sensitive Dataset', badge: 'Multi-category',  desc: 'DEX analytics, wallet intelligence, credit scoring, compliance data. Providers earn without revealing who paid.' },
]

const FLOW = ['Buyer', 'MPP Channel', 'Confidential Token', 'Provider']
const FLOW_ICONS = ['👤', '⚡', '🔐', '🏢']

export default function LandingPage() {
  const [chartData] = useState(genChart)
  const [actIdx, setActIdx] = useState(0)
  const [feed, setFeed] = useState(ACTIVITY.slice(0, 4))

  useEffect(() => {
    const iv = setInterval(() => {
      setFeed(prev => [{ ...ACTIVITY[actIdx % ACTIVITY.length], time: 'just now' }, ...prev.slice(0, 3)])
      setActIdx(i => i + 1)
    }, 2500)
    return () => clearInterval(iv)
  }, [actIdx])

  return (
    <div style={{ minHeight: '100vh', background: C.base, color: C.primary, overflowX: 'hidden' }}>

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          borderBottom: `1px solid ${C.border}`,
          background: 'rgba(8,8,14,0.85)',
          backdropFilter: 'blur(14px)',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/logo.png" alt="PrivateStream" width={28} height={28} style={{ borderRadius: 6, objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, color: C.primary, fontSize: 15, letterSpacing: '-0.01em' }}>PrivateStream</span>
          <span style={{ background: C.elevated, border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Testnet
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {[['Explore', '/explore'], ['Dashboard', '/dashboard']].map(([label, href]) => (
            <Link key={label} href={href} style={{ color: C.secondary, fontSize: 14, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.primary)}
              onMouseLeave={e => (e.currentTarget.style.color = C.secondary)}>
              {label}
            </Link>
          ))}
          <ConnectWalletButton />
        </div>
      </motion.nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 24px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>

        {/* Left */}
        <div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            {[['MPP Sessions', C.accent], ['Confidential Tokens', C.accent]].map(([label, color]) => (
              <span key={label} style={{ background: `${color}18`, color, border: `1px solid ${color}30`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
              </span>
            ))}
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            style={{ fontSize: 'clamp(38px, 5vw, 60px)', fontWeight: 800, lineHeight: 1.07, letterSpacing: '-0.03em', marginBottom: 24, color: C.primary }}>
            Buy sensitive data.{' '}
            <span style={{ color: C.accent }}>Nobody sees</span>{' '}
            what you paid.
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontSize: 17, color: C.secondary, lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
            The first confidential data marketplace on Stellar. Stream micro-payments per second
            via MPP. Payment amounts hidden on-chain via Confidential Tokens — a Stellar first.
          </motion.p>

          {/* CTA buttons */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/explore" className="btn-primary" style={{ fontSize: 15, padding: '12px 28px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Browse datasets
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            {/* Ghost button — using explicit styles so it's always visible */}
            <Link href="/onboard" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 600, padding: '12px 28px',
              color: '#EEEEFF',
              background: 'transparent',
              border: `1.5px solid #44446A`,
              borderRadius: 8,
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#17172A'; e.currentTarget.style.borderColor = '#7B6FFF' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#44446A' }}
            >
              List your data
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            style={{ display: 'flex', gap: 40, marginTop: 48, paddingTop: 32, borderTop: `1px solid ${C.border}` }}>
            {[
              { label: 'Datasets listed',  value: 12,   suffix: '' },
              { label: 'Sessions opened',  value: 347,  suffix: '' },
              { label: 'USDC streamed',    value: 4820, suffix: '+' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.primary, letterSpacing: '-0.02em' }}>
                  <Counter target={s.value} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: live UI preview */}
        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Chart card */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Live stream spend</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: C.accent, fontFamily: 'monospace' }}>
                  $0.0247 <span style={{ fontSize: 12, color: C.muted, fontFamily: 'inherit' }}>/ session</span>
                </p>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.success }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.success, display: 'inline-block', animation: 'pulse 2s infinite' }} />
                Streaming
              </span>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <Tooltip
                  contentStyle={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.primary }}
                  formatter={(v: unknown) => [`$${(v as number).toFixed(4)}`, 'USDC/s']}
                  labelFormatter={() => ''}
                />
                <Area type="monotone" dataKey="usdc" stroke={C.accent} strokeWidth={2} fill="url(#g1)" dot={false} animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Activity feed */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20 }}>
            <p style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Live activity</p>
            <div style={{ height: 130, overflow: 'hidden' }}>
              <AnimatePresence initial={false}>
                {feed.map((ev, i) => (
                  <motion.div key={`${ev.text}-${i}`}
                    initial={{ opacity: 0, y: -18 }} animate={{ opacity: Math.max(0.15, 1 - i * 0.28), y: 0 }}
                    exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.3 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 12, color: C.secondary }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: DOT[ev.type], flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.text}</span>
                    <span style={{ color: C.muted, flexShrink: 0 }}>{ev.time}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Protocol flow ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 64px' }}>
        <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 40 }}>
          How it works
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
          {FLOW.map((node, i) => (
            <div key={node} style={{ display: 'flex', alignItems: 'center' }}>
              <motion.div initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: C.elevated, border: `1.5px solid ${C.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  {FLOW_ICONS[i]}
                </div>
                <span style={{ fontSize: 12, color: C.secondary, textAlign: 'center', maxWidth: 90, lineHeight: 1.3 }}>{node}</span>
              </motion.div>
              {i < FLOW.length - 1 && (
                <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15 + 0.1, duration: 0.4 }}
                  style={{ width: 60, height: 1, background: `linear-gradient(to right, ${C.border}, ${C.accent}60)`, margin: '0 4px', transformOrigin: 'left', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature cards ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {FEATURES.map((f, i) => (
          <motion.div key={f.title}
            initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ y: -4 }}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, cursor: 'default', transition: 'border-color 0.2s' }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: `${C.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>
              {f.icon}
            </div>
            <span style={{ background: C.elevated, color: C.muted, border: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-block', marginBottom: 12 }}>
              {f.badge}
            </span>
            <h3 style={{ fontWeight: 700, color: C.primary, marginBottom: 8, fontSize: 16, letterSpacing: '-0.01em' }}>{f.title}</h3>
            <p style={{ fontSize: 14, color: C.secondary, lineHeight: 1.65 }}>{f.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 96px' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ background: `linear-gradient(135deg, ${C.accent}12, ${C.surface})`, border: `1px solid ${C.accent}30`, borderRadius: 28, padding: '56px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: C.accentLight, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Built on Stellar Testnet</p>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: C.primary, letterSpacing: '-0.03em', marginBottom: 12 }}>Ready to stream data?</h2>
          <p style={{ color: C.secondary, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px', lineHeight: 1.65 }}>
            Connect your Freighter wallet, browse datasets, and open your first MPP session in seconds.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link href="/explore" className="btn-primary" style={{ padding: '12px 28px', fontSize: 15 }}>Browse datasets</Link>
            <Link href="/onboard" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 600, padding: '12px 28px',
              color: C.primary, background: 'transparent',
              border: `1.5px solid ${C.borderStrong}`, borderRadius: 8, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.elevated; e.currentTarget.style.borderColor = C.accent }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.borderStrong }}
            >
              Become a provider
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image src="/logo.png" alt="PrivateStream" width={18} height={18} style={{ borderRadius: 4, opacity: 0.6 }} />
          <span style={{ fontSize: 12, color: C.muted }}>PrivateStream · Stellar Testnet</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, color: C.muted }}>
          {[
            ['MPP Docs', 'https://developers.stellar.org/docs/build/agentic-payments/mpp'],
            ['Confidential Tokens', 'https://stellar.org/blog/developers/developer-preview-confidential-tokens-on-stellar'],
          ].map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" style={{ color: C.muted, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.secondary)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
              {label}
            </a>
          ))}
          <span style={{ fontFamily: 'monospace', fontSize: 10 }}>CDHYK...E66UD</span>
        </div>
      </footer>
    </div>
  )
}

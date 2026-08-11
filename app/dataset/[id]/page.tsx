'use client'
import { use } from 'react'
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

const MOCK: Record<string, { title: string; description: string; category: string; pricePerSecond: number; provider: string }> = {
  '1': { title: 'DEX Trade Flow Analytics', description: 'Real-time aggregated DEX volume, pair liquidity, and arbitrage opportunity signals across major Stellar AMMs.', category: 'DEX_ANALYTICS', pricePerSecond: 0.000042, provider: 'AlphaData' },
  '2': { title: 'Stellar Price Feeds', description: 'Sub-second OHLCV for XLM, USDC, and 40+ Stellar assets. Ideal for trading bots and risk engines.', category: 'PRICE_FEEDS', pricePerSecond: 0.000018, provider: 'OracleXL' },
  '3': { title: 'Wallet Intelligence Graph', description: 'On-chain behavioral scoring, wallet age, transaction velocity, and counterparty risk signals.', category: 'WALLET_INTELLIGENCE', pricePerSecond: 0.000095, provider: 'ChainSight' },
  '4': { title: 'Orderbook Depth Stream', description: 'Full L2 orderbook snapshots from SDEX at 100ms resolution. Best for HFT and market making.', category: 'ORDERBOOK_DATA', pricePerSecond: 0.000067, provider: 'DepthAPI' },
}

export default function DatasetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { connected } = useWallet()
  const dataset = MOCK[id] ?? MOCK['1']

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
            {dataset.category.replace('_', ' ')}
          </span>

          <h1 style={{ fontSize: 30, fontWeight: 800, color: C.primary, letterSpacing: '-0.02em', marginBottom: 12 }}>{dataset.title}</h1>
          <p style={{ fontSize: 16, color: C.secondary, lineHeight: 1.7, marginBottom: 36 }}>{dataset.description}</p>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
            <div className="stat-card">
              <span className="stat-label">Price per second</span>
              <span className="stat-value" style={{ fontSize: 22, color: C.accent, fontFamily: 'monospace' }}>
                ${dataset.pricePerSecond.toFixed(6)}
              </span>
              <span className="stat-sub">USDC</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Provider</span>
              <span className="stat-value" style={{ fontSize: 18 }}>{dataset.provider}</span>
              <span className="stat-sub">Verified on-chain</span>
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
              <h2 style={{ fontWeight: 700, color: C.primary, marginBottom: 8, fontSize: 16 }}>Ready to stream</h2>
              <p style={{ fontSize: 14, color: C.secondary, marginBottom: 20 }}>
                Set a USDC budget and open an MPP session. Data streaming begins immediately and payments tick per second.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  id="session-budget"
                  type="number"
                  placeholder="Budget (USDC)"
                  min="0.01"
                  step="0.01"
                  defaultValue="1.00"
                  style={{ flex: 1, background: C.elevated, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.primary, fontSize: 14, outline: 'none', fontFamily: 'monospace' }}
                />
                <Link href={`/session/${id}`} className="btn-primary" style={{ padding: '10px 24px', flexShrink: 0, fontSize: 14 }}>
                  Open Session
                </Link>
              </div>
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

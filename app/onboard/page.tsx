'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ConnectWalletButton } from '../../components/ConnectWalletButton'
import { useWallet } from '../../components/WalletContext'

const CATEGORIES = [
  { value: 'DEX_ANALYTICS', label: 'DEX Analytics' },
  { value: 'PRICE_FEEDS', label: 'Price Feeds' },
  { value: 'WALLET_INTELLIGENCE', label: 'Wallet Intelligence' },
  { value: 'CREDIT_SCORING', label: 'Credit Scoring' },
  { value: 'ORDERBOOK_DATA', label: 'Orderbook Data' },
  { value: 'COMPLIANCE_DATA', label: 'Compliance Data' },
  { value: 'CUSTOM', label: 'Custom' },
]

type Role = 'buyer' | 'provider' | null

export default function OnboardPage() {
  const { connected, publicKey } = useWallet()
  const [role, setRole] = useState<Role>(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'DEX_ANALYTICS', pricePerSecond: '', endpointUrl: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleProviderSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!connected) { setError('Please connect your wallet first.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const res = await fetch(`${apiUrl}/api/datasets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, walletAddress: publicKey }),
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error(await res.text())
      setSubmitted(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit'
      if (msg.includes('Failed to fetch') || msg.includes('signal')) {
        setError('API server not running. Start it with: cd api && npm run dev')
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-base">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-base/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="PrivateStream" width={26} height={26} className="rounded object-contain" />
          <span className="font-semibold text-primary tracking-tight">PrivateStream</span>
        </Link>
        <ConnectWalletButton />
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">Get Started</h1>
          <p className="text-secondary mb-10">Are you buying data or selling it?</p>

          {/* Role selector */}
          {!role && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                { id: 'buyer', icon: '📊', title: "I'm a Buyer", desc: 'Browse datasets and stream data with micro-payments.' },
                { id: 'provider', icon: '🏢', title: "I'm a Provider", desc: 'List your dataset endpoint and earn USDC per second.' },
              ].map(r => (
                <motion.button
                  key={r.id}
                  onClick={() => setRole(r.id as Role)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-surface border-2 border-border hover:border-accent rounded-2xl p-6 text-left transition-all duration-200 group"
                  id={`role-${r.id}`}
                >
                  <div className="text-3xl mb-3">{r.icon}</div>
                  <div className="font-semibold text-primary group-hover:text-accent transition-colors mb-1">{r.title}</div>
                  <div className="text-sm text-secondary">{r.desc}</div>
                </motion.button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Buyer flow */}
            {role === 'buyer' && (
              <motion.div key="buyer" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="bg-surface border border-border rounded-2xl p-6 mb-4">
                  <h2 className="font-semibold text-primary mb-4 text-lg">Ready to explore!</h2>
                  <ol className="space-y-3 text-sm text-secondary">
                    {[
                      '1. Connect your Freighter wallet using the button above',
                      '2. Browse the dataset marketplace to find what you need',
                      '3. Click on a dataset and open an MPP session',
                      '4. Data streams to you while USDC ticks per second',
                      '5. Close the session anytime — payment settles on Stellar',
                    ].map(s => (
                      <li key={s} className="flex items-start gap-2">
                        <span className="text-accent mt-0.5">›</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex gap-3">
                  <Link href="/explore" className="btn-primary px-6 py-3 flex-1 text-center">Browse datasets →</Link>
                  <button onClick={() => setRole(null)} className="btn-ghost px-4 py-3">Back</button>
                </div>
              </motion.div>
            )}

            {/* Provider flow */}
            {role === 'provider' && !submitted && (
              <motion.div key="provider" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {!connected && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-warning bg-warning/10 border border-warning/25 px-4 py-3 rounded-xl">
                    <span>⚠️</span> Connect your wallet before submitting.
                  </div>
                )}
                <form onSubmit={handleProviderSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-muted mb-1.5 uppercase tracking-widest">Dataset Title</label>
                    <input className="input" required placeholder="e.g. Real-time DEX Volume Aggregator" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} id="dataset-title" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5 uppercase tracking-widest">Description</label>
                    <textarea className="input resize-none h-24" required placeholder="What data do you provide? Format, freshness, use cases..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} id="dataset-desc" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-muted mb-1.5 uppercase tracking-widest">Category</label>
                      <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} id="dataset-category">
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1.5 uppercase tracking-widest">Price (USDC/sec)</label>
                      <input className="input font-mono" type="number" step="0.000001" min="0.000001" required placeholder="0.000042" value={form.pricePerSecond} onChange={e => setForm(f => ({ ...f, pricePerSecond: e.target.value }))} id="dataset-price" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5 uppercase tracking-widest">Endpoint URL</label>
                    <input className="input font-mono text-sm" type="url" required placeholder="https://your-api.com/data/stream" value={form.endpointUrl} onChange={e => setForm(f => ({ ...f, endpointUrl: e.target.value }))} id="dataset-endpoint" />
                    <p className="text-xs text-muted mt-1">This URL is hashed — buyers never see it directly.</p>
                  </div>
                  {error && (
                    <div className="text-sm text-danger bg-danger/10 border border-danger/25 px-3 py-2 rounded-lg">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={submitting || !connected} className="btn-primary px-6 py-3 flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                      {submitting ? <><span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />Submitting...</> : 'List Dataset'}
                    </button>
                    <button type="button" onClick={() => setRole(null)} className="btn-ghost px-4 py-3">Back</button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Success */}
            {role === 'provider' && submitted && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-primary mb-2">Dataset listed!</h2>
                <p className="text-secondary mb-6">Buyers can now open MPP sessions and stream payments to you.</p>
                <Link href="/explore" className="btn-primary px-6 py-3 inline-block">View in marketplace</Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

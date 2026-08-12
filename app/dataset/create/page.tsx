'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useWallet } from '../../../components/WalletContext'

// Shared nav component to match Dashboard
function Nav() {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid #2C2C45', background: 'rgba(8,8,14,0.85)', backdropFilter: 'blur(12px)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Image src="/logo.png" alt="PrivateStream" width={26} height={26} style={{ borderRadius: 6, objectFit: 'contain' }} />
        <span style={{ fontWeight: 600, color: '#EEEEFF', fontSize: 15 }}>PrivateStream</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/dashboard" style={{ color: '#9898BB', fontSize: 14, transition: 'color 0.15s' }} className="hover-text-primary">Dashboard</Link>
      </div>
    </nav>
  )
}

export default function CreateDatasetPage() {
  const router = useRouter()
  const { connected, publicKey } = useWallet()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'DEX_ANALYTICS',
    pricePerSecond: '0.000042',
    endpointUrl: '',
    tags: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connected || !publicKey) {
      setError('Please connect your wallet first.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const res = await fetch(`${apiUrl}/api/datasets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          pricePerSecond: parseFloat(formData.pricePerSecond),
          endpointUrl: formData.endpointUrl,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          walletAddress: publicKey
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || data.error || 'Failed to create dataset')
      }

      const result = await res.json()
      // Redirect to explore page or dataset page
      router.push(`/dataset/${result.id}`)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08080E', color: '#EEEEFF' }}>
      <Nav />
      
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>List a Dataset</h1>
          <p style={{ color: '#9898BB', fontSize: 15, marginBottom: 40 }}>
            Register your data feed on the PrivateStream network. You set the price, and you get paid instantly via Stellar micropayments as users stream your data.
          </p>

          <form onSubmit={handleSubmit} style={{ background: '#0F0F1A', border: '1px solid #2C2C45', borderRadius: 16, padding: 32 }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', padding: '12px 16px', borderRadius: 8, marginBottom: 24, fontSize: 14 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#EEEEFF', marginBottom: 8 }}>Dataset Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Premium DEX Trade Flow"
                  style={{ width: '100%', background: '#151522', border: '1px solid #2C2C45', borderRadius: 8, padding: '12px 16px', color: '#EEEEFF', outline: 'none' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#EEEEFF', marginBottom: 8 }}>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Describe your dataset. Minimum 20 characters."
                  style={{ width: '100%', background: '#151522', border: '1px solid #2C2C45', borderRadius: 8, padding: '12px 16px', color: '#EEEEFF', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Category & Price Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#EEEEFF', marginBottom: 8 }}>Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    style={{ width: '100%', background: '#151522', border: '1px solid #2C2C45', borderRadius: 8, padding: '12px 16px', color: '#EEEEFF', outline: 'none', appearance: 'none' }}
                  >
                    <option value="DEX_ANALYTICS">DEX Analytics</option>
                    <option value="PRICE_FEEDS">Price Feeds</option>
                    <option value="WALLET_INTELLIGENCE">Wallet Intelligence</option>
                    <option value="CREDIT_SCORING">Credit Scoring</option>
                    <option value="ORDERBOOK_DATA">Orderbook Data</option>
                    <option value="COMPLIANCE_DATA">Compliance Data</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#EEEEFF', marginBottom: 8 }}>Price Per Second (USDC)</label>
                  <input
                    type="number"
                    name="pricePerSecond"
                    value={formData.pricePerSecond}
                    onChange={handleChange}
                    required
                    step="0.000001"
                    min="0.000001"
                    max="10"
                    placeholder="0.000042"
                    style={{ width: '100%', background: '#151522', border: '1px solid #2C2C45', borderRadius: 8, padding: '12px 16px', color: '#EEEEFF', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Endpoint URL */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#EEEEFF', marginBottom: 8 }}>Data Endpoint URL</label>
                <input
                  type="url"
                  name="endpointUrl"
                  value={formData.endpointUrl}
                  onChange={handleChange}
                  required
                  placeholder="https://your-api.com/feed"
                  style={{ width: '100%', background: '#151522', border: '1px solid #2C2C45', borderRadius: 8, padding: '12px 16px', color: '#EEEEFF', outline: 'none' }}
                />
                <p style={{ fontSize: 12, color: '#5A5A7A', marginTop: 8 }}>Your endpoint URL will be encrypted and hidden from buyers. They will proxy requests through PrivateStream.</p>
              </div>

              {/* Tags */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#EEEEFF', marginBottom: 8 }}>Tags (Comma separated)</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="dex, stellar, arbitrage"
                  style={{ width: '100%', background: '#151522', border: '1px solid #2C2C45', borderRadius: 8, padding: '12px 16px', color: '#EEEEFF', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submitting || !connected}
                className="btn-primary"
                style={{ padding: '12px 24px', fontSize: 15, opacity: (submitting || !connected) ? 0.7 : 1 }}
              >
                {submitting ? 'Listing Dataset...' : 'List Dataset on PrivateStream'}
              </button>
            </div>
            
            {!connected && (
              <p style={{ fontSize: 12, color: '#FBBF24', marginTop: 12, textAlign: 'right' }}>
                You must connect your wallet to list a dataset.
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  )
}

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
  const [successData, setSuccessData] = useState<{ id: string, txHash?: string } | null>(null)

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
      setSuccessData(result)
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
            
            {successData ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: '32px 24px', textAlign: 'center', background: 'rgba(34,211,160,0.05)', border: '1px solid rgba(34,211,160,0.2)', borderRadius: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,211,160,0.1)', color: '#22D3A0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: '#EEEEFF', marginBottom: 8 }}>Dataset Listed Successfully!</h3>
                <p style={{ color: '#9898BB', fontSize: 14, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                  Your data feed is now live on the PrivateStream marketplace and has been registered on the Stellar Testnet.
                </p>
                
                {successData.txHash && (
                  <div style={{ background: '#151522', padding: 16, borderRadius: 8, textAlign: 'left', marginBottom: 24, border: '1px solid #2C2C45' }}>
                    <p style={{ fontSize: 12, color: '#5A5A7A', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Registration Tx Hash</p>
                    <p style={{ fontSize: 13, color: '#EEEEFF', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 12 }}>{successData.txHash}</p>
                    <a 
                      href={`https://stellar.expert/explorer/testnet/tx/${successData.txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#8888FF', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                      className="hover-text-primary"
                    >
                      Verify on Stellar Expert
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                  </div>
                )}

                <button 
                  onClick={() => router.push(`/dataset/${successData.id}`)}
                  className="btn-primary"
                  style={{ padding: '10px 24px', fontSize: 14 }}
                >
                  View Dataset Page
                </button>
              </motion.div>
            ) : (
              <>
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
            
            {!connected && !successData && (
              <p style={{ fontSize: 12, color: '#FBBF24', marginTop: 12, textAlign: 'right' }}>
                You must connect your wallet to list a dataset.
              </p>
            )}
            
            </>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  )
}

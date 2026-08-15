'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ConnectWalletButton } from '../../components/ConnectWalletButton'
import { DatasetCard, Dataset } from '../../components/DatasetCard'

const CATEGORIES = ['All', 'DEX_ANALYTICS', 'PRICE_FEEDS', 'WALLET_INTELLIGENCE', 'CREDIT_SCORING', 'ORDERBOOK_DATA', 'COMPLIANCE_DATA']

const MOCK_DATASETS: Dataset[] = [
  { id: '1', title: 'DEX Trade Flow Analytics', description: 'Real-time aggregated DEX volume, pair liquidity, and arbitrage opportunity signals across major Stellar AMMs.', category: 'DEX_ANALYTICS', pricePerSecond: 0.000042, totalSessions: 127, provider: { displayName: 'AlphaData', walletAddress: 'GBXKLT...J9YP' } },
  { id: '2', title: 'Stellar Price Feeds', description: 'Sub-second OHLCV for XLM, USDC, and 40+ Stellar assets. Ideal for trading bots and risk engines.', category: 'PRICE_FEEDS', pricePerSecond: 0.000018, totalSessions: 312, provider: { displayName: 'OracleXL', walletAddress: 'GDTM3R...K2NF' } },
  { id: '3', title: 'Wallet Intelligence Graph', description: 'On-chain behavioral scoring, wallet age, transaction velocity, and counterparty risk signals.', category: 'WALLET_INTELLIGENCE', pricePerSecond: 0.000095, totalSessions: 54, provider: { displayName: 'ChainSight', walletAddress: 'GCFPQ2...A7VX' } },
  { id: '4', title: 'Orderbook Depth Stream', description: 'Full L2 orderbook snapshots from SDEX at 100ms resolution. Best for HFT and market making.', category: 'ORDERBOOK_DATA', pricePerSecond: 0.000067, totalSessions: 89, provider: { displayName: 'DepthAPI', walletAddress: 'GAJWQ9...P3ZN' } },
  { id: '5', title: 'DeFi Credit Scoring', description: 'Credit scores derived from on-chain repayment history, collateral ratios, and liquidation events.', category: 'CREDIT_SCORING', pricePerSecond: 0.000031, totalSessions: 41, provider: { displayName: 'CreditBase', walletAddress: 'GBKWT1...M8QR' } },
  { id: '6', title: 'Compliance & Sanctions Feed', description: 'Real-time OFAC/FATF screening feed, AML flags, and counterparty risk for regulated protocols.', category: 'COMPLIANCE_DATA', pricePerSecond: 0.000120, totalSessions: 29, provider: { displayName: 'KYCStream', walletAddress: 'GCNR5H...V1YX' } },
]

async function fetchDatasets(): Promise<Dataset[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  const res = await fetch(`${apiUrl}/api/datasets`, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error('API offline')
  return res.json()
}

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [maxPrice, setMaxPrice] = useState<string>('')

  const { data: apiDatasets, isLoading, isError } = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets,
    retry: 1,
  })

  const datasets = apiDatasets ?? []

  const filtered = datasets.filter(d => {
    const matchCat = activeCategory === 'All' || d.category === activeCategory
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase())
    const matchPrice = !maxPrice || Number(d.pricePerSecond) <= Number(maxPrice)
    return matchCat && matchSearch && matchPrice
  })

  return (
    <div className="min-h-screen bg-base">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-base/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="PrivateStream" width={26} height={26} className="rounded object-contain" />
            <span className="font-semibold text-primary tracking-tight">PrivateStream</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-secondary hover:text-primary text-sm transition-colors hidden sm:block">Dashboard</Link>
          <ConnectWalletButton />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">Explore Datasets</h1>
          <p className="text-secondary text-sm mb-4">Browse and stream sensitive data with confidential payments.</p>
          
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 text-sm text-primary flex items-start gap-3">
            <span className="text-accent mt-0.5">💡</span>
            <div>
              <strong className="text-accent">Dataset Market Guide:</strong> Providers can monetize raw JSON feeds (e.g. trading volume, weather, IoT) per-second. <Link href="/onboard" className="underline hover:text-white">List your dataset here</Link> to start earning USDC. 
            </div>
          </div>
        </motion.div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            className="input flex-1 max-w-md"
            placeholder="Search datasets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="dataset-search"
          />
          <input
            className="input w-full sm:w-48"
            type="number"
            placeholder="Max Price (USDC/s)"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            id="price-filter"
            step="0.0001"
            min="0"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 ${activeCategory === cat ? 'bg-accent text-white border-accent' : 'bg-elevated text-secondary border-border hover:border-border-strong hover:text-primary'}`}
            >
              {cat === 'All' ? 'All' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-elevated rounded w-24 mb-3" />
                <div className="h-5 bg-elevated rounded w-3/4 mb-2" />
                <div className="h-4 bg-elevated rounded w-full mb-1" />
                <div className="h-4 bg-elevated rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((dataset, i) => (
              <motion.div
                key={dataset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/dataset/${dataset.id}`} className="block">
                  <DatasetCard dataset={dataset} />
                </Link>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16 text-muted">
                No datasets match your search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

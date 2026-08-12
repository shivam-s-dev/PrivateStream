export type Dataset = {
  id: string
  title: string
  description: string
  category: string
  pricePerSecond: number
  totalSessions: number
  provider: {
    displayName: string | null
    walletAddress: string
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  DEX_ANALYTICS:       'badge-accent',
  PRICE_FEEDS:         'badge-success',
  WALLET_INTELLIGENCE: 'badge-warning',
  CREDIT_SCORING:      'badge-muted',
  ORDERBOOK_DATA:      'badge-accent',
}

export function DatasetCard({ dataset }: { dataset: Dataset }) {
  return (
    <div className="card group cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <span className={`badge ${CATEGORY_COLORS[dataset.category] || 'badge-muted'}`}>
          {dataset.category.replace('_', ' ')}
        </span>
        <span className="text-xs text-muted">
          {dataset.totalSessions} sessions
        </span>
      </div>

      <h3 className="font-semibold text-primary mb-1 group-hover:text-accent
                     transition-colors tracking-heading">
        {dataset.title}
      </h3>
      <p className="text-sm text-secondary line-clamp-2 mb-4 leading-relaxed">
        {dataset.description}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div>
          <span className="font-mono text-accent font-medium">
            ${Number(dataset.pricePerSecond).toFixed(6)}
          </span>
          <span className="text-muted text-xs">/second</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-slow" />
          <span className="text-xs text-success">Live</span>
        </div>
      </div>

      {/* Provider */}
      <div className="mt-3 flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center
                        justify-center text-accent text-xs font-bold">
          {dataset.provider.displayName?.[0] || '?'}
        </div>
        <span className="address text-xs">
          {dataset.provider.walletAddress.slice(0, 8)}...
          {dataset.provider.walletAddress.slice(-6)}
        </span>
      </div>
    </div>
  )
}

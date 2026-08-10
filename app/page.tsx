import { ConnectWalletButton } from '../components/ConnectWalletButton'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-base">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30
                          flex items-center justify-center">
            <span className="text-accent text-sm font-bold">PS</span>
          </div>
          <span className="font-semibold text-primary tracking-tight">PrivateStream</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/explore" className="text-secondary hover:text-primary text-sm transition-colors">
            Explore
          </Link>
          <ConnectWalletButton />
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        {/* Protocol badges */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="badge badge-accent">MPP Sessions</span>
          <span className="text-muted text-xs">×</span>
          <span className="badge badge-accent">Confidential Tokens</span>
          <span className="badge badge-muted ml-2">Stellar Testnet</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-primary
                       tracking-display leading-tight mb-6">
          Buy sensitive data.
          <br />
          <span className="text-accent">Nobody sees what you paid.</span>
        </h1>

        <p className="text-lg text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          The first confidential data marketplace on Stellar. Machine Payments Protocol
          sessions for streaming access. Confidential Token settlement so payment amounts
          stay private — on any blockchain, for the first time.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link href="/explore" className="btn-primary px-6 py-3 text-base">
            Browse datasets →
          </Link>
          <Link href="/onboard" className="btn-ghost px-6 py-3 text-base">
            List your data
          </Link>
        </div>

        {/* Stats bar */}
        <div className="mt-20 grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { label: 'Active datasets', value: '—' },
            { label: 'Sessions today', value: '—' },
            { label: 'Protocol', value: 'Stellar' },
          ].map((s) => (
            <div key={s.label} className="border border-border rounded-lg p-4">
              <div className="text-xl font-semibold text-primary">{s.value}</div>
              <div className="text-xs text-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

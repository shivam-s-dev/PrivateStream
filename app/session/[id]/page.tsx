'use client'
import { useEffect, useState } from 'react'

export default function SessionPage({ params }: { params: { id: string } }) {
  const [state, setState] = useState({
    status: 'OPEN' as 'OPEN' | 'CLOSED',
    spent: 0,
    budget: 0,
    dataPoints: 0,
    duration: 0,
    lastPayment: null as Date | null,
  })

  // Poll session state every 2 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${params.id}/state`)
        if (res.ok) {
          const data = await res.json()
          setState(data)
        }
      } catch (err) {
        // ignore fetch errors
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [params.id])

  const budgetPct = state.budget > 0 ? (state.spent / state.budget) * 100 : 0

  return (
    <div className="min-h-screen bg-base p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-display">
              Live Session
            </h1>
            <p className="address mt-1">{params.id}</p>
          </div>
          <div className={`badge ${
            state.status === 'OPEN' ? 'badge-success' : 'badge-muted'
          } text-sm px-3 py-1`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
              state.status === 'OPEN'
                ? 'bg-success animate-pulse-slow'
                : 'bg-muted'
            }`} />
            {state.status}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <span className="stat-label">Spent</span>
            <span className="stat-value text-accent">${state.spent.toFixed(4)}</span>
            <span className="stat-sub">USDC</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Budget</span>
            <span className="stat-value">${state.budget.toFixed(2)}</span>
            <span className="stat-sub">USDC max</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Data points</span>
            <span className="stat-value">{state.dataPoints.toLocaleString()}</span>
            <span className="stat-sub">received</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Duration</span>
            <span className="stat-value">{formatDuration(state.duration)}</span>
            <span className="stat-sub">active</span>
          </div>
        </div>

        {/* Budget progress */}
        <div className="card mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-secondary">Budget used</span>
            <span className="text-primary font-medium">{budgetPct.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-elevated rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetPct > 80 ? 'bg-danger' :
                budgetPct > 60 ? 'bg-warning' : 'bg-accent'
              }`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted mt-1.5">
            <span>$0</span>
            <span className="text-success">Payments hidden via Confidential Tokens</span>
            <span>${state.budget.toFixed(2)}</span>
          </div>
        </div>

        {/* Privacy indicator */}
        <div className="card bg-accent/5 border-accent/20 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center
                            justify-center text-accent text-sm">🔐</div>
            <div>
              <p className="text-sm font-medium text-primary">
                Payments routed through Confidential Tokens
              </p>
              <p className="text-xs text-secondary mt-0.5">
                Amount hidden on-chain via Pedersen commitments.
                Addresses visible. Compliant with auditor key.
              </p>
            </div>
          </div>
        </div>

        {/* Close session */}
        {state.status === 'OPEN' && (
          <button className="btn-danger w-full py-3">
            Close session & settle
          </button>
        )}
      </div>
    </div>
  )
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

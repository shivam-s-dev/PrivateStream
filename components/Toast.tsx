'use client'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type Toast = {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message?: string
}

// ── Global event bus (no context overhead) ────────────────────────────────
const listeners: Set<(t: Toast) => void> = new Set()

export function showToast(toast: Omit<Toast, 'id'>) {
  const t = { ...toast, id: Math.random().toString(36).slice(2) }
  listeners.forEach(fn => fn(t))
}

const ICON = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
}
const COLORS = {
  success: { bg: 'rgba(34,211,160,0.10)', border: 'rgba(34,211,160,0.28)', icon: '#22D3A0', dot: '#22D3A0' },
  error:   { bg: 'rgba(247,82,112,0.10)', border: 'rgba(247,82,112,0.28)', icon: '#F75270', dot: '#F75270' },
  info:    { bg: 'rgba(123,111,255,0.10)', border: 'rgba(123,111,255,0.28)', icon: '#9088FF', dot: '#9088FF' },
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts(prev => [t, ...prev].slice(0, 4))
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id))
      }, 4000)
    }
    listeners.add(handler)
    return () => { listeners.delete(handler) }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 72,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map(t => {
          const c = COLORS[t.type]
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 14,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                minWidth: 280,
                maxWidth: 340,
                pointerEvents: 'auto',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              {/* Icon circle */}
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: `${c.icon}22`,
                border: `1px solid ${c.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: c.icon,
                fontSize: 13,
                fontWeight: 700,
              }}>
                {ICON[t.type]}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#EEEEFF', fontWeight: 600, fontSize: 13, margin: 0 }}>{t.title}</p>
                {t.message && (
                  <p style={{ color: '#9898BB', fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{t.message}</p>
                )}
              </div>

              {/* Shrinking timer bar */}
              <motion.div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: 2,
                  background: c.dot,
                  borderRadius: '0 0 14px 14px',
                }}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4, ease: 'linear' }}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

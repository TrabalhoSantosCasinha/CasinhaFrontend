import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const seq = useRef(0)

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    ({ type = 'info', title, message, icon, timeout = 4500 }) => {
      seq.current += 1
      const id = seq.current
      setToasts((t) => [...t.slice(-4), { id, type, title, message, icon }])
      setTimeout(() => dismiss(id), timeout)
    },
    [dismiss],
  )

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{t.icon ?? (t.type === 'error' ? '⚠️' : t.type === 'success' ? '✅' : 'ℹ️')}</span>
            <div className="toast-body">
              {t.title && <strong>{t.title}</strong>}
              {t.message && <span>{t.message}</span>}
            </div>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Fechar aviso">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)

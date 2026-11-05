import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './lib/api'
import { useInterval, useNow } from './lib/hooks'
import { ToastProvider, useToast } from './lib/toast'
import Dashboard from './pages/Dashboard'
import Automation from './pages/Automation'
import Activity from './pages/Activity'
import Devices from './pages/Devices'

const TABS = [
  { id: 'painel', label: 'Painel', icon: '🏠' },
  { id: 'automacao', label: 'Automação', icon: '🤖' },
  { id: 'atividade', label: 'Atividade', icon: '🗒️' },
  { id: 'dispositivos', label: 'Dispositivos', icon: '📟' },
]

const TOAST_FOR = {
  state: { type: 'success' },
  error: { type: 'error' },
  automation: { type: 'info', icon: '🤖', title: 'Automação' },
  scene: { type: 'info', icon: '🎬' },
  system: { type: 'info', icon: '⚙️' },
}

function tabFromHash() {
  const id = window.location.hash.replace('#/', '')
  return TABS.some((t) => t.id === id) ? id : 'painel'
}

function ConnChip({ label, ok, warn }) {
  return (
    <span className={`conn-chip ${ok ? 'ok' : warn ? 'warn' : 'bad'}`}>
      <span className="dot-sm" /> {label}
    </span>
  )
}

function Shell() {
  const toast = useToast()
  const now = useNow(1000)
  const [tab, setTab] = useState(tabFromHash)
  const [status, setStatus] = useState(null)
  const [backendError, setBackendError] = useState(null)
  const [history, setHistory] = useState(null)
  const [range, setRange] = useState(60)
  const [settings, setSettings] = useState(null)
  const [scenes, setScenes] = useState([])
  const [busy, setBusy] = useState({})
  const lastActivityId = useRef(null)

  /* ---------- navegação por hash ---------- */
  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const goTo = (id) => {
    window.location.hash = `#/${id}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ---------- dados ---------- */
  const refresh = useCallback(async () => {
    try {
      const s = await api('/status')
      setStatus(s)
      setBackendError(null)

      // notificações para eventos novos (mudanças de estado, automação, erros…)
      const recent = s.recentActivity ?? []
      if (lastActivityId.current === null) {
        lastActivityId.current = recent[0]?.id ?? ''
      } else if (recent[0] && recent[0].id !== lastActivityId.current) {
        const idx = recent.findIndex((e) => e.id === lastActivityId.current)
        const fresh = (idx === -1 ? recent.slice(0, 3) : recent.slice(0, idx)).reverse()
        for (const e of fresh) {
          const t = TOAST_FOR[e.type]
          if (t) toast({ ...t, title: t.title ?? e.message, message: t.title ? e.message : undefined })
        }
        lastActivityId.current = recent[0].id
      }
    } catch (e) {
      setBackendError(e.message)
    }
  }, [toast])

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await api(`/luminosity/history?lastN=${range}`))
    } catch {
      /* aviso de conexão já aparece */
    }
  }, [range])

  const loadStatic = useCallback(async () => {
    if (settings && scenes.length) return
    try {
      const [st, sc] = await Promise.all([api('/settings'), api('/scenes')])
      setSettings(st)
      setScenes(sc)
    } catch {
      /* tenta de novo no próximo ciclo */
    }
  }, [settings, scenes.length])

  useInterval(refresh, 1500)
  useInterval(loadHistory, 5000)
  useInterval(loadStatic, 4000)
  useEffect(() => {
    const id = setTimeout(loadHistory, 0)
    return () => clearTimeout(id)
  }, [loadHistory])

  /* ---------- ações ---------- */
  const post = async (key, path) => {
    setBusy((b) => ({ ...b, [key]: true }))
    try {
      const r = await api(path, { method: 'POST' })
      await refresh()
      return r
    } catch (e) {
      toast({ type: 'error', title: 'Não foi possível enviar o comando', message: e.message })
      return null
    } finally {
      setBusy((b) => {
        const n = { ...b }
        delete n[key]
        return n
      })
    }
  }

  const saveSettings = async (patch) => {
    try {
      const st = await api('/settings', { method: 'PUT', body: patch })
      setSettings(st)
      toast({ type: 'success', title: 'Configurações salvas' })
      refresh()
      return true
    } catch (e) {
      toast({ type: 'error', title: 'Não foi possível salvar', message: e.message })
      return false
    }
  }

  const actions = {
    lamp: (n, cmd) => post(`lamp${n}`, `/lamps/${n}/${cmd}`),
    allLamps: (cmd) => post(`lamps-all-${cmd}`, `/lamps/all/${cmd}`),
    window: (cmd) => post('window', `/window/${cmd}`),
    clothesline: (cmd) => post('clothesline', `/clothesline/${cmd}`),
    scene: (s) => post(`scene-${s.id}`, `/scenes/${s.id}`),
    renameLamp: (key, name) => saveSettings({ lampNames: { [key]: name } }),
  }

  const offline = !!backendError || !status || status.fiware.status !== 'ok'

  /* ---------- atalhos de teclado ---------- */
  const shortcutRef = useRef(null)
  useEffect(() => {
    shortcutRef.current = { status, offline, actions }
  })
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      const { status: s, offline: off, actions: act } = shortcutRef.current ?? {}
      if (!s || off) return
      const k = e.key.toLowerCase()
      if (['1', '2', '3'].includes(k)) {
        const lamp = s.lamps[Number(k) - 1]
        if (!lamp.pending) act.lamp(lamp.number, lamp.state === 'on' ? 'off' : 'on')
      } else if (k === 'j' && !s.window.pending) {
        act.window(s.window.state === 'open' ? 'close' : 'open')
      } else if (k === 'v' && !s.clothesline.pending) {
        act.clothesline(s.clothesline.state === 'extended' ? 'retract' : 'extend')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ---------- título da aba do navegador ---------- */
  useEffect(() => {
    const on = status?.lamps.filter((l) => l.state === 'on').length ?? 0
    document.title = on ? `(${on} 💡) Casinha IoT` : 'Casinha IoT'
  }, [status])

  const clock = new Date(now)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-logo">🏠</span>
          <div>
            <h1>Casinha IoT</h1>
            <p className="muted">
              {clock.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} ·{' '}
              {clock.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="conn-chips">
          <ConnChip label="Backend" ok={!backendError && !!status} />
          <ConnChip label="FIWARE" ok={status?.fiware.status === 'ok'} />
          <ConnChip label="ESP32" ok={status?.esp32.online} warn={status?.fiware.status === 'ok' && !status?.esp32.online} />
        </div>
      </header>

      <nav className="tabs" aria-label="Seções">
        {TABS.map((t) => (
          <a key={t.id} href={`#/${t.id}`} className={`tab ${tab === t.id ? 'active' : ''}`} aria-current={tab === t.id ? 'page' : undefined}>
            <span>{t.icon}</span> {t.label}
          </a>
        ))}
      </nav>

      <main>
        {tab === 'painel' && (
          <Dashboard
            status={status}
            history={history}
            range={range}
            onRange={setRange}
            scenes={scenes}
            busy={busy}
            offline={offline}
            actions={actions}
            backendError={backendError}
            now={now}
            goTo={goTo}
          />
        )}
        {tab === 'automacao' &&
          (settings ? (
            <Automation settings={settings} status={status} onSave={saveSettings} now={now} />
          ) : (
            <div className="card loading">Carregando configurações…</div>
          ))}
        {tab === 'atividade' && <Activity now={now} />}
        {tab === 'dispositivos' && <Devices status={status} backendOk={!backendError && !!status} now={now} />}
      </main>

      <footer className="footer">
        <span>
          Atalhos: <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> luzes · <kbd>J</kbd> janela · <kbd>V</kbd> varal
        </span>
        <span>FIWARE · MQTT · ESP32</span>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  )
}

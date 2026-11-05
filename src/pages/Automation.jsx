import { useState } from 'react'
import { COMMAND_LABEL, formatTime, timeAgo } from '../lib/format'

const ACTION_OPTIONS = {
  lamp: ['on', 'off', 'none'],
  window: ['open', 'close', 'none'],
  clothesline: ['extend', 'retract', 'none'],
}

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          role="radio"
          aria-checked={value === o}
          className={value === o ? 'active' : ''}
          onClick={() => onChange(o)}
        >
          {COMMAND_LABEL[o]}
        </button>
      ))}
    </div>
  )
}

function ThresholdEditor({ dark, bright, current, onChange }) {
  return (
    <div className="th-editor">
      <div className="th-bar">
        <div className="th-zone z-dark" style={{ width: `${dark}%` }}>
          <span>🌙 Escuro</span>
        </div>
        <div className="th-zone z-neutral" style={{ width: `${bright - dark}%` }}>
          <span>Zona neutra</span>
        </div>
        <div className="th-zone z-bright" style={{ width: `${100 - bright}%` }}>
          <span>☀️ Claro</span>
        </div>
        {current != null && (
          <div className="th-current" style={{ left: `${current}%` }} title={`Agora: ${current}%`}>
            <span>agora {current}%</span>
          </div>
        )}
      </div>
      <div className="th-inputs">
        <label>
          <span>🌙 Considerar <strong>escuro</strong> quando a luz for ≤ <strong>{dark}%</strong></span>
          <input
            type="range"
            min="0"
            max="99"
            value={dark}
            onChange={(e) => {
              const v = Number(e.target.value)
              onChange({ darkThreshold: v, brightThreshold: Math.max(bright, v + 1) })
            }}
          />
        </label>
        <label>
          <span>☀️ Considerar <strong>claro</strong> quando a luz for ≥ <strong>{bright}%</strong></span>
          <input
            type="range"
            min="1"
            max="100"
            value={bright}
            onChange={(e) => {
              const v = Number(e.target.value)
              onChange({ brightThreshold: v, darkThreshold: Math.min(dark, v - 1) })
            }}
          />
        </label>
      </div>
      <p className="muted small-text">
        💡 A <strong>zona neutra</strong> entre os dois limites evita que as luzes fiquem acendendo e apagando quando a
        luminosidade oscila (uma sombra passando, por exemplo).
      </p>
    </div>
  )
}

function PhaseActions({ title, icon, phase, values, lamps, onChange }) {
  const rows = [
    ...lamps.map((l) => ({ key: l.key, label: `💡 ${l.name}`, kind: 'lamp' })),
    { key: 'window', label: '🪟 Janela', kind: 'window' },
    { key: 'clothesline', label: '👕 Varal', kind: 'clothesline' },
  ]
  return (
    <div className={`phase phase-${phase}`}>
      <h3>
        {icon} {title}
      </h3>
      {rows.map((r) => (
        <div key={r.key} className="phase-row">
          <span>{r.label}</span>
          <Segmented
            label={`${title}: ${r.label}`}
            value={values[r.key]}
            options={ACTION_OPTIONS[r.kind]}
            onChange={(v) => onChange(phase, r.key, v)}
          />
        </div>
      ))}
    </div>
  )
}

function describe(values, lamps) {
  const name = (k) => {
    if (k === 'window') return 'a janela'
    if (k === 'clothesline') return 'o varal'
    return `a luz ${lamps.find((l) => l.key === k)?.name ?? k}`
  }
  const parts = Object.entries(values)
    .filter(([, v]) => v !== 'none')
    .map(([k, v]) => `${COMMAND_LABEL[v].toLowerCase()} ${name(k)}`)
  if (!parts.length) return 'não fazer nada'
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`
}

export default function Automation({ settings, status, onSave, now }) {
  const [draft, setDraft] = useState(() => structuredClone(settings.automation))
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings.automation)
  const lamps = status?.lamps ?? []
  const a = status?.automation
  const lum = status?.luminosity?.value

  const patch = (p) => setDraft((d) => ({ ...d, ...p }))
  const setAction = (phase, key, v) => setDraft((d) => ({ ...d, [phase]: { ...d[phase], [key]: v } }))

  const save = async (next = draft) => {
    setSaving(true)
    const ok = await onSave({ automation: next })
    setSaving(false)
    if (ok) setDraft(structuredClone(next))
  }

  const toggleEnabled = () => {
    // ligar/desligar salva na hora, mantendo as outras alterações do rascunho
    save({ ...draft, enabled: !draft.enabled })
  }

  let liveText = 'Automação desligada.'
  if (a?.enabled) {
    if (lum == null) liveText = 'Aguardando leitura do sensor…'
    else if (a.darkCount > 0) liveText = `Abaixo do limite de escuro: ${a.darkCount} de ${a.confirmSamples} leituras seguidas.`
    else if (a.brightCount > 0) liveText = `Acima do limite de claro: ${a.brightCount} de ${a.confirmSamples} leituras seguidas.`
    else liveText = lum > a.darkThreshold && lum < a.brightThreshold ? 'Luminosidade na zona neutra — nada a fazer.' : 'Monitorando…'
  }
  const progress = a?.enabled ? Math.max(a.darkCount, a.brightCount) / a.confirmSamples : 0

  return (
    <div className="page">
      <section className={`card auto-hero ${draft.enabled ? 'on' : ''}`}>
        <div className="auto-hero-text">
          <span className="card-icon big">🤖</span>
          <div>
            <h2>Automação por luminosidade</h2>
            <p className="muted">
              O sensor LDR decide sozinho: quando <strong>escurecer</strong> ou <strong>clarear</strong>, a casa executa as
              ações abaixo. Você continua podendo controlar tudo manualmente — a automação só age quando o ambiente muda de
              fase.
            </p>
          </div>
        </div>
        <button
          className={`big-switch xl ${draft.enabled ? 'on' : ''}`}
          role="switch"
          aria-checked={draft.enabled}
          onClick={toggleEnabled}
          disabled={saving}
        >
          <span className="big-switch-knob" />
          <span className="big-switch-text">{draft.enabled ? 'Ativa' : 'Desligada'}</span>
        </button>
      </section>

      <div className="auto-status card">
        <div className="auto-status-item">
          <span className="muted">Luminosidade agora</span>
          <strong>{lum != null ? `${lum}%` : '--'}</strong>
        </div>
        <div className="auto-status-item">
          <span className="muted">Fase atual</span>
          <strong>{a?.phase === 'dark' ? '🌙 Escuro' : a?.phase === 'bright' ? '☀️ Claro' : '—'}</strong>
        </div>
        <div className="auto-status-item">
          <span className="muted">Última execução</span>
          <strong>{a?.lastRun ? `${formatTime(a.lastRun)} (${timeAgo(a.lastRun, now)})` : 'nunca'}</strong>
        </div>
        <div className="auto-status-item wide">
          <span className="muted">O que está acontecendo</span>
          <strong className="small-strong">{liveText}</strong>
          <div className="mini-progress"><div style={{ width: `${progress * 100}%` }} /></div>
        </div>
      </div>

      <section className="card">
        <header className="card-head">
          <span className="card-icon">🎚️</span>
          <div className="card-title">
            <h2>Limites</h2>
            <p className="muted">Arraste para definir o que é escuro e o que é claro na sua maquete.</p>
          </div>
        </header>
        <ThresholdEditor
          dark={draft.darkThreshold}
          bright={draft.brightThreshold}
          current={lum}
          onChange={patch}
        />
        <label className="confirm-row">
          <span>
            Confirmar depois de <strong>{draft.confirmSamples}</strong> leitura{draft.confirmSamples > 1 ? 's' : ''} seguida
            {draft.confirmSamples > 1 ? 's' : ''} (~{draft.confirmSamples * 3} s)
          </span>
          <input
            type="range"
            min="1"
            max="10"
            value={draft.confirmSamples}
            onChange={(e) => patch({ confirmSamples: Number(e.target.value) })}
          />
        </label>
      </section>

      <section className="card">
        <header className="card-head">
          <span className="card-icon">⚡</span>
          <div className="card-title">
            <h2>O que fazer</h2>
            <p className="muted">Escolha a ação de cada dispositivo. “Nada” deixa como está.</p>
          </div>
        </header>
        <div className="phases">
          <PhaseActions title="Quando escurecer" icon="🌙" phase="dark" values={draft.dark} lamps={lamps} onChange={setAction} />
          <PhaseActions title="Quando clarear" icon="☀️" phase="bright" values={draft.bright} lamps={lamps} onChange={setAction} />
        </div>
        <div className="rule-summary">
          <p>
            🌙 Quando a luz ficar <strong>≤ {draft.darkThreshold}%</strong> por {draft.confirmSamples} leitura(s):{' '}
            <strong>{describe(draft.dark, lamps)}</strong>.
          </p>
          <p>
            ☀️ Quando a luz ficar <strong>≥ {draft.brightThreshold}%</strong> por {draft.confirmSamples} leitura(s):{' '}
            <strong>{describe(draft.bright, lamps)}</strong>.
          </p>
        </div>
      </section>

      <div className={`save-bar ${dirty ? 'visible' : ''}`}>
        <span>Você tem alterações não salvas.</span>
        <button className="btn ghost" onClick={() => setDraft(structuredClone(settings.automation))} disabled={saving}>
          Descartar
        </button>
        <button className="btn primary" onClick={() => save()} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar regras'}
        </button>
      </div>
    </div>
  )
}

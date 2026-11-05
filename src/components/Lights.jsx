import { useState } from 'react'
import { duration, SOURCE_LABEL, timeAgo } from '../lib/format'

function Bulb({ on }) {
  return (
    <svg className={`bulb ${on ? 'bulb-on' : ''}`} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="26" r="26" className="bulb-glow" />
      <path
        d="M32 8a16 16 0 0 0-9 29.2c1.8 1.3 3 3.3 3 5.5V46h12v-3.3c0-2.2 1.2-4.2 3-5.5A16 16 0 0 0 32 8z"
        className="bulb-glass"
      />
      <rect x="25" y="48" width="14" height="4" rx="1.5" className="bulb-base" />
      <rect x="27" y="54" width="10" height="4" rx="1.5" className="bulb-base" />
    </svg>
  )
}

function LampTile({ lamp, busy, offline, onToggle, onRename, now }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(lamp.name)
  const isOn = lamp.state === 'on'
  const pending = lamp.pending
  const disabled = busy || !!pending || offline

  const commit = () => {
    setEditing(false)
    if (draft.trim() && draft.trim() !== lamp.name) onRename(draft.trim())
    else setDraft(lamp.name)
  }

  let subtitle = 'Sem dados do ESP32'
  if (pending) subtitle = pending.target === 'on' ? 'Acendendo…' : 'Apagando…'
  else if (lamp.state) {
    const since = isOn ? lamp.onSince ?? lamp.changedAt : lamp.changedAt
    subtitle = `${isOn ? 'Acesa' : 'Apagada'} ${since ? timeAgo(since, now) : ''}`.trim()
  }

  return (
    <div className={`lamp-tile ${isOn ? 'is-on' : ''} ${pending ? 'is-pending' : ''}`}>
      <div className="lamp-top">
        <Bulb on={isOn} />
        <kbd title={`Atalho: tecla ${lamp.number}`}>{lamp.number}</kbd>
      </div>

      {editing ? (
        <input
          className="rename-input"
          value={draft}
          autoFocus
          maxLength={24}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setDraft(lamp.name)
              setEditing(false)
            }
          }}
          aria-label={`Novo nome da luz ${lamp.number}`}
        />
      ) : (
        <button
          className="lamp-name"
          onClick={() => {
            setDraft(lamp.name)
            setEditing(true)
          }}
          title="Clique para renomear"
        >
          {lamp.name} <span className="edit-icon">✎</span>
        </button>
      )}

      <p className={`lamp-sub ${pending ? 'pulse' : ''}`}>
        {pending && <span className="spinner" />} {subtitle}
      </p>

      <div className="lamp-meta">
        <span title="Tempo acesa hoje">⏱ Hoje {duration(lamp.todayMs ?? 0)}</span>
        <span title="Vezes que acendeu hoje">🔁 {lamp.switches ?? 0}×</span>
      </div>
      {lamp.changedBy && !pending && (
        <p className="muted tiny">Última mudança por: {SOURCE_LABEL[lamp.changedBy] ?? lamp.changedBy}</p>
      )}

      <button
        className={`big-switch ${isOn ? 'on' : ''}`}
        role="switch"
        aria-checked={isOn}
        aria-label={`${isOn ? 'Apagar' : 'Acender'} ${lamp.name}`}
        disabled={disabled}
        onClick={() => onToggle(isOn ? 'off' : 'on')}
      >
        <span className="big-switch-knob" />
        <span className="big-switch-text">{isOn ? 'Ligada' : 'Desligada'}</span>
      </button>
    </div>
  )
}

export default function LightsCard({ lamps, busy, offline, actions, now }) {
  const onCount = lamps.filter((l) => l.state === 'on').length
  return (
    <section className="card">
      <header className="card-head">
        <span className="card-icon">💡</span>
        <div className="card-title">
          <h2>Luzes</h2>
          <p className="muted">
            {onCount === 0 ? 'Todas apagadas' : onCount === lamps.length ? 'Todas acesas' : `${onCount} de ${lamps.length} acesas`}
            {' · '}LEDs nos GPIO 25, 26 e 27
          </p>
        </div>
        <div className="head-actions">
          <button className="btn ghost" disabled={offline || busy['lamps-all-on'] || onCount === lamps.length} onClick={() => actions.allLamps('on')}>
            Acender todas
          </button>
          <button className="btn ghost" disabled={offline || busy['lamps-all-off'] || onCount === 0} onClick={() => actions.allLamps('off')}>
            Apagar todas
          </button>
        </div>
      </header>
      <div className="lamp-grid">
        {lamps.map((lamp) => (
          <LampTile
            key={lamp.key}
            lamp={lamp}
            busy={busy[lamp.key]}
            offline={offline}
            now={now}
            onToggle={(cmd) => actions.lamp(lamp.number, cmd)}
            onRename={(name) => actions.renameLamp(lamp.key, name)}
          />
        ))}
      </div>
    </section>
  )
}

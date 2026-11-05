import { COMMAND_LABEL } from '../lib/format'

const TARGET = { on: 'on', off: 'off', open: 'open', close: 'closed', extend: 'extended', retract: 'retracted' }

function deviceLabel(key, status) {
  if (key.startsWith('lamp')) return status?.lamps.find((l) => l.key === key)?.name ?? key
  return key === 'window' ? 'janela' : 'varal'
}

function currentState(key, status) {
  if (!status) return null
  if (key.startsWith('lamp')) return status.lamps.find((l) => l.key === key)?.state
  return status[key]?.state
}

export default function Scenes({ scenes, status, busy, offline, onRun }) {
  return (
    <section className="card">
      <header className="card-head">
        <span className="card-icon">🎬</span>
        <div className="card-title">
          <h2>Cenas rápidas</h2>
          <p className="muted">Um clique faz várias coisas. Só o que precisa mudar é enviado ao ESP32.</p>
        </div>
      </header>
      <div className="scene-grid">
        {scenes.map((s) => {
          const active = status && s.actions.every(([k, c]) => currentState(k, status) === TARGET[c])
          return (
            <button
              key={s.id}
              className={`scene-btn ${active ? 'active' : ''}`}
              disabled={offline || busy[`scene-${s.id}`]}
              onClick={() => onRun(s)}
              title={active ? 'A casa já está neste estado' : `Executar a cena ${s.name}`}
            >
              <span className="scene-icon">{s.icon}</span>
              <span className="scene-name">
                {s.name}
                {active && <span className="scene-active">ativa</span>}
              </span>
              <span className="scene-chips">
                {s.actions.map(([k, c]) => (
                  <span key={k} className={`chip ${currentState(k, status) === TARGET[c] ? 'chip-done' : ''}`}>
                    {COMMAND_LABEL[c]} {deviceLabel(k, status).toLowerCase()}
                  </span>
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

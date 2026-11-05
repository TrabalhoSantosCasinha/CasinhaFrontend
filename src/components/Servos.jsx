import { formatTime, skyColors, SOURCE_LABEL, STATE_LABEL, timeAgo } from '../lib/format'

function Sky({ lum, children, className = '' }) {
  const sky = skyColors(lum)
  return (
    <div
      className={`scene-box ${className} ${sky.night ? 'night' : ''}`}
      style={{ background: `linear-gradient(${sky.top}, ${sky.bottom})` }}
      aria-hidden="true"
    >
      <span className="celestial">{sky.night ? '🌙' : '☀️'}</span>
      {children}
    </div>
  )
}

function WindowArt({ open, moving, lum }) {
  return (
    <Sky lum={lum} className={`window-art ${open ? 'open' : ''} ${moving ? 'moving' : ''}`}>
      <div className="wall">
        <div className="frame">
          <div className="pane pane-l" />
          <div className="pane pane-r" />
        </div>
      </div>
    </Sky>
  )
}

function ClotheslineArt({ extended, moving, lum }) {
  return (
    <Sky lum={lum} className={`line-art ${extended ? 'extended' : ''} ${moving ? 'moving' : ''}`}>
      <div className="line-wall" />
      <div className="line-rope">
        <span className="cloth c1">👕</span>
        <span className="cloth c2">👖</span>
        <span className="cloth c3">🧦</span>
        <span className="cloth c4">👗</span>
      </div>
      <div className="line-post" />
    </Sky>
  )
}

/**
 * Card genérico para os servos (janela e varal)
 * options: [{ cmd, target, label, icon }]
 */
function ServoCard({ title, icon, subtitle, device, options, busy, offline, onCommand, art, now, hint }) {
  const pending = device?.pending
  const known = !!device?.state
  const elapsed = pending ? Math.round((now - Date.parse(pending.since)) / 1000) : 0

  return (
    <section className="card servo-card">
      <header className="card-head">
        <span className="card-icon">{icon}</span>
        <div className="card-title">
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>
        <span className={`state-badge ${known ? `st-${device.state}` : 'st-unknown'}`}>
          {pending ? 'Movendo…' : known ? STATE_LABEL[device.state] ?? device.state : 'Sem dados'}
        </span>
      </header>

      {art}

      {pending ? (
        <div className="moving-bar">
          <div className="moving-track"><div className="moving-fill" /></div>
          <span>
            <span className="spinner" /> Servo em movimento ({options.find((o) => o.cmd === pending.command)?.label.toLowerCase()})… {elapsed}s
          </span>
        </div>
      ) : (
        <p className="muted servo-info">
          {known
            ? <>Está <strong>{STATE_LABEL[device.state]?.toLowerCase()}</strong> desde {formatTime(device.changedAt)} ({timeAgo(device.changedAt, now)}){device.changedBy && <> · por {SOURCE_LABEL[device.changedBy] ?? device.changedBy}</>}</>
            : 'Aguardando o ESP32 informar a posição.'}
        </p>
      )}

      {hint && <p className="inline-hint">{hint}</p>}

      <div className="choice-row">
        {options.map((o) => {
          const current = device?.state === o.target
          return (
            <button
              key={o.cmd}
              className={`choice ${current ? 'current' : ''}`}
              disabled={offline || busy || !!pending || current}
              onClick={() => onCommand(o.cmd)}
            >
              <span className="choice-icon">{o.icon}</span>
              <span>{current ? `${STATE_LABEL[o.target]}` : o.label}</span>
              {current && <span className="check">✓</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function WindowCard({ status, busy, offline, actions, now }) {
  const w = status?.window
  const lum = status?.luminosity?.value
  const dark = lum != null && lum <= (status?.automation?.darkThreshold ?? 30)
  return (
    <ServoCard
      title="Janela"
      icon="🪟"
      subtitle="Servo motor no GPIO 13 · tecla J"
      device={w}
      busy={busy}
      offline={offline}
      now={now}
      onCommand={actions.window}
      hint={w?.state === 'open' && dark && !w?.pending ? '🌙 Está escuro e a janela continua aberta.' : null}
      options={[
        { cmd: 'open', target: 'open', label: 'Abrir', icon: '↔️' },
        { cmd: 'close', target: 'closed', label: 'Fechar', icon: '🔒' },
      ]}
      art={<WindowArt open={w?.state === 'open'} moving={!!w?.pending} lum={lum} />}
    />
  )
}

export function ClotheslineCard({ status, busy, offline, actions, now }) {
  const c = status?.clothesline
  const lum = status?.luminosity?.value
  const dark = lum != null && lum <= (status?.automation?.darkThreshold ?? 30)
  return (
    <ServoCard
      title="Varal"
      icon="👕"
      subtitle="Servo motor no GPIO 33 · tecla V"
      device={c}
      busy={busy}
      offline={offline}
      now={now}
      onCommand={actions.clothesline}
      hint={c?.state === 'extended' && dark && !c?.pending ? '🌙 Escureceu e o varal ainda está estendido.' : null}
      options={[
        { cmd: 'extend', target: 'extended', label: 'Estender', icon: '➡️' },
        { cmd: 'retract', target: 'retracted', label: 'Recolher', icon: '⬅️' },
      ]}
      art={<ClotheslineArt extended={c?.state === 'extended'} moving={!!c?.pending} lum={lum} />}
    />
  )
}

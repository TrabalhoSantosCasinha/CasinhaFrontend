import { lightLevel, STATE_LABEL, timeAgo } from '../lib/format'

function Tile({ icon, label, value, detail, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`tile ${tone ? `tone-${tone}` : ''} ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <span className="tile-icon">{icon}</span>
      <span className="tile-text">
        <span className="tile-label">{label}</span>
        <span className="tile-value">{value}</span>
        {detail && <span className="tile-detail">{detail}</span>}
      </span>
    </Tag>
  )
}

export default function Summary({ status, now, goTo }) {
  const s = status
  const lum = s?.luminosity?.value
  const level = lightLevel(lum)
  const lampsOn = s?.lamps.filter((l) => l.state === 'on').length ?? 0

  return (
    <div className="tiles">
      <Tile
        icon="📡"
        label="ESP32"
        value={s?.esp32.online ? 'Online' : 'Offline'}
        detail={s?.esp32.lastSeen ? `último sinal ${timeAgo(s.esp32.lastSeen, now)}` : 'sem dados'}
        tone={s?.esp32.online ? 'ok' : 'bad'}
        onClick={() => goTo('dispositivos')}
      />
      <Tile icon={level.icon} label="Luz ambiente" value={lum != null ? `${lum}%` : '--'} detail={level.label} />
      <Tile
        icon="💡"
        label="Luzes acesas"
        value={`${lampsOn} de 3`}
        detail={s?.lamps.filter((l) => l.state === 'on').map((l) => l.name).join(', ') || 'nenhuma'}
        tone={lampsOn ? 'warm' : undefined}
      />
      <Tile
        icon="🪟"
        label="Janela"
        value={s?.window.pending ? 'Movendo…' : STATE_LABEL[s?.window.state] ?? '--'}
        tone={s?.window.state === 'open' ? 'ok' : undefined}
      />
      <Tile
        icon="👕"
        label="Varal"
        value={s?.clothesline.pending ? 'Movendo…' : STATE_LABEL[s?.clothesline.state] ?? '--'}
        tone={s?.clothesline.state === 'extended' ? 'ok' : undefined}
      />
      <Tile
        icon="🤖"
        label="Automação"
        value={s?.automation.enabled ? 'Ativa' : 'Desligada'}
        detail={s?.automation.enabled ? `escuro ≤ ${s.automation.darkThreshold}% · claro ≥ ${s.automation.brightThreshold}%` : 'clique para configurar'}
        tone={s?.automation.enabled ? 'ok' : undefined}
        onClick={() => goTo('automacao')}
      />
    </div>
  )
}

import { ACTIVITY_META, formatTime, SOURCE_LABEL, timeAgo } from '../lib/format'

export default function ActivityList({ items, now, compact = false }) {
  if (!items?.length) {
    return (
      <div className="empty">
        <span>🗒️</span>
        <p>Nenhuma atividade ainda.</p>
      </div>
    )
  }
  return (
    <ul className={`activity ${compact ? 'compact' : ''}`}>
      {items.map((e) => {
        const meta = ACTIVITY_META[e.type] ?? ACTIVITY_META.system
        return (
          <li key={e.id} className={`act act-${e.type}`}>
            <span className="act-icon" title={meta.label}>{meta.icon}</span>
            <div className="act-body">
              <span className="act-msg">{e.message}</span>
              <span className="act-meta">
                {formatTime(e.time, !compact)} · {timeAgo(e.time, now)}
                {e.source && e.type === 'state' && <> · por {SOURCE_LABEL[e.source] ?? e.source}</>}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

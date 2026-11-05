import { useMemo, useState } from 'react'
import { useElementWidth } from '../lib/hooks'
import { formatTime, lightLevel, timeAgo } from '../lib/format'

/* Medidor semicircular */
function Gauge({ value }) {
  const v = value ?? 0
  // azul-noite (escuro) -> amarelo-sol (claro), sem passar pelo verde
  const color = `color-mix(in oklab, var(--sun) ${v}%, var(--night))`
  return (
    <div className="gauge">
      <svg viewBox="0 0 200 115" role="img" aria-label={`Luminosidade ${value ?? 'sem leitura'} por cento`}>
        <path d="M20 100 A80 80 0 0 1 180 100" className="gauge-track" pathLength="100" />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          className="gauge-value"
          pathLength="100"
          style={{ strokeDasharray: `${v} 100`, stroke: color }}
        />
        <text x="20" y="114" className="gauge-tick">0</text>
        <text x="180" y="114" className="gauge-tick" textAnchor="end">100</text>
      </svg>
      <div className="gauge-center">
        <span className="gauge-number">{value ?? '--'}</span>
        <span className="gauge-unit">%</span>
      </div>
    </div>
  )
}

/* Gráfico de linha com limites e tooltip */
function Chart({ points, dark, bright, showThresholds }) {
  const [wrapRef, width] = useElementWidth()
  const [hover, setHover] = useState(null)
  const h = 190
  const pad = { l: 34, r: 10, t: 12, b: 24 }
  const w = Math.max(width, 200)
  const iw = w - pad.l - pad.r
  const ih = h - pad.t - pad.b
  const x = (i) => pad.l + (points.length < 2 ? 0 : (i / (points.length - 1)) * iw)
  const y = (v) => pad.t + ih - (v / 100) * ih

  if (points.length < 2) {
    return (
      <div className="chart-empty" ref={wrapRef}>
        <span>📉</span>
        <p>Aguardando leituras do sensor…</p>
        <small>O gráfico aparece assim que chegarem pelo menos 2 medições.</small>
      </div>
    )
  }

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1)},${pad.t + ih} L${pad.l},${pad.t + ih} Z`

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = Math.round(((px - pad.l) / iw) * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, i)))
  }

  const hp = hover != null ? points[hover] : null

  return (
    <div className="chart" ref={wrapRef}>
      <svg width={w} height={h} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="lumFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--sun)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--sun)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={w - pad.r} y1={y(g)} y2={y(g)} className="chart-grid" />
            <text x={pad.l - 6} y={y(g) + 4} className="chart-label" textAnchor="end">{g}</text>
          </g>
        ))}
        {showThresholds && (
          <>
            <rect x={pad.l} width={iw} y={y(dark)} height={y(0) - y(dark)} className="zone-dark" />
            <rect x={pad.l} width={iw} y={y(100)} height={y(bright) - y(100)} className="zone-bright" />
            <line x1={pad.l} x2={w - pad.r} y1={y(dark)} y2={y(dark)} className="chart-th th-dark" />
            <line x1={pad.l} x2={w - pad.r} y1={y(bright)} y2={y(bright)} className="chart-th th-bright" />
            <text x={w - pad.r - 4} y={y(dark) - 4} className="chart-th-label" textAnchor="end">🌙 escuro ≤ {dark}%</text>
            <text x={w - pad.r - 4} y={y(bright) - 4} className="chart-th-label" textAnchor="end">☀️ claro ≥ {bright}%</text>
          </>
        )}
        <path d={area} fill="url(#lumFill)" />
        <path d={line} className="chart-line" />
        <text x={pad.l} y={h - 6} className="chart-label">{formatTime(points[0].time)}</text>
        <text x={w - pad.r} y={h - 6} className="chart-label" textAnchor="end">{formatTime(points.at(-1).time)}</text>
        {hp && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} className="chart-cursor" />
            <circle cx={x(hover)} cy={y(hp.value)} r="5" className="chart-dot" />
          </g>
        )}
      </svg>
      {hp && (
        <div
          className="chart-tip"
          style={{ left: Math.min(Math.max(x(hover), 60), w - 60), top: y(hp.value) - 10 }}
        >
          <strong>{hp.value}%</strong>
          <span>{formatTime(hp.time, true)}</span>
        </div>
      )}
    </div>
  )
}

const RANGES = [
  { n: 30, label: '30 leituras' },
  { n: 60, label: '60' },
  { n: 150, label: '150' },
]

export default function LuminosityCard({ status, history, range, onRange, now }) {
  const lum = status?.luminosity
  const auto = status?.automation
  const level = lightLevel(lum?.value)
  const points = useMemo(() => history?.points ?? [], [history])

  const stats = useMemo(() => {
    if (!points.length) return null
    const values = points.map((p) => p.value)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const recent = values.slice(-5)
    const before = values.slice(-10, -5)
    let trend = 'estável'
    if (before.length) {
      const diff = recent.reduce((a, b) => a + b, 0) / recent.length - before.reduce((a, b) => a + b, 0) / before.length
      if (diff > 3) trend = 'subindo'
      else if (diff < -3) trend = 'caindo'
    }
    return { min: Math.min(...values), max: Math.max(...values), avg: Math.round(avg), trend }
  }, [points])

  const trendIcon = { subindo: '↗', caindo: '↘', estável: '→' }

  return (
    <section className="card lum-card">
      <header className="card-head">
        <span className="card-icon sun">☀️</span>
        <div className="card-title">
          <h2>Luminosidade ambiente</h2>
          <p className="muted">Sensor LDR no GPIO 34 · atualizado {timeAgo(lum?.updatedAt, now)}</p>
        </div>
        <div className="segmented small" role="group" aria-label="Quantidade de leituras no gráfico">
          {RANGES.map((r) => (
            <button key={r.n} className={range === r.n ? 'active' : ''} onClick={() => onRange(r.n)}>
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <div className="lum-body">
        <div className="lum-left">
          <Gauge value={lum?.value} />
          <div className={`level-pill tone-${level.tone}`}>
            <span>{level.icon}</span> {level.label}
          </div>
          {auto?.enabled && (
            <p className="muted center small-text">
              Automação: escurece em ≤ {auto.darkThreshold}% e clareia em ≥ {auto.brightThreshold}%
            </p>
          )}
        </div>
        <div className="lum-right">
          <Chart
            points={points}
            dark={auto?.darkThreshold ?? 30}
            bright={auto?.brightThreshold ?? 60}
            showThresholds={!!auto?.enabled}
          />
          <div className="stat-row">
            <div className="stat"><span>Mínima</span><strong>{stats ? `${stats.min}%` : '—'}</strong></div>
            <div className="stat"><span>Média</span><strong>{stats ? `${stats.avg}%` : '—'}</strong></div>
            <div className="stat"><span>Máxima</span><strong>{stats ? `${stats.max}%` : '—'}</strong></div>
            <div className="stat">
              <span>Tendência</span>
              <strong>{stats ? `${trendIcon[stats.trend]} ${stats.trend}` : '—'}</strong>
            </div>
          </div>
          {history?.source && (
            <p className="muted tiny">
              Fonte do histórico: {history.source === 'sth-comet' ? 'STH-Comet (FIWARE)' : 'memória do backend'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

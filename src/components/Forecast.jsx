import { forecastHour, timeAgo, weatherInfo } from '../lib/format'

// Previsão das próximas horas (Open-Meteo): barras com a chance de chuva de cada hora
export default function ForecastCard({ status, now, goTo }) {
  const f = status?.forecast
  if (!f) return null
  const current = weatherInfo(f.current?.weatherCode)
  const hours = f.hourly ?? []

  let summary
  if (!f.enabled) summary = 'Proteção pela previsão desligada'
  else if (f.error && !hours.length) summary = 'Não foi possível baixar a previsão'
  else if (f.alert) summary = `Chuva provável às ${forecastHour(f.nextRainAt)}: janela e varal protegidos`
  else summary = `Sem chuva forte prevista nas próximas ${f.hoursAhead} h (máx. ${f.maxProb ?? '--'}%)`

  return (
    <section className={`card forecast ${f.alert ? 'is-alert' : ''}`}>
      <header className="card-head">
        <span className="card-icon">{current.icon}</span>
        <div className="card-title">
          <h2>Previsão do tempo · {f.city}</h2>
          <p className="muted">
            {current.label}
            {f.current?.temperature != null && ` · ${Math.round(f.current.temperature)} °C`}
            {f.fetchedAt && ` · atualizada ${timeAgo(f.fetchedAt, now)}`} · Open-Meteo
          </p>
        </div>
        <button className="btn ghost small" onClick={() => goTo('automacao')}>Configurar</button>
      </header>

      <p className={`forecast-summary ${f.alert ? 'alert' : ''}`}>{f.alert ? '🌧️' : '🌤️'} {summary}</p>

      {hours.length > 0 && (
        <div className="forecast-bars" role="list" aria-label="Chance de chuva por hora">
          {hours.map((h, i) => {
            const p = h.probability ?? 0
            const inWindow = i < f.hoursAhead
            const high = p >= f.threshold
            return (
              <div
                key={h.time}
                role="listitem"
                className={`fbar ${inWindow ? 'in-window' : ''} ${high ? 'high' : ''}`}
                title={`${forecastHour(h.time)}: ${p}% de chance, ${h.precipitation ?? 0} mm`}
              >
                <span className="fbar-pct">{p}%</span>
                <div className="fbar-track">
                  <div className="fbar-fill" style={{ height: `${Math.max(p, 3)}%` }} />
                  <div className="fbar-threshold" style={{ bottom: `${f.threshold}%` }} />
                </div>
                <span className="fbar-hour">{forecastHour(h.time)}</span>
              </div>
            )
          })}
        </div>
      )}
      <p className="muted small-text">
        Barras destacadas: as próximas {f.hoursAhead} h que a automação observa. Linha tracejada: limite de {f.threshold}%.
      </p>
    </section>
  )
}

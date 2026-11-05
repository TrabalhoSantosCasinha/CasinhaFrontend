import ActivityList from '../components/ActivityList'
import Hints from '../components/Hints'
import LightsCard from '../components/Lights'
import LuminosityCard from '../components/Luminosity'
import Scenes from '../components/Scenes'
import { ClotheslineCard, WindowCard } from '../components/Servos'
import Summary from '../components/Summary'

const EMPTY_LAMPS = [1, 2, 3].map((n) => ({
  key: `lamp${n}`,
  number: n,
  name: `Luz ${n}`,
  state: null,
  todayMs: 0,
  switches: 0,
}))

export default function Dashboard({ status, history, range, onRange, scenes, busy, offline, actions, backendError, now, goTo }) {
  return (
    <div className="page">
      <Hints status={status} backendError={backendError} actions={actions} now={now} />
      <Summary status={status} now={now} goTo={goTo} />
      <Scenes scenes={scenes} status={status} busy={busy} offline={offline} onRun={actions.scene} />

      <div className="row-2-1">
        <LuminosityCard status={status} history={history} range={range} onRange={onRange} now={now} />
        <section className="card">
          <header className="card-head">
            <span className="card-icon">🗒️</span>
            <div className="card-title">
              <h2>Últimas atividades</h2>
              <p className="muted">Atualiza sozinho</p>
            </div>
            <button className="btn ghost small" onClick={() => goTo('atividade')}>Ver tudo</button>
          </header>
          <ActivityList items={status?.recentActivity} now={now} compact />
        </section>
      </div>

      <LightsCard lamps={status?.lamps ?? EMPTY_LAMPS} busy={busy} offline={offline} actions={actions} now={now} />

      <div className="row-1-1">
        <WindowCard status={status} busy={busy.window} offline={offline} actions={actions} now={now} />
        <ClotheslineCard status={status} busy={busy.clothesline} offline={offline} actions={actions} now={now} />
      </div>
    </div>
  )
}

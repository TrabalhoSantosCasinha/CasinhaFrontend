import { useCallback, useState } from 'react'
import { api } from '../lib/api'
import { formatTime, STATE_LABEL, timeAgo } from '../lib/format'
import { useInterval } from '../lib/hooks'
import { useToast } from '../lib/toast'

function Dot({ ok, unknown }) {
  return <span className={`dot ${unknown ? 'dot-unknown' : ok ? 'dot-ok' : 'dot-bad'}`} />
}

function Chain({ health, status, backendOk }) {
  const espOnline = status?.esp32.online
  const nodes = [
    { icon: '🖥️', name: 'Interface', sub: 'React · Vite', ok: true },
    { icon: '🟢', name: 'Backend', sub: 'Express :4000', ok: backendOk },
    { icon: '🧠', name: 'Orion', sub: health?.orion.version ? `v${health.orion.version} :1026` : ':1026', ok: health?.orion.ok },
    { icon: '🔁', name: 'IoT Agent UL', sub: health?.iotAgent.version ? `v${health.iotAgent.version} :4041` : ':4041', ok: health?.iotAgent.ok },
    { icon: '☁️', name: 'Broker MQTT', sub: 'público', ok: espOnline, unknown: !espOnline },
    { icon: '📟', name: 'ESP32', sub: espOnline ? 'online' : 'offline', ok: espOnline },
  ]
  return (
    <div className="chain">
      {nodes.map((n, i) => (
        <div key={n.name} className="chain-item">
          <div className={`chain-node ${n.unknown ? 'unknown' : n.ok ? 'ok' : 'bad'}`}>
            <span className="chain-icon">{n.icon}</span>
            <strong>{n.name}</strong>
            <span className="muted tiny">{n.sub}</span>
            <Dot ok={n.ok} unknown={n.unknown} />
          </div>
          {i < nodes.length - 1 && <span className="chain-arrow">→</span>}
        </div>
      ))}
    </div>
  )
}

function CopyText({ text }) {
  const toast = useToast()
  return (
    <button
      className="copy"
      title="Copiar"
      onClick={() => {
        navigator.clipboard?.writeText(text)
        toast({ type: 'success', title: 'Copiado', message: text, timeout: 2000 })
      }}
    >
      <code>{text}</code> <span>⧉</span>
    </button>
  )
}

function deviceState(d, status) {
  if (!status) return { state: null, updatedAt: null, name: d.label }
  if (d.key === 'sensor') {
    return {
      state: status.luminosity.value != null ? `${status.luminosity.value}%` : null,
      updatedAt: status.luminosity.updatedAt,
      name: d.label,
    }
  }
  const s = d.key.startsWith('lamp') ? status.lamps.find((l) => l.key === d.key) : status[d.key]
  return {
    state: s?.state ? STATE_LABEL[s.state] ?? s.state : null,
    updatedAt: s?.updatedAt,
    name: d.key.startsWith('lamp') ? `${d.label} · ${s?.name ?? ''}` : d.label,
  }
}

const WIRING = [
  { part: 'LDR (sensor de luz)', how: '3V3 → LDR → GPIO 34 → resistor 10 kΩ → GND (divisor de tensão)' },
  { part: 'LED Luz 1', how: 'GPIO 25 → resistor 220 Ω → perna maior do LED; perna menor → GND' },
  { part: 'LED Luz 2', how: 'GPIO 26 → resistor 220 Ω → LED → GND' },
  { part: 'LED Luz 3', how: 'GPIO 27 → resistor 220 Ω → LED → GND' },
  { part: 'Servo da janela', how: 'Sinal (laranja) → GPIO 13 · VCC (vermelho) → 5 V · GND (marrom) → GND' },
  { part: 'Servo do varal', how: 'Sinal (laranja) → GPIO 33 · VCC (vermelho) → 5 V · GND (marrom) → GND' },
]

export default function Devices({ status, backendOk, now }) {
  const [health, setHealth] = useState(null)
  const [info, setInfo] = useState(null)
  const [open, setOpen] = useState(null)
  const toast = useToast()

  const load = useCallback(async () => {
    try {
      const [h, d] = await Promise.all([api('/health'), info ? Promise.resolve(info) : api('/devices')])
      setHealth(h)
      setInfo(d)
    } catch {
      setHealth(null)
    }
  }, [info])
  useInterval(load, 5000)

  const runTest = async () => {
    try {
      await api('/test', { method: 'POST' })
      toast({ type: 'info', icon: '🧪', title: 'Teste iniciado', message: 'Cada luz vai piscar e os servos vão e voltam. Acompanhe na maquete!' })
    } catch (e) {
      toast({ type: 'error', title: 'Não foi possível testar', message: e.message })
    }
  }

  return (
    <div className="page">
      <section className="card">
        <header className="card-head">
          <span className="card-icon">🔗</span>
          <div className="card-title">
            <h2>Caminho da informação</h2>
            <p className="muted">Do clique na tela até o ESP32. Se algo estiver vermelho, o problema está ali.</p>
          </div>
        </header>
        <Chain health={health} status={status} backendOk={backendOk} />
        <div className="health-grid">
          {[
            ['Orion Context Broker', health?.orion],
            ['IoT Agent UltraLight', health?.iotAgent],
            ['STH-Comet (histórico)', health?.sth],
          ].map(([name, h]) => (
            <div key={name} className="health-item">
              <Dot ok={h?.ok} unknown={!health} />
              <div>
                <strong>{name}</strong>
                <span className="muted tiny">
                  {h ? (h.ok ? `respondeu em ${h.ms} ms` : 'sem resposta') : 'verificando…'} · {h?.url}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <span className="card-icon">📟</span>
          <div className="card-title">
            <h2>ESP32</h2>
            <p className="muted">
              {status?.esp32.online ? '🟢 Online' : '🔴 Offline'} · último sinal{' '}
              {status?.esp32.lastSeen ? `${formatTime(status.esp32.lastSeen, true)} (${timeAgo(status.esp32.lastSeen, now)})` : 'nunca'}
            </p>
          </div>
          <div className="head-actions">
            <button className="btn" onClick={runTest} disabled={!status?.esp32.online || status?.testRunning}>
              {status?.testRunning ? '🧪 Testando…' : '🧪 Testar hardware'}
            </button>
          </div>
        </header>
        <div className="kv-grid">
          <div><span className="muted">Broker MQTT</span><CopyText text={info?.broker ?? '—'} /></div>
          <div><span className="muted">APIKEY</span><CopyText text={info?.apikey ?? '—'} /></div>
          <div><span className="muted">Protocolo</span><strong>UltraLight 2.0 sobre MQTT</strong></div>
          <div><span className="muted">Serviço FIWARE</span><strong>casinha /</strong></div>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <span className="card-icon">🧩</span>
          <div className="card-title">
            <h2>Dispositivos ({info?.devices.length ?? 0})</h2>
            <p className="muted">Clique em um dispositivo para ver os tópicos MQTT e um exemplo de mensagem.</p>
          </div>
        </header>
        <div className="device-list">
          {info?.devices.map((d) => {
            const s = deviceState(d, status)
            const isOpen = open === d.key
            return (
              <div key={d.key} className={`device ${isOpen ? 'open' : ''}`}>
                <button className="device-row" onClick={() => setOpen(isOpen ? null : d.key)} aria-expanded={isOpen}>
                  <span className="device-name">
                    <strong>{s.name}</strong>
                    <span className="muted tiny">{d.hardware}</span>
                  </span>
                  <span className="pin">{d.pin}</span>
                  <span className="device-state">{s.state ?? '—'}</span>
                  <span className="muted tiny device-time">{s.updatedAt ? timeAgo(s.updatedAt, now) : 'sem dados'}</span>
                  <span className="chev">{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div className="device-detail">
                    <div><span className="muted">Device ID</span><CopyText text={d.deviceId} /></div>
                    <div><span className="muted">Entidade no Orion</span><CopyText text={d.entityId} /></div>
                    <div><span className="muted">ESP32 publica em</span><CopyText text={d.topics.attrs} /></div>
                    <div><span className="muted">Exemplo de mensagem</span><code className="pill-code">{d.attrs[0].example}</code></div>
                    {d.commands && (
                      <>
                        <div><span className="muted">ESP32 assina</span><CopyText text={d.topics.cmd} /></div>
                        <div><span className="muted">Confirmação em</span><CopyText text={d.topics.cmdexe} /></div>
                        <div>
                          <span className="muted">Comandos</span>
                          <span className="cmd-list">
                            {d.commands.map((c) => <code key={c} className="pill-code">{d.deviceId}@{c}|</code>)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <span className="card-icon">🔌</span>
          <div className="card-title">
            <h2>Ligações na protoboard</h2>
            <p className="muted">Pinagem usada no firmware casinha.ino.</p>
          </div>
        </header>
        <div className="wiring">
          {WIRING.map((w) => (
            <div key={w.part} className="wire-row">
              <strong>{w.part}</strong>
              <span>{w.how}</span>
            </div>
          ))}
        </div>
        <div className="tips">
          <p>⚠️ <strong>Servos:</strong> use uma fonte 5 V externa (os dois juntos puxam mais corrente do que a USB aguenta) e ligue o GND da fonte no GND do ESP32.</p>
          <p>💡 <strong>LDR:</strong> use o GPIO 34 (só entrada, ADC1) — os pinos do ADC2 não funcionam com o Wi-Fi ligado.</p>
          <p>🔧 <strong>Calibração:</strong> abra o Serial Monitor (115200) e veja o valor cru do LDR no claro e no escuro para ajustar LDR_DARK e LDR_LIGHT.</p>
        </div>
      </section>
    </div>
  )
}

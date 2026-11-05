import { timeAgo } from '../lib/format'

// Gera avisos e sugestões a partir do estado atual da casa
function buildHints(status, backendError, actions, now) {
  if (backendError) {
    return [{
      tone: 'error',
      icon: '🔌',
      title: 'Sem conexão com o backend',
      text: backendError,
      steps: ['Abra um terminal na pasta backend', 'Rode npm install (só na primeira vez)', 'Rode npm start'],
    }]
  }
  if (!status) return []
  const hints = []

  if (status.fiware.status !== 'ok') {
    hints.push({
      tone: 'error',
      icon: '🐳',
      title: 'FIWARE fora do ar',
      text: 'O backend não consegue falar com o Orion Context Broker.',
      steps: ['Abra o Docker Desktop', 'Na pasta fiwares rode: docker compose up -d', 'Aguarde ~30 s e esta mensagem some sozinha'],
    })
    return hints
  }

  if (!status.provisioned) {
    hints.push({
      tone: 'warn',
      icon: '🧩',
      title: 'Dispositivos não cadastrados no FIWARE',
      text: 'O Orion está no ar, mas a luz, a janela ou o varal ainda não foram provisionados.',
      steps: ['Na pasta fiwares rode: npm install', 'Depois rode: npm run provision'],
    })
  }

  if (!status.esp32.online) {
    hints.push({
      tone: 'warn',
      icon: '📡',
      title: 'ESP32 sem comunicação',
      text: status.esp32.lastSeen
        ? `O último dado chegou ${timeAgo(status.esp32.lastSeen, now)}. Confira a alimentação, o Wi-Fi e o Serial Monitor.`
        : 'Nenhum dado chegou ainda. Ligue o ESP32 ou rode o simulador: npm run simulate (pasta fiwares).',
    })
    return hints
  }

  const lum = status.luminosity.value
  const dark = lum != null && lum <= status.automation.darkThreshold
  const bright = lum != null && lum >= status.automation.brightThreshold
  const lampsOn = status.lamps.filter((l) => l.state === 'on')

  if (dark && lampsOn.length === 0) {
    hints.push({
      tone: 'info',
      icon: '🌙',
      title: 'Está escuro e todas as luzes estão apagadas',
      action: { label: 'Acender todas', run: () => actions.allLamps('on') },
    })
  }
  if (bright && lampsOn.length > 0) {
    hints.push({
      tone: 'info',
      icon: '♻️',
      title: `Está claro e ${lampsOn.length === 1 ? 'uma luz está acesa' : `${lampsOn.length} luzes estão acesas`}`,
      text: 'Apague para economizar energia.',
      action: { label: 'Apagar todas', run: () => actions.allLamps('off') },
    })
  }
  if (dark && status.clothesline.state === 'extended' && !status.clothesline.pending) {
    hints.push({
      tone: 'info',
      icon: '👕',
      title: 'Escureceu e o varal está estendido',
      action: { label: 'Recolher varal', run: () => actions.clothesline('retract') },
    })
  }
  if (dark && status.window.state === 'open' && !status.window.pending) {
    hints.push({
      tone: 'info',
      icon: '🪟',
      title: 'A janela está aberta e já escureceu',
      action: { label: 'Fechar janela', run: () => actions.window('close') },
    })
  }
  const longOn = status.lamps.find((l) => l.state === 'on' && l.onSince && now - Date.parse(l.onSince) > 2 * 3600 * 1000)
  if (longOn) {
    hints.push({
      tone: 'info',
      icon: '⏰',
      title: `${longOn.name} está acesa ${timeAgo(longOn.onSince, now)}`,
      action: { label: `Apagar ${longOn.name.toLowerCase()}`, run: () => actions.lamp(longOn.number, 'off') },
    })
  }
  return hints
}

export default function Hints({ status, backendError, actions, now }) {
  const hints = buildHints(status, backendError, actions, now)
  if (!hints.length) return null
  return (
    <div className="hints">
      {hints.map((h) => (
        <div key={h.title} className={`hint hint-${h.tone}`}>
          <span className="hint-icon">{h.icon}</span>
          <div className="hint-body">
            <strong>{h.title}</strong>
            {h.text && <p>{h.text}</p>}
            {h.steps && (
              <ol>
                {h.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            )}
          </div>
          {h.action && (
            <button className="btn" onClick={h.action.run}>
              {h.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

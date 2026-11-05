export function formatTime(iso, withSeconds = false) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  })
}

export function formatDay(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

export function timeAgo(iso, now = Date.now()) {
  if (!iso) return 'nunca'
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (s < 5) return 'agora'
  if (s < 60) return `há ${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h ${m % 60 ? `${m % 60} min` : ''}`.trim()
  return `há ${Math.floor(h / 24)} d`
}

export function duration(ms) {
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 1) return `${Math.floor(ms / 1000)} s`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`
}

export function lightLevel(v) {
  if (v == null) return { label: 'Sem leitura', icon: '❔', tone: 'muted' }
  if (v < 15) return { label: 'Muito escuro', icon: '🌑', tone: 'night' }
  if (v < 35) return { label: 'Escuro', icon: '🌘', tone: 'night' }
  if (v < 60) return { label: 'Meia-luz', icon: '🌗', tone: 'dusk' }
  if (v < 85) return { label: 'Claro', icon: '🌤️', tone: 'day' }
  return { label: 'Muito claro', icon: '☀️', tone: 'day' }
}

// Cor do "céu" das ilustrações de acordo com a luminosidade
export function skyColors(v) {
  const t = Math.max(0, Math.min(1, (v ?? 60) / 100))
  const mix = (a, b) => Math.round(a + (b - a) * t)
  const top = `rgb(${mix(18, 120)}, ${mix(26, 190)}, ${mix(60, 255)})`
  const bottom = `rgb(${mix(52, 214)}, ${mix(48, 236)}, ${mix(100, 255)})`
  return { top, bottom, night: t < 0.35 }
}

export const SOURCE_LABEL = {
  manual: 'Você',
  all: 'Você',
  scene: 'Cena',
  automation: 'Automação',
  test: 'Teste',
  device: 'ESP32',
}

export const COMMAND_LABEL = {
  on: 'Acender',
  off: 'Apagar',
  open: 'Abrir',
  close: 'Fechar',
  extend: 'Estender',
  retract: 'Recolher',
  none: 'Nada',
}

export const STATE_LABEL = {
  on: 'Acesa',
  off: 'Apagada',
  open: 'Aberta',
  closed: 'Fechada',
  extended: 'Estendido',
  retracted: 'Recolhido',
}

export const ACTIVITY_META = {
  command: { icon: '👆', label: 'Comando' },
  scene: { icon: '🎬', label: 'Cena' },
  automation: { icon: '🤖', label: 'Automação' },
  state: { icon: '✅', label: 'Estado' },
  error: { icon: '⚠️', label: 'Erro' },
  system: { icon: '⚙️', label: 'Sistema' },
}

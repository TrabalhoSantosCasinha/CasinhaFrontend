import { useCallback, useMemo, useState } from 'react'
import ActivityList from '../components/ActivityList'
import { api } from '../lib/api'
import { ACTIVITY_META, formatDay } from '../lib/format'
import { useInterval } from '../lib/hooks'
import { useToast } from '../lib/toast'

const FILTERS = [
  { id: '', label: 'Tudo' },
  { id: 'state', label: 'Mudanças de estado' },
  { id: 'command', label: 'Comandos' },
  { id: 'scene', label: 'Cenas' },
  { id: 'automation', label: 'Automação' },
  { id: 'error', label: 'Erros' },
  { id: 'system', label: 'Sistema' },
]

function toCsv(items) {
  const head = 'data_hora;tipo;mensagem;origem'
  const rows = items.map((e) =>
    [new Date(e.time).toLocaleString('pt-BR'), ACTIVITY_META[e.type]?.label ?? e.type, `"${e.message.replace(/"/g, '""')}"`, e.source ?? ''].join(';'),
  )
  return [head, ...rows].join('\n')
}

export default function Activity({ now }) {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const toast = useToast()

  const load = useCallback(async () => {
    try {
      setItems(await api('/activity?limit=300'))
    } catch {
      /* o aviso de conexão já aparece no topo */
    }
  }, [])
  useInterval(load, 3000)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((e) => (!filter || e.type === filter) && (!q || e.message.toLowerCase().includes(q)))
  }, [items, filter, search])

  const groups = useMemo(() => {
    const map = new Map()
    for (const e of filtered) {
      const day = formatDay(e.time)
      if (!map.has(day)) map.set(day, [])
      map.get(day).push(e)
    }
    return [...map.entries()]
  }, [filtered])

  const counts = useMemo(() => {
    const c = {}
    for (const e of items) c[e.type] = (c[e.type] ?? 0) + 1
    return c
  }, [items])

  const exportCsv = () => {
    const blob = new Blob(['﻿' + toCsv(filtered)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `casinha-atividades-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clear = async () => {
    if (!window.confirm('Apagar todo o histórico de atividades?')) return
    try {
      await api('/activity', { method: 'DELETE' })
      toast({ type: 'success', title: 'Histórico limpo' })
      load()
    } catch (e) {
      toast({ type: 'error', title: 'Não foi possível limpar', message: e.message })
    }
  }

  return (
    <div className="page">
      <section className="card">
        <header className="card-head">
          <span className="card-icon">🗒️</span>
          <div className="card-title">
            <h2>Atividades</h2>
            <p className="muted">Tudo o que aconteceu na casinha: comandos, cenas, automação, mudanças e erros.</p>
          </div>
          <div className="head-actions">
            <button className="btn ghost" onClick={exportCsv} disabled={!filtered.length}>⬇ Exportar CSV</button>
            <button className="btn ghost danger" onClick={clear} disabled={!items.length}>Limpar</button>
          </div>
        </header>

        <div className="toolbar">
          <div className="filter-chips">
            {FILTERS.map((f) => (
              <button key={f.id} className={`fchip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.id && ACTIVITY_META[f.id]?.icon} {f.label}
                <span className="count">{f.id ? counts[f.id] ?? 0 : items.length}</span>
              </button>
            ))}
          </div>
          <input
            className="search"
            type="search"
            placeholder="Buscar… (ex.: janela)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {groups.length === 0 ? (
          <ActivityList items={[]} now={now} />
        ) : (
          groups.map(([day, list]) => (
            <div key={day} className="day-group">
              <h3 className="day-title">{day}</h3>
              <ActivityList items={list} now={now} />
            </div>
          ))
        )}
      </section>
    </div>
  )
}

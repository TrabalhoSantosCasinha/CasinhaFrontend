import { useEffect, useRef, useState } from 'react'

// Executa fn agora e a cada `ms` milissegundos
export function useInterval(fn, ms) {
  const saved = useRef(fn)
  useEffect(() => {
    saved.current = fn
  }, [fn])
  useEffect(() => {
    const first = setTimeout(() => saved.current(), 0)
    const id = setInterval(() => saved.current(), ms)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [ms])
}

// Relógio que força re-render (para "há X s" ficar sempre certo)
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

// Retorna [callbackRef, largura]; funciona mesmo se o elemento for trocado
export function useElementWidth() {
  const [el, setEl] = useState(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [setEl, width]
}

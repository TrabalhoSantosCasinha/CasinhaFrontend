// Em produção (Vercel) aponta para o backend via VITE_API_URL (ngrok, VM ou Render).
// Em desenvolvimento fica vazio e o proxy do Vite manda /api para localhost:4000.
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

// O ngrok grátis mostra uma página de aviso antes do site; este cabeçalho pula o aviso.
const EXTRA_HEADERS = API_URL.includes('ngrok') ? { 'ngrok-skip-browser-warning': 'true' } : {}

export async function api(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: { ...EXTRA_HEADERS, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Backend fora do ar — rode "npm start" na pasta backend')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 502 || res.status === 504) throw new Error('Backend fora do ar — rode "npm start" na pasta backend')
    throw new Error(data.error || `Erro ${res.status}`)
  }
  return data
}

// Em produção (Vercel) aponta para o backend na Render via VITE_API_URL.
// Em desenvolvimento fica vazio e o proxy do Vite manda /api para localhost:4000.
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export async function api(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
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

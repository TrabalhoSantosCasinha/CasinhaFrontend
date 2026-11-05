export async function api(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`/api${path}`, {
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

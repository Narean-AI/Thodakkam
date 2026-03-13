export function getTokenPayload() {
  try {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem('token')
    if (!token) return null
    const parts = token.split('.')
    if (parts.length < 2) return null
    // atob may not exist in some environments, guard it
    const b64 = typeof atob === 'function' ? atob(parts[1]) : Buffer.from(parts[1], 'base64').toString('utf8')
    return JSON.parse(b64)
  } catch (e) {
    return null
  }
}

export default getTokenPayload

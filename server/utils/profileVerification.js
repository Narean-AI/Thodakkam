const axios = require('axios')

// GitHub API verification
const verifyGitHub = async (url) => {
  try {
    if (!/^https?:\/\//i.test(url)) return { ok: false, message: 'Invalid URL format' }
    const parsed = new URL(url)
    if (!parsed.hostname.toLowerCase().includes('github.com')) {
      return { ok: false, message: 'Not a GitHub URL' }
    }

    const parts = parsed.pathname.split('/').filter(Boolean)
    const username = parts[0]
    if (!username) return { ok: false, message: 'Could not extract GitHub username' }

    const ghToken = process.env.GITHUB_TOKEN
    const headers = {
      'User-Agent': 'Placement-Intelligence-Platform',
      ...(ghToken && { 'Authorization': `token ${ghToken}` })
    }

    const resp = await axios.get(`https://api.github.com/users/${username}`, {
      timeout: 8000,
      headers
    })

    if (resp.status === 200 && resp.data.login) {
      return { ok: true, data: resp.data, message: `GitHub user @${resp.data.login} verified` }
    }
    return { ok: false, message: 'GitHub profile not found' }
  } catch (err) {
    if (err.response?.status === 404) {
      return { ok: false, message: 'GitHub user not found' }
    }
    if (err.response?.status === 403) {
      return { ok: false, message: 'GitHub API rate limited. Try again later.' }
    }
    return { ok: false, message: `GitHub verification failed: ${err.message}` }
  }
}

// LinkedIn API verification (checks profile accessibility)
const verifyLinkedIn = async (url) => {
  try {
    if (!/^https?:\/\//i.test(url)) return { ok: false, message: 'Invalid URL format' }
    const parsed = new URL(url)
    if (!parsed.hostname.toLowerCase().includes('linkedin.com')) {
      return { ok: false, message: 'Not a LinkedIn URL' }
    }

    const parts = parsed.pathname.split('/').filter(Boolean)
    let username = null
    if (parts.includes('in') && parts[parts.indexOf('in') + 1]) {
      username = parts[parts.indexOf('in') + 1]
    }
    // Try HEAD/GET directly first
    try {
      const headResp = await axios.head(url, {
        timeout: 8000,
        maxRedirects: 3,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        validateStatus: (status) => status < 500
      })

      if (headResp.status === 200 || headResp.status === 302 || headResp.status === 301) {
        return {
          ok: true,
          username: username || 'unknown',
          message: `LinkedIn profile verified: ${url}`
        }
      }
    } catch (headErr) {
      // fallthrough to GET / proxy
    }

    // Try GET directly
    try {
      const getResp = await axios.get(url, {
        timeout: 8000,
        maxRedirects: 3,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        validateStatus: (status) => status < 500
      })

      if (getResp.status === 200 && typeof getResp.data === 'string' && getResp.data.length > 100) {
        // basic heuristic: page returned content
        return { ok: true, username: username || 'unknown', message: `LinkedIn profile verified: ${url}` }
      }
    } catch (getErr) {
      // fallthrough to proxy fallback
    }

    // Fallback: use Jina AI text proxy to fetch page content (helps bypass some blocks)
    try {
      const proxyUrl = `https://r.jina.ai/http://${parsed.hostname}${parsed.pathname}`
      const proxyResp = await axios.get(proxyUrl, { timeout: 8000 })
      if (proxyResp.status === 200 && typeof proxyResp.data === 'string') {
        const txt = proxyResp.data.toLowerCase()
        // heuristics: look for linkedin markers or username
        if (txt.includes('linkedin.com/in') || (username && txt.includes(username.toLowerCase()))) {
          return { ok: true, username: username || 'unknown', message: `LinkedIn profile verified via proxy: ${url}` }
        }
        // if large text returned assume accessible
        if (proxyResp.data.length > 200) {
          return { ok: true, username: username || 'unknown', message: `LinkedIn profile verified via proxy: ${url}` }
        }
      }
    } catch (proxyErr) {
      // last resort fail
    }

    return { ok: false, message: 'LinkedIn profile could not be accessed (may be private, blocked, or profile may not exist)' }
  } catch (err) {
    return { ok: false, message: `LinkedIn verification failed: ${err.message}` }
  }
}

// Unified profile verification
const verifyProfile = async (url, type) => {
  try {
    if (type === 'github') {
      return await verifyGitHub(url)
    } else if (type === 'linkedin') {
      return await verifyLinkedIn(url)
    }
    return { ok: false, message: 'Unknown profile type' }
  } catch (err) {
    return { ok: false, message: 'Verification error' }
  }
}

module.exports = { verifyProfile, verifyGitHub, verifyLinkedIn }

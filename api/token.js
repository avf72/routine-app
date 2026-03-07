export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { code, code_verifier, refresh_token, redirect_uri, grant_type } = req.body

  const params = {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    grant_type,
  }

  if (grant_type === 'authorization_code') {
    params.code = code
    params.code_verifier = code_verifier
    params.redirect_uri = redirect_uri
  } else if (grant_type === 'refresh_token') {
    params.refresh_token = refresh_token
  } else {
    return res.status(400).json({ error: 'unsupported grant_type' })
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    })
    const data = await response.json()
    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

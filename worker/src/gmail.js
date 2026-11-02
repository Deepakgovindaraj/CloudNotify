export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

function bytesToBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function base64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function encryptionKey(keyBase64) {
  if (!keyBase64) throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY is not configured')
  let raw
  try {
    raw = base64ToBytes(keyBase64)
  } catch {
    throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  }
  if (raw.byteLength !== 32) {
    throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  }
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptSecret(value, keyBase64) {
  const key = await encryptionKey(keyBase64)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value)
  )
  return `v1.${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`
}

export async function decryptSecret(ciphertext, keyBase64) {
  const parts = String(ciphertext || '').split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') {
    throw new Error('Stored mailbox credentials cannot be decrypted')
  }
  const key = await encryptionKey(keyBase64)
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(parts[1]) },
      key,
      base64ToBytes(parts[2])
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    throw new Error('Stored mailbox credentials cannot be decrypted')
  }
}

export function createPkceVerifier() {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)))
}

export async function createPkceChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

export function createOAuthState() {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)))
}

export function createAuthorizationUrl({ clientId, redirectUri, state, codeChallenge }) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_READONLY_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  }).toString()
  return url.toString()
}

export class GmailApiError extends Error {
  constructor(status, message = 'Gmail API request failed') {
    super(message)
    this.name = 'GmailApiError'
    this.status = status
  }
}

async function readJsonResponse(response) {
  if (!response.ok) throw new GmailApiError(response.status)
  return response.json()
}

export async function exchangeAuthorizationCode(env, { code, verifier, redirectUri }) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })
  return readJsonResponse(response)
}

export async function refreshAccessToken(env, refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  return readJsonResponse(response)
}

export async function gmailApiRequest(accessToken, path) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return readJsonResponse(response)
}

export async function revokeGoogleToken(token) {
  const response = await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  })
  if (!response.ok) throw new GmailApiError(response.status, 'Google token revocation failed')
}

function decodeMessageBody(data) {
  if (!data) return ''
  try {
    return new TextDecoder().decode(base64ToBytes(data))
  } catch {
    throw new Error('Gmail message body could not be decoded')
  }
}

function collectTextParts(part, result) {
  if (!part) return
  const mimeType = String(part.mimeType || '').toLowerCase()
  if (mimeType === 'text/plain' || mimeType === 'text/html') {
    result.push(decodeMessageBody(part.body?.data))
  }
  for (const child of part.parts || []) collectTextParts(child, result)
}

export function parseGmailMessage(message) {
  const headers = Object.fromEntries(
    (message.payload?.headers || []).map(({ name, value }) => [
      String(name).toLowerCase(),
      String(value || ''),
    ])
  )
  const textParts = []
  collectTextParts(message.payload, textParts)
  const internalDate = Number(message.internalDate)
  return {
    messageId: String(message.id || ''),
    threadId: message.threadId ? String(message.threadId) : null,
    receivedAt: Number.isFinite(internalDate) && internalDate > 0
      ? new Date(internalDate).toISOString()
      : null,
    subject: headers.subject || '',
    body: textParts.join('\n').slice(0, 100000),
  }
}

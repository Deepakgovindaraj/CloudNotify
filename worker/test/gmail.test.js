import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createAuthorizationUrl,
  createPkceChallenge,
  decryptSecret,
  encryptSecret,
  GMAIL_READONLY_SCOPE,
  parseGmailMessage,
} from '../src/gmail.js'

const key = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)))

test('encrypts mailbox credentials and rejects tampering', async () => {
  const encrypted = await encryptSecret('refresh-token-value', key)
  assert.notEqual(encrypted, 'refresh-token-value')
  assert.equal(await decryptSecret(encrypted, key), 'refresh-token-value')
  await assert.rejects(() => decryptSecret(`${encrypted.slice(0, -2)}aa`, key))
})

test('builds a Gmail read-only OAuth URL with PKCE and state', async () => {
  const challenge = await createPkceChallenge('verifier')
  const url = new URL(createAuthorizationUrl({
    clientId: 'client-id',
    redirectUri: 'https://api.example.test/gmail/oauth/callback',
    state: 'one-time-state',
    codeChallenge: challenge,
  }))

  assert.equal(url.searchParams.get('scope'), GMAIL_READONLY_SCOPE)
  assert.equal(url.searchParams.get('state'), 'one-time-state')
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(url.searchParams.get('access_type'), 'offline')
})

test('extracts message metadata and decodes nested plain-text MIME parts', () => {
  const body = btoa('Your interview is scheduled.')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  const parsed = parseGmailMessage({
    id: 'message-1',
    threadId: 'thread-1',
    internalDate: '1767225600000',
    payload: {
      headers: [
        { name: 'Subject', value: 'Interview scheduled' },
        { name: 'From', value: 'Recruiter <recruiter@example.test>' },
      ],
      mimeType: 'multipart/alternative',
      parts: [{ mimeType: 'text/plain', body: { data: body } }],
    },
  })

  assert.equal(parsed.messageId, 'message-1')
  assert.equal(parsed.threadId, 'thread-1')
  assert.equal(parsed.subject, 'Interview scheduled')
  assert.equal(parsed.body, 'Your interview is scheduled.')
  assert.equal(parsed.receivedAt, '2026-01-01T00:00:00.000Z')
})

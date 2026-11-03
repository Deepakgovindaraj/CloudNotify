import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import worker from '../src/index.js'

const require = createRequire(import.meta.url)
const { getPlatformProxy } = require('wrangler')
const token = 'user-settings-test-session'
const email = 'owner@example.test'

async function hash(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function request(proxy, path, method = 'GET', body) {
  return worker.fetch(new Request(`https://api.example.test${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), proxy.env)
}

test('preserves timezone preferences and removes read-only Gmail endpoints', async (t) => {
  const proxy = await getPlatformProxy({
    configPath: fileURLToPath(new URL('../wrangler.toml', import.meta.url)),
    persist: false,
  })
  t.after(() => proxy.dispose())

  const migrationDirectory = fileURLToPath(new URL('../migrations/', import.meta.url))
  for (const file of readdirSync(migrationDirectory).filter((name) => name.endsWith('.sql')).sort()) {
    const migration = await readFile(`${migrationDirectory}\\${file}`, 'utf8')
    for (const statement of migration.split(';').map((part) => part.trim()).filter(Boolean)) {
      await proxy.env.DB.prepare(statement).run()
    }
  }

  await proxy.env.DB.prepare(
    `INSERT INTO auth_sessions (token_hash, email, expires_at)
     VALUES (?, ?, datetime('now', '+1 day'))`
  ).bind(await hash(token), email).run()

  const saved = await request(proxy, '/user/preferences', 'PUT', { timezone: 'Asia/Tokyo' })
  assert.equal(saved.status, 200)
  assert.deepEqual(await saved.json(), { timezone: 'Asia/Tokyo' })

  const loaded = await request(proxy, '/user/preferences')
  assert.equal(loaded.status, 200)
  assert.deepEqual(await loaded.json(), { timezone: 'Asia/Tokyo' })

  await proxy.env.DB.prepare(
    `INSERT INTO notifications
      (notification_id, title, message, recipient_email, owner_email,
       scheduled_date, scheduled_time, timezone, channel, status, error_message)
     VALUES ('failed-gmail', 'Gmail test', 'Message', 'recipient@example.test', ?,
       '2026-11-03', '14:10', 'Asia/Kolkata', 'BOTH', 'FAILED',
       'Telegram was delivered, but Gmail delivery failed with HTTP 401 (invalidCredentials)')`
  ).bind(email).run()

  const notifications = await request(proxy, '/notifications')
  assert.equal(notifications.status, 200)
  assert.equal((await notifications.json())[0].errorMessage,
    'Telegram was delivered, but Gmail delivery failed with HTTP 401 (invalidCredentials)')

  for (const [path, method] of [
    ['/gmail/connect', 'POST'],
    ['/gmail/oauth/callback', 'GET'],
    ['/gmail/connection', 'GET'],
    ['/gmail/connection', 'DELETE'],
    ['/gmail/sync', 'POST'],
    ['/interview-events', 'GET'],
  ]) {
    const response = await request(proxy, path, method)
    assert.equal(response.status, 404, `${method} ${path} should be removed`)
  }

  const removedTables = await proxy.env.DB.prepare(
    `SELECT name FROM sqlite_master
      WHERE type = 'table' AND name IN (
        'gmail_connections', 'gmail_oauth_states', 'gmail_sync_state',
        'gmail_messages', 'gmail_rate_limits', 'interview_events',
        'interview_event_sources', 'interview_reminders'
      )`
  ).all()
  assert.deepEqual(removedTables.results, [])
})

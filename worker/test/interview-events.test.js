import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import worker from '../src/index.js'

const require = createRequire(import.meta.url)
const { getPlatformProxy } = require('wrangler')
const token = 'interview-event-test-session'
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

test('authenticated interview review creates and updates only one pair of reminders', async (t) => {
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
  await proxy.env.DB.prepare(
    `INSERT INTO gmail_connections (owner_email, gmail_email, refresh_token_ciphertext)
     VALUES (?, 'mailbox@example.test', 'encrypted-token')`
  ).bind(email).run()
  await proxy.env.DB.prepare(
    `INSERT INTO gmail_sync_state (owner_email, sync_status, sync_lock_until)
     VALUES (?, 'SYNCING', datetime('now', '+2 minutes'))`
  ).bind(email).run()

  const overlappingSync = await request(proxy, '/gmail/sync', 'POST')
  assert.equal(overlappingSync.status, 409)
  assert.equal((await overlappingSync.json()).status, 'SYNCING')
  const syncState = await proxy.env.DB.prepare(
    'SELECT sync_status, sync_lock_until FROM gmail_sync_state WHERE owner_email = ?'
  ).bind(email).first()
  assert.equal(syncState.sync_status, 'SYNCING')
  assert(syncState.sync_lock_until)

  await proxy.env.DB.prepare(
    `INSERT INTO interview_events
      (event_id, owner_email, status, company_name, job_role, interview_date,
       interview_time, timezone, interview_type, confidence)
     VALUES ('event-one', ?, 'REVIEW', 'Acme', 'Engineer', '2099-05-04',
       '10:30', 'UTC', 'remote', 0.9)`
  ).bind(email).run()

  const listed = await request(proxy, '/interview-events')
  assert.equal(listed.status, 200)
  assert.equal((await listed.json()).length, 1)

  const confirmBody = {
    companyName: 'Acme',
    jobRole: 'Engineer',
    interviewDate: '2099-05-04',
    interviewTime: '10:30',
    timezone: 'UTC',
    interviewType: 'remote',
    channel: 'GMAIL',
  }
  const confirmed = await request(proxy, '/interview-events/event-one/confirm', 'POST', confirmBody)
  assert.equal(confirmed.status, 200)
  const reminders = await proxy.env.DB.prepare(
    `SELECT notification_id, scheduled_date, scheduled_time, status
       FROM notifications WHERE owner_email = ? ORDER BY scheduled_date`
  ).bind(email).all()
  assert.equal(reminders.results.length, 2)
  assert.deepEqual(reminders.results.map(({ scheduled_date, scheduled_time }) =>
    [scheduled_date, scheduled_time]), [
    ['2099-05-03', '09:00'],
    ['2099-05-04', '08:00'],
  ])

  const confirmedAgain = await request(proxy, '/interview-events/event-one/confirm', 'POST', confirmBody)
  assert.equal(confirmedAgain.status, 200)
  const edited = await request(proxy, '/interview-events/event-one', 'PATCH', {
    ...confirmBody,
    interviewDate: '2099-05-05',
  })
  assert.equal(edited.status, 200)
  const afterEdit = await proxy.env.DB.prepare(
    'SELECT notification_id, scheduled_date FROM notifications WHERE owner_email = ?'
  ).bind(email).all()
  assert.equal(afterEdit.results.length, 2)
  assert(afterEdit.results.every((reminder) => reminder.scheduled_date >= '2099-05-04'))

  const deleted = await request(proxy, '/interview-events/event-one', 'DELETE')
  assert.equal(deleted.status, 200)
  const remaining = await proxy.env.DB.prepare(
    'SELECT notification_id FROM notifications WHERE owner_email = ?'
  ).bind(email).all()
  assert.equal(remaining.results.length, 0)
})

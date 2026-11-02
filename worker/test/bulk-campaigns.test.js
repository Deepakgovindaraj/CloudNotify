import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import worker from '../src/index.js'

const require = createRequire(import.meta.url)
const { getPlatformProxy } = require('wrangler')
const token = 'bulk-campaign-test-session'
const email = 'hr@example.test'

async function hash(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function request(proxy, path, method = 'POST', body, authorization = token) {
  return worker.fetch(new Request(`https://api.example.test${path}`, {
    method,
    headers: {
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), proxy.env)
}

test('creates an authenticated draft and stores recipient validation per owner', async (t) => {
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

  const campaign = {
    campaignName: 'December offers',
    organizationName: 'Example Inc',
    campaignType: 'OFFER_LETTERS',
    senderName: 'HR Team',
    senderEmail: 'hr@example.test',
    emailSubject: 'Offer for {{candidate_name}}',
    emailBody: 'Hello {{candidate_name}}',
    documentTitle: 'Offer Letter',
    documentBody: 'Dear {{candidate_name}}, welcome to {{organization_name}}.',
    recipients: [
      {
        rowNumber: 2,
        candidateName: 'Ada Lovelace',
        email: 'ada@example.test',
        data: { candidate_name: 'Ada Lovelace', email: 'ada@example.test', joining_date: '2026-12-01' },
        included: true,
      },
      {
        rowNumber: 3,
        candidateName: '',
        email: 'invalid@example.test',
        data: { candidate_name: '', email: 'invalid@example.test', joining_date: '2026-02-30' },
        included: true,
      },
      {
        rowNumber: 4,
        candidateName: 'Ada Duplicate',
        email: 'ADA@example.test',
        data: { candidate_name: 'Ada Duplicate', email: 'ADA@example.test' },
        included: true,
      },
      {
        rowNumber: 5,
        candidateName: 'Grace Hopper',
        email: 'grace@example.test',
        data: { candidate_name: 'Grace Hopper', email: 'grace@example.test', job_role: 'Engineer' },
        included: true,
      },
    ],
  }

  const unauthenticated = await request(proxy, '/campaigns', 'POST', campaign, '')
  assert.equal(unauthenticated.status, 401)

  const response = await request(proxy, '/campaigns', 'POST', campaign)
  assert.equal(response.status, 201)
  const created = await response.json()
  assert.equal(created.status, 'DRAFT')
  assert.equal(created.totalRecipients, 4)
  assert.equal(created.validRecipients, 1)
  assert.equal(created.invalidRecipients, 3)

  const stored = await proxy.env.DB.prepare(
    `SELECT r.candidate_name, r.email, r.validation_status, r.validation_errors, r.included,
            c.owner_email, c.status
       FROM bulk_campaign_recipients r
       JOIN bulk_campaigns c ON c.campaign_id = r.campaign_id
      WHERE r.campaign_id = ?
      ORDER BY r.row_number`
  ).bind(created.campaignId).all()
  assert.equal(stored.results.length, 4)
  assert(stored.results.every((recipient) => recipient.owner_email === email))
  assert(stored.results.every((recipient) => recipient.status === 'DRAFT'))
  assert.deepEqual(stored.results.map((recipient) => recipient.validation_status), [
    'INVALID',
    'INVALID',
    'INVALID',
    'VALID',
  ])
  assert.deepEqual(stored.results.map((recipient) => recipient.included), [0, 0, 0, 1])
  assert(stored.results[1].validation_errors.includes('joining date'))

  const listed = await request(proxy, '/campaigns', 'GET')
  assert.equal(listed.status, 200)
  const campaigns = await listed.json()
  assert.equal(campaigns.length, 1)
  assert.equal(campaigns[0].campaignId, created.campaignId)
  assert.equal(campaigns[0].includedRecipients, 1)

  const detail = await request(proxy, `/campaigns/${created.campaignId}`, 'GET')
  assert.equal(detail.status, 200)
  const savedDraft = await detail.json()
  assert.equal(savedDraft.recipients.length, 4)
  assert.deepEqual(savedDraft.recipients[1].validationErrors, [
    'Candidate name is required.',
    'joining date must use YYYY-MM-DD format.',
  ])
  assert(savedDraft.recipients[2].validationErrors.includes('Email address is duplicated in this file.'))
  assert.equal(savedDraft.recipients[3].data.job_role, 'Engineer')
  assert.equal(savedDraft.emailSubject, 'Offer for {{candidate_name}}')
  assert.equal(savedDraft.emailBody, 'Hello {{candidate_name}}')
  assert.equal(savedDraft.documentTitle, 'Offer Letter')
  assert.equal(savedDraft.documentBody, 'Dear {{candidate_name}}, welcome to {{organization_name}}.')

  const anotherEmail = 'other@example.test'
  const anotherToken = 'different-owner-session'
  await proxy.env.DB.prepare(
    `INSERT INTO auth_sessions (token_hash, email, expires_at)
     VALUES (?, ?, datetime('now', '+1 day'))`
  ).bind(await hash(anotherToken), anotherEmail).run()
  const privateDraft = await request(
    proxy,
    `/campaigns/${created.campaignId}`,
    'GET',
    undefined,
    anotherToken
  )
  assert.equal(privateDraft.status, 404)

  const updatedTemplates = {
    emailSubject: 'Updated subject',
    emailBody: 'Updated message',
    documentTitle: 'Updated document',
    documentBody: 'Updated body',
  }
  const updateResponse = await request(
    proxy,
    `/campaigns/${created.campaignId}`,
    'PATCH',
    updatedTemplates
  )
  assert.equal(updateResponse.status, 200)
  assert.deepEqual(await updateResponse.json(), {
    campaignId: created.campaignId,
    ...updatedTemplates,
  })
  const unauthenticatedTemplateUpdate = await request(
    proxy,
    `/campaigns/${created.campaignId}`,
    'PATCH',
    updatedTemplates,
    ''
  )
  assert.equal(unauthenticatedTemplateUpdate.status, 401)

  const oversizedTemplateUpdate = await request(
    proxy,
    `/campaigns/${created.campaignId}`,
    'PATCH',
    { ...updatedTemplates, documentBody: 'x'.repeat(20001) }
  )
  assert.equal(oversizedTemplateUpdate.status, 400)

  const privateTemplateUpdate = await request(
    proxy,
    `/campaigns/${created.campaignId}`,
    'PATCH',
    updatedTemplates,
    anotherToken
  )
  assert.equal(privateTemplateUpdate.status, 404)

  const updatedDraftResponse = await request(proxy, `/campaigns/${created.campaignId}`, 'GET')
  const updatedDraft = await updatedDraftResponse.json()
  assert.equal(updatedDraft.emailSubject, 'Updated subject')
  assert.equal(updatedDraft.documentBody, 'Updated body')
})

test('rejects invalid campaign metadata', async (t) => {
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

  const invalidCampaign = await request(proxy, '/campaigns', 'POST', {
    campaignName: 'Bad date',
    organizationName: 'Example',
    campaignType: 'OFFER_LETTERS',
    senderName: 'HR',
    senderEmail: 'hr@example.test',
    campaignDate: '2026-02-30',
    recipients: [{ rowNumber: 2, candidateName: 'Ada', email: 'ada@example.test', data: {}, included: true }],
  })
  assert.equal(invalidCampaign.status, 400)
})

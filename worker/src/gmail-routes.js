import {
  createAuthorizationUrl,
  createOAuthState,
  createPkceChallenge,
  createPkceVerifier,
  decryptSecret,
  encryptSecret,
  exchangeAuthorizationCode,
  gmailApiRequest,
  GmailApiError,
  parseGmailMessage,
  refreshAccessToken,
  revokeGoogleToken,
} from './gmail.js'
import { extractInterview } from './interview-extractor.js'
import { buildInterviewReminderSchedule } from './interview-reminders.js'

export function createGmailHandlers({
  json,
  getOrigin,
  authenticatedUser,
  hashValue,
  parseTime,
  normalizeChannel,
  getScheduledTime,
}) {
  function appOrigins(env) {
    return String(env.GMAIL_APP_ORIGINS || '')
      .split(',')
      .map((origin) => {
        try {
          return new URL(origin.trim()).origin
        } catch {
          return ''
        }
      })
      .filter(Boolean)
  }

  async function consumeRateLimit(request, env, key, limit) {
    const origin = getOrigin(request, env)
    await env.DB.prepare(
      `INSERT INTO gmail_rate_limits (rate_limit_key, window_start, request_count)
       VALUES (?, CAST(strftime('%s', 'now') AS INTEGER) / 60, 1)
       ON CONFLICT(rate_limit_key) DO UPDATE SET
         request_count = CASE
           WHEN gmail_rate_limits.window_start = excluded.window_start
           THEN gmail_rate_limits.request_count + 1
           ELSE 1
         END,
         window_start = excluded.window_start`
    ).bind(key).run()
    const row = await env.DB.prepare(
      'SELECT request_count FROM gmail_rate_limits WHERE rate_limit_key = ?'
    ).bind(key).first()
    return row.request_count > limit
      ? json({ error: 'Too many requests. Please try again shortly.' }, 429, origin)
      : null
  }

  function validTimezone(value) {
    if (typeof value !== 'string' || value.length > 100) return false
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value })
      return true
    } catch {
      return false
    }
  }

  function validCalendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
  }

  function errorCode(error) {
    if (error instanceof GmailApiError) {
      if (error.status === 401 || error.status === 403) return 'GMAIL_AUTHORIZATION_FAILED'
      if (error.status === 429) return 'GMAIL_RATE_LIMITED'
      return `GMAIL_HTTP_${error.status}`
    }
    return 'GMAIL_SYNC_FAILED'
  }

  function redirectToApp(origin, params) {
    const target = new URL('/profile', origin)
    for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value)
    return new Response(null, {
      status: 302,
      headers: {
        Location: target.toString(),
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      },
    })
  }

  async function connect(request, env) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)
    const limited = await consumeRateLimit(request, env, `${user.email}:gmail_connect`, 5)
    if (limited) return limited

    const requestedOrigin = request.headers.get('Origin')
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET ||
        !env.GMAIL_TOKEN_ENCRYPTION_KEY) {
      return json({ error: 'Gmail authorization is not configured' }, 503, origin)
    }
    if (!requestedOrigin || !appOrigins(env).includes(requestedOrigin)) {
      return json({ error: 'This application origin is not configured for Gmail authorization' }, 403, origin)
    }

    await env.DB.prepare(
      'DELETE FROM gmail_oauth_states WHERE expires_at <= CURRENT_TIMESTAMP'
    ).run()
    const state = createOAuthState()
    const verifier = createPkceVerifier()
    const redirectUri = new URL('/gmail/oauth/callback', request.url).toString()
    const verifierCiphertext = await encryptSecret(verifier, env.GMAIL_TOKEN_ENCRYPTION_KEY)
    await env.DB.prepare(
      `INSERT INTO gmail_oauth_states
        (state_hash, owner_email, app_origin, redirect_uri, verifier_ciphertext, expires_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', '+10 minutes'))`
    ).bind(
      await hashValue(state),
      user.email,
      requestedOrigin,
      redirectUri,
      verifierCiphertext
    ).run()

    const codeChallenge = await createPkceChallenge(verifier)
    return json({
      authorizationUrl: createAuthorizationUrl({
        clientId: env.GOOGLE_CLIENT_ID,
        redirectUri,
        state,
        codeChallenge,
      }),
    }, 200, origin)
  }

  async function callback(request, env) {
    const url = new URL(request.url)
    const state = url.searchParams.get('state')
    if (!state || state.length > 512) {
      return new Response('Invalid OAuth state', { status: 400 })
    }
    const oauthState = await env.DB.prepare(
      `DELETE FROM gmail_oauth_states
        WHERE state_hash = ? AND expires_at > CURRENT_TIMESTAMP
        RETURNING owner_email, app_origin, redirect_uri, verifier_ciphertext`
    ).bind(await hashValue(state)).first()
    if (!oauthState || !appOrigins(env).includes(oauthState.app_origin) ||
        oauthState.redirect_uri !== new URL('/gmail/oauth/callback', request.url).toString()) {
      return new Response('Invalid or expired OAuth state', { status: 400 })
    }
    if (url.searchParams.has('error') || !url.searchParams.get('code')) {
      return redirectToApp(oauthState.app_origin, { gmail: 'error', reason: 'authorization_denied' })
    }

    try {
      const verifier = await decryptSecret(
        oauthState.verifier_ciphertext,
        env.GMAIL_TOKEN_ENCRYPTION_KEY
      )
      const tokens = await exchangeAuthorizationCode(env, {
        code: url.searchParams.get('code'),
        verifier,
        redirectUri: oauthState.redirect_uri,
      })
      if (!tokens.access_token ||
          !String(tokens.scope || '').split(/\s+/).includes('https://www.googleapis.com/auth/gmail.readonly')) {
        throw new Error('Gmail read-only access was not granted')
      }

      const profile = await gmailApiRequest(tokens.access_token, 'profile')
      const gmailEmail = String(profile.emailAddress || '').trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmailEmail)) {
        throw new Error('Google did not return a valid Gmail address')
      }
      const existing = await env.DB.prepare(
        'SELECT gmail_email, refresh_token_ciphertext FROM gmail_connections WHERE owner_email = ?'
      ).bind(oauthState.owner_email).first()
      const refreshToken = tokens.refresh_token
        ? await encryptSecret(tokens.refresh_token, env.GMAIL_TOKEN_ENCRYPTION_KEY)
        : existing?.gmail_email === gmailEmail
          ? existing.refresh_token_ciphertext
          : null
      if (!refreshToken) throw new Error('Google did not issue offline mailbox access')

      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO gmail_connections
            (owner_email, gmail_email, refresh_token_ciphertext, status, connected_at, updated_at)
           VALUES (?, ?, ?, 'CONNECTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT(owner_email) DO UPDATE SET
             gmail_email = excluded.gmail_email,
             refresh_token_ciphertext = excluded.refresh_token_ciphertext,
             status = 'CONNECTED',
             connected_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP`
        ).bind(oauthState.owner_email, gmailEmail, refreshToken),
        existing && existing.gmail_email !== gmailEmail
          ? env.DB.prepare(
            `UPDATE gmail_sync_state SET sync_mode = 'INITIAL', history_id = NULL,
               page_token = NULL, sync_lock_until = NULL, sync_status = 'IDLE',
               last_successful_sync_at = NULL, last_error = NULL,
               updated_at = CURRENT_TIMESTAMP WHERE owner_email = ?`
          ).bind(oauthState.owner_email)
          : env.DB.prepare(
          `INSERT INTO gmail_sync_state (owner_email)
           VALUES (?)
           ON CONFLICT(owner_email) DO UPDATE SET
             sync_status = 'IDLE', last_error = NULL, updated_at = CURRENT_TIMESTAMP`
          ).bind(oauthState.owner_email),
      ])
      return redirectToApp(oauthState.app_origin, { gmail: 'connected' })
    } catch (error) {
      console.error('Gmail OAuth callback failed', {
        name: error.name,
        status: error.status || 0,
      })
      return redirectToApp(oauthState.app_origin, { gmail: 'error', reason: 'connection_failed' })
    }
  }

  async function connectionStatus(request, env) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)
    const row = await env.DB.prepare(
      `SELECT c.gmail_email, c.status, s.sync_status, s.last_successful_sync_at, s.last_error
         FROM gmail_connections c
         LEFT JOIN gmail_sync_state s ON s.owner_email = c.owner_email
        WHERE c.owner_email = ?`
    ).bind(user.email).first()
    return json({
      connected: Boolean(row && row.status === 'CONNECTED'),
      status: row?.status || 'DISCONNECTED',
      email: row?.gmail_email || null,
      syncStatus: row?.sync_status || 'IDLE',
      lastSuccessfulSyncAt: row?.last_successful_sync_at || null,
      error: row?.last_error || null,
    }, 200, origin)
  }

  async function disconnect(request, env) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)
    const limited = await consumeRateLimit(request, env, `${user.email}:gmail_disconnect`, 5)
    if (limited) return limited
    const connection = await env.DB.prepare(
      'SELECT refresh_token_ciphertext FROM gmail_connections WHERE owner_email = ?'
    ).bind(user.email).first()
    if (!connection) return json({ connected: false }, 200, origin)

    let revokeFailed = false
    try {
      const refreshToken = await decryptSecret(
        connection.refresh_token_ciphertext,
        env.GMAIL_TOKEN_ENCRYPTION_KEY
      )
      await revokeGoogleToken(refreshToken)
    } catch (error) {
      revokeFailed = true
      console.error('Google token revocation failed', {
        name: error.name,
        status: error.status || 0,
      })
    }
    await env.DB.batch([
      env.DB.prepare('DELETE FROM gmail_connections WHERE owner_email = ?').bind(user.email),
      env.DB.prepare(
        `UPDATE gmail_sync_state SET sync_status = 'IDLE', last_error = NULL,
           page_token = NULL, sync_lock_until = NULL, sync_mode = 'INITIAL', history_id = NULL,
           updated_at = CURRENT_TIMESTAMP WHERE owner_email = ?`
      ).bind(user.email),
    ])
    if (revokeFailed) {
      return json({
        error: 'The mailbox was disconnected locally, but Google could not confirm token revocation.',
        connected: false,
      }, 502, origin)
    }
    return json({ connected: false }, 200, origin)
  }

  async function accessToken(env, ownerEmail) {
    const connection = await env.DB.prepare(
      'SELECT refresh_token_ciphertext, status FROM gmail_connections WHERE owner_email = ?'
    ).bind(ownerEmail).first()
    if (!connection || connection.status !== 'CONNECTED') {
      throw new Error('Gmail mailbox is not connected')
    }
    let tokens
    try {
      const refreshToken = await decryptSecret(
        connection.refresh_token_ciphertext,
        env.GMAIL_TOKEN_ENCRYPTION_KEY
      )
      tokens = await refreshAccessToken(env, refreshToken)
    } catch (error) {
      if (error instanceof GmailApiError && (error.status === 400 || error.status === 401)) {
        await env.DB.batch([
          env.DB.prepare(
            `UPDATE gmail_connections SET status = 'REAUTH_REQUIRED', updated_at = CURRENT_TIMESTAMP
              WHERE owner_email = ?`
          ).bind(ownerEmail),
          env.DB.prepare(
            `UPDATE gmail_sync_state SET sync_status = 'REAUTH_REQUIRED',
               last_error = 'Mailbox authorization expired or was revoked.',
               sync_lock_until = NULL,
               updated_at = CURRENT_TIMESTAMP WHERE owner_email = ?`
          ).bind(ownerEmail),
        ])
        throw new Error('Gmail authorization has expired or was revoked')
      }
      throw error
    }
    if (!tokens.access_token) throw new Error('Google did not return an access token')
    return tokens.access_token
  }

  async function processMessage(env, ownerEmail, mailboxEmail, token, messageId) {
    const prior = await env.DB.prepare(
      `SELECT status FROM gmail_messages
        WHERE owner_email = ? AND mailbox_email = ? AND message_id = ?`
    ).bind(ownerEmail, mailboxEmail, messageId).first()
    if (prior?.status === 'PROCESSED') return false
    await env.DB.prepare(
      `INSERT INTO gmail_messages (owner_email, mailbox_email, message_id, status)
       VALUES (?, ?, ?, 'PENDING')
       ON CONFLICT(owner_email, mailbox_email, message_id) DO UPDATE SET
         status = 'PENDING', error_code = NULL`
    ).bind(ownerEmail, mailboxEmail, messageId).run()

    let parsed
    try {
      parsed = parseGmailMessage(await gmailApiRequest(
        token,
        `messages/${encodeURIComponent(messageId)}?format=full`
      ))
    } catch (error) {
      if (error instanceof GmailApiError && error.status === 404) {
        await env.DB.prepare(
          `UPDATE gmail_messages SET status = 'PROCESSED',
             error_code = 'MESSAGE_NO_LONGER_AVAILABLE', processed_at = CURRENT_TIMESTAMP
            WHERE owner_email = ? AND mailbox_email = ? AND message_id = ?`
        ).bind(ownerEmail, mailboxEmail, messageId).run()
        return false
      }
      await env.DB.prepare(
        `UPDATE gmail_messages SET status = 'FAILED', error_code = ?
          WHERE owner_email = ? AND mailbox_email = ? AND message_id = ?`
      ).bind(errorCode(error), ownerEmail, mailboxEmail, messageId).run()
      throw error
    }

    const extracted = extractInterview({ subject: parsed.subject, body: parsed.body })
    const eventId = extracted
      ? await hashValue(`${ownerEmail}\n${mailboxEmail}\n${messageId}`)
      : null
    const statements = []
    if (extracted) {
      statements.push(env.DB.prepare(
        `INSERT OR IGNORE INTO interview_events
          (event_id, owner_email, status, company_name, job_role, interview_date,
           interview_time, timezone, location, meeting_url, interview_type, confidence)
         VALUES (?, ?, 'REVIEW', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        eventId, ownerEmail, extracted.companyName, extracted.jobRole,
        extracted.interviewDate, extracted.interviewTime, extracted.timezone,
        extracted.location, extracted.meetingUrl, extracted.interviewType,
        extracted.confidence
      ))
      statements.push(env.DB.prepare(
        `INSERT OR IGNORE INTO interview_event_sources
          (event_id, owner_email, mailbox_email, message_id, thread_id)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(eventId, ownerEmail, mailboxEmail, messageId, parsed.threadId))
    }
    statements.push(env.DB.prepare(
      `UPDATE gmail_messages SET status = 'PROCESSED', event_id = ?,
         received_at = ?, processed_at = CURRENT_TIMESTAMP, error_code = NULL
        WHERE owner_email = ? AND mailbox_email = ? AND message_id = ?`
    ).bind(eventId, parsed.receivedAt, ownerEmail, mailboxEmail, messageId))
    await env.DB.batch(statements)
    return Boolean(extracted)
  }

  async function finishPage(env, ownerEmail, { mode, historyId, pageToken, complete }) {
    await env.DB.prepare(
      `UPDATE gmail_sync_state SET sync_mode = ?, history_id = ?, page_token = ?,
         sync_lock_until = NULL, sync_status = ?,
         last_successful_sync_at = CASE WHEN ? THEN CURRENT_TIMESTAMP
           ELSE last_successful_sync_at END,
         last_error = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE owner_email = ?`
    ).bind(
      mode, historyId, pageToken, complete ? 'IDLE' : 'SYNCING',
      complete ? 1 : 0, ownerEmail
    ).run()
  }

  async function initialSyncPage(env, ownerEmail, mailboxEmail, token, state) {
    const query = env.GMAIL_SYNC_QUERY ||
      'newer_than:30d {category:primary category:updates}'
    const params = new URLSearchParams({ q: query, maxResults: '10' })
    if (state.page_token) params.set('pageToken', state.page_token)
    const page = await gmailApiRequest(token, `messages?${params}`)
    let eventsCreated = 0
    for (const item of page.messages || []) {
      if (await processMessage(env, ownerEmail, mailboxEmail, token, String(item.id))) eventsCreated += 1
    }
    const nextPageToken = page.nextPageToken || null
    const complete = !nextPageToken
    await finishPage(env, ownerEmail, {
      mode: complete ? 'HISTORY' : 'INITIAL',
      historyId: state.history_id,
      pageToken: nextPageToken,
      complete,
    })
    return {
      complete,
      eventsCreated,
      messagesProcessed: (page.messages || []).length,
    }
  }

  async function historySyncPage(env, ownerEmail, mailboxEmail, token, state) {
    const params = new URLSearchParams({
      startHistoryId: String(state.history_id),
      historyTypes: 'messageAdded',
      maxResults: '10',
    })
    if (state.page_token) params.set('pageToken', state.page_token)
    const page = await gmailApiRequest(token, `history?${params}`)
    const messageIds = [...new Set((page.history || []).flatMap((record) =>
      (record.messagesAdded || []).map((item) => item.message?.id).filter(Boolean)
    ))]
    let eventsCreated = 0
    for (const messageId of messageIds) {
      if (await processMessage(env, ownerEmail, mailboxEmail, token, String(messageId))) eventsCreated += 1
    }
    const nextPageToken = page.nextPageToken || null
    const complete = !nextPageToken
    await finishPage(env, ownerEmail, {
      mode: 'HISTORY',
      historyId: complete ? String(page.historyId || state.history_id) : state.history_id,
      pageToken: nextPageToken,
      complete,
    })
    return { complete, eventsCreated, messagesProcessed: messageIds.length }
  }

  async function performSync(env, ownerEmail) {
    const connection = await env.DB.prepare(
      'SELECT status, gmail_email FROM gmail_connections WHERE owner_email = ?'
    ).bind(ownerEmail).first()
    if (!connection || connection.status !== 'CONNECTED') {
      throw new Error('Connect or reauthorize Gmail before synchronizing.')
    }
    try {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO gmail_sync_state (owner_email) VALUES (?)'
      ).bind(ownerEmail).run()
      const lock = await env.DB.prepare(
        `UPDATE gmail_sync_state SET sync_lock_until = datetime('now', '+2 minutes'),
           sync_status = 'SYNCING', last_sync_started_at = CURRENT_TIMESTAMP,
           last_error = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE owner_email = ? AND (
            sync_lock_until IS NULL OR sync_lock_until < CURRENT_TIMESTAMP
          )`
      ).bind(ownerEmail).run()
      if (!lock.meta.changes) throw new Error('Gmail synchronization is already in progress.')

      const token = await accessToken(env, ownerEmail)
      let state = await env.DB.prepare(
        'SELECT * FROM gmail_sync_state WHERE owner_email = ?'
      ).bind(ownerEmail).first()
      if (!state || !state.history_id) {
        const profile = await gmailApiRequest(token, 'profile')
        await env.DB.prepare(
          `INSERT INTO gmail_sync_state
            (owner_email, sync_mode, history_id, sync_status, last_sync_started_at)
           VALUES (?, 'INITIAL', ?, 'SYNCING', CURRENT_TIMESTAMP)
           ON CONFLICT(owner_email) DO UPDATE SET
             sync_mode = 'INITIAL', history_id = excluded.history_id, page_token = NULL,
             sync_status = 'SYNCING', last_sync_started_at = CURRENT_TIMESTAMP,
             last_error = NULL, updated_at = CURRENT_TIMESTAMP`
        ).bind(ownerEmail, String(profile.historyId)).run()
        state = await env.DB.prepare(
          'SELECT * FROM gmail_sync_state WHERE owner_email = ?'
        ).bind(ownerEmail).first()
      }

      let result
      if (state.sync_mode === 'INITIAL') {
        try {
          result = await initialSyncPage(env, ownerEmail, connection.gmail_email, token, state)
        } catch (error) {
          if (!(error instanceof GmailApiError) || error.status !== 400 || !state.page_token) {
            throw error
          }
          await env.DB.prepare(
            `UPDATE gmail_sync_state SET page_token = NULL, updated_at = CURRENT_TIMESTAMP
              WHERE owner_email = ?`
          ).bind(ownerEmail).run()
          state.page_token = null
          result = await initialSyncPage(env, ownerEmail, connection.gmail_email, token, state)
        }
      } else {
        try {
          result = await historySyncPage(env, ownerEmail, connection.gmail_email, token, state)
        } catch (error) {
          if (!(error instanceof GmailApiError) || error.status !== 404) throw error
          const profile = await gmailApiRequest(token, 'profile')
          await env.DB.prepare(
            `UPDATE gmail_sync_state SET sync_mode = 'INITIAL', history_id = ?,
               page_token = NULL, sync_status = 'SYNCING', last_error = NULL,
               updated_at = CURRENT_TIMESTAMP WHERE owner_email = ?`
          ).bind(String(profile.historyId), ownerEmail).run()
          state = await env.DB.prepare(
            'SELECT * FROM gmail_sync_state WHERE owner_email = ?'
          ).bind(ownerEmail).first()
          result = await initialSyncPage(env, ownerEmail, connection.gmail_email, token, state)
        }
      }
      return result
    } catch (error) {
      if (error.message === 'Gmail synchronization is already in progress.') throw error
      if (error.message === 'Gmail authorization has expired or was revoked') {
        await env.DB.prepare(
          `UPDATE gmail_sync_state SET sync_lock_until = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE owner_email = ?`
        ).bind(ownerEmail).run()
        throw error
      }
      await env.DB.prepare(
        `UPDATE gmail_sync_state SET sync_status = 'FAILED', sync_lock_until = NULL, last_error = ?,
           updated_at = CURRENT_TIMESTAMP WHERE owner_email = ?`
      ).bind(errorCode(error), ownerEmail).run()
      console.error('Gmail synchronization failed', {
        name: error.name,
        status: error.status || 0,
      })
      throw error
    }
  }

  async function sync(request, env) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)
    const limited = await consumeRateLimit(request, env, `${user.email}:gmail_sync`, 20)
    if (limited) return limited
    try {
      const result = await performSync(env, user.email)
      return json({
        complete: result.complete,
        eventsCreated: result.eventsCreated,
        messagesProcessed: result.messagesProcessed,
        hasMore: !result.complete,
        status: result.complete ? 'IDLE' : 'SYNCING',
      }, 200, origin)
    } catch (error) {
      if (error.message === 'Gmail authorization has expired or was revoked') {
        return json({ error: error.message, status: 'REAUTH_REQUIRED' }, 409, origin)
      }
      if (error.message === 'Gmail synchronization is already in progress.') {
        return json({ error: error.message, status: 'SYNCING' }, 409, origin)
      }
      if (error.message === 'Connect or reauthorize Gmail before synchronizing.') {
        return json({ error: error.message }, 409, origin)
      }
      return json({ error: 'Gmail synchronization failed. Please try again.' }, 502, origin)
    }
  }

  async function syncScheduled(env) {
    const due = await env.DB.prepare(
      `SELECT c.owner_email FROM gmail_connections c
         JOIN gmail_sync_state s ON s.owner_email = c.owner_email
        WHERE c.status = 'CONNECTED'
          AND (s.sync_lock_until IS NULL OR s.sync_lock_until < CURRENT_TIMESTAMP)
          AND (s.sync_status != 'FAILED' OR
               s.last_sync_started_at < datetime('now', '-15 minutes'))
          AND (
            s.sync_mode = 'INITIAL'
            OR s.last_successful_sync_at IS NULL
            OR s.last_successful_sync_at < datetime('now', '-15 minutes')
          )
        ORDER BY s.last_sync_started_at, s.last_successful_sync_at
        LIMIT 10`
    ).all()
    for (const row of due.results) {
      try {
        await performSync(env, row.owner_email)
      } catch (error) {
        if (error.message !== 'Gmail synchronization is already in progress.') {
          console.error('Scheduled Gmail synchronization failed', {
            name: error.name,
            status: error.status || 0,
          })
        }
      }
    }
  }

  function mapEvent(row, sources, reminders) {
    return {
      eventId: row.event_id,
      status: row.status,
      companyName: row.company_name,
      jobRole: row.job_role,
      interviewDate: row.interview_date,
      interviewTime: row.interview_time,
      timezone: row.timezone,
      location: row.location,
      meetingUrl: row.meeting_url,
      interviewType: row.interview_type,
      confidence: row.confidence,
      deliveryChannel: row.delivery_channel,
      updatedAt: row.updated_at,
      sources: sources.map((source) => ({
        messageId: source.message_id,
        threadId: source.thread_id,
        mailboxEmail: source.mailbox_email,
        gmailUrl: `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(source.message_id)}`,
      })),
      reminders: reminders.map((reminder) => ({
        type: reminder.reminder_type,
        status: reminder.status,
      })),
    }
  }

  async function events(request, env) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)
    const result = await env.DB.prepare(
      `SELECT * FROM interview_events WHERE owner_email = ?
        ORDER BY CASE status WHEN 'REVIEW' THEN 0 WHEN 'CONFIRMED' THEN 1 ELSE 2 END,
          interview_date, created_at DESC LIMIT 200`
    ).bind(user.email).all()
    const sources = await env.DB.prepare(
      'SELECT event_id, mailbox_email, message_id, thread_id FROM interview_event_sources WHERE owner_email = ?'
    ).bind(user.email).all()
    const reminders = await env.DB.prepare(
      `SELECT r.event_id, r.reminder_type,
              COALESCE(n.status, r.status) AS status
         FROM interview_reminders r
         LEFT JOIN notifications n ON n.notification_id = r.notification_id
        WHERE r.event_id IN (
          SELECT event_id FROM interview_events WHERE owner_email = ?
        )`
    ).bind(user.email).all()
    const sourcesByEvent = new Map()
    const remindersByEvent = new Map()
    for (const source of sources.results) {
      if (!sourcesByEvent.has(source.event_id)) sourcesByEvent.set(source.event_id, [])
      sourcesByEvent.get(source.event_id).push(source)
    }
    for (const reminder of reminders.results) {
      if (!remindersByEvent.has(reminder.event_id)) remindersByEvent.set(reminder.event_id, [])
      remindersByEvent.get(reminder.event_id).push(reminder)
    }
    return json(result.results.map((row) => mapEvent(
      row,
      sourcesByEvent.get(row.event_id) || [],
      remindersByEvent.get(row.event_id) || []
    )), 200, origin)
  }

  function eventFields(body, current = {}) {
    const field = (camel, snake, max = 500) => {
      const value = Object.hasOwn(body, camel) ? body[camel] : current[snake]
      if (value === null || value === undefined || String(value).trim() === '') return null
      const result = String(value).trim()
      if (result.length > max) throw new Error(`${camel} is too long`)
      return result
    }
    const date = field('interviewDate', 'interview_date', 10)
    if (date && !validCalendarDate(date)) throw new Error('A valid interview date is required')
    const rawTime = field('interviewTime', 'interview_time', 20)
    const time = rawTime ? parseTime(rawTime) : null
    if (rawTime && !time) throw new Error('A valid interview time is required')
    const timezone = field('timezone', 'timezone', 100)
    if (timezone && !validTimezone(timezone)) throw new Error('A valid IANA timezone is required')
    const meetingUrl = field('meetingUrl', 'meeting_url', 2048)
    if (meetingUrl) {
      let parsed
      try {
        parsed = new URL(meetingUrl)
      } catch {
        throw new Error('Meeting URL must be a valid HTTPS URL')
      }
      if (parsed.protocol !== 'https:') throw new Error('Meeting URL must use HTTPS')
    }
    const interviewType = field('interviewType', 'interview_type', 20) || 'unknown'
    if (!['unknown', 'remote', 'onsite', 'phone'].includes(interviewType)) {
      throw new Error('Interview type is invalid')
    }
    return {
      companyName: field('companyName', 'company_name', 200),
      jobRole: field('jobRole', 'job_role', 200),
      interviewDate: date,
      interviewTime: time,
      timezone,
      location: field('location', 'location', 500),
      meetingUrl,
      interviewType,
    }
  }

  function eventParameters(fields) {
    return [
      fields.companyName, fields.jobRole, fields.interviewDate, fields.interviewTime,
      fields.timezone, fields.location, fields.meetingUrl, fields.interviewType,
    ]
  }

  async function ownedEvent(env, email, id) {
    return env.DB.prepare(
      'SELECT * FROM interview_events WHERE event_id = ? AND owner_email = ?'
    ).bind(id, email).first()
  }

  async function refreshReminders(env, email, event, channel) {
    const timezone = event.timezone
    const reminderPlan = buildInterviewReminderSchedule(event)
    const statements = []
    for (const reminder of reminderPlan) {
      const notificationId = `interview_${event.event_id}_${reminder.type.toLowerCase()}`
      const existing = await env.DB.prepare(
        `SELECT r.status AS reminder_status, n.status AS notification_status
           FROM interview_reminders r
           LEFT JOIN notifications n ON n.notification_id = r.notification_id
          WHERE r.event_id = ? AND r.reminder_type = ?`
      ).bind(event.event_id, reminder.type).first()
      if (existing?.reminder_status === 'SENT' || existing?.notification_status === 'SENT') continue

      if (!reminder.future) {
        statements.push(env.DB.prepare(
          `DELETE FROM notifications WHERE notification_id = ?
            AND status IN ('PENDING', 'FAILED')`
        ).bind(notificationId))
        statements.push(env.DB.prepare(
          `INSERT INTO interview_reminders (event_id, reminder_type, notification_id, status)
           VALUES (?, ?, NULL, 'SKIPPED')
           ON CONFLICT(event_id, reminder_type) DO UPDATE SET
             notification_id = NULL, status = 'SKIPPED', updated_at = CURRENT_TIMESTAMP
           WHERE interview_reminders.status != 'SENT'`
        ).bind(event.event_id, reminder.type))
        continue
      }

      const company = event.company_name || 'your interview'
      const title = `${reminder.type === 'DAY_BEFORE' ? 'Tomorrow' : 'Today'}: Interview with ${company}`
      const message = [
        event.job_role ? `Role: ${event.job_role}` : null,
        `Interview: ${event.interview_date} at ${event.interview_time} (${timezone})`,
        event.location ? `Location: ${event.location}` : null,
        event.meeting_url ? `Meeting link: ${event.meeting_url}` : null,
      ].filter(Boolean).join('\n')
      statements.push(env.DB.prepare(
        `INSERT INTO notifications
          (notification_id, title, message, recipient_email, owner_email, scheduled_date,
           scheduled_time, timezone, channel, recurring, recurrence, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 'PENDING')
         ON CONFLICT(notification_id) DO UPDATE SET
           title = excluded.title, message = excluded.message,
           scheduled_date = excluded.scheduled_date, scheduled_time = excluded.scheduled_time,
           timezone = excluded.timezone, channel = excluded.channel,
           status = CASE WHEN notifications.status = 'FAILED' THEN 'PENDING' ELSE notifications.status END,
           error_message = CASE WHEN notifications.status = 'FAILED' THEN NULL ELSE notifications.error_message END,
           processing_started_at = NULL
         WHERE notifications.status IN ('PENDING', 'FAILED')`
      ).bind(
        notificationId, title, message, email, email,
        reminder.date, reminder.time, timezone, channel
      ))
      statements.push(env.DB.prepare(
        `INSERT INTO interview_reminders (event_id, reminder_type, notification_id, status)
         VALUES (?, ?, ?, 'SCHEDULED')
         ON CONFLICT(event_id, reminder_type) DO UPDATE SET
           notification_id = excluded.notification_id, status = 'SCHEDULED',
           updated_at = CURRENT_TIMESTAMP
         WHERE interview_reminders.status != 'SENT'`
      ).bind(event.event_id, reminder.type, notificationId))
    }
    if (statements.length) await env.DB.batch(statements)
  }

  async function updateEvent(request, env, eventId) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)
    const limited = await consumeRateLimit(request, env, `${user.email}:event_update`, 60)
    if (limited) return limited
    const event = await ownedEvent(env, user.email, eventId)
    if (!event) return json({ error: 'Interview event not found' }, 404, origin)
    let body
    let fields
    try {
      body = await request.json()
      fields = eventFields(body, event)
    } catch (error) {
      return json({ error: error.message || 'Invalid request body' }, 400, origin)
    }
    let channel = event.delivery_channel
    if (Object.hasOwn(body, 'channel')) channel = normalizeChannel(body.channel)
    if (channel && !['GMAIL', 'TELEGRAM', 'BOTH'].includes(channel)) {
      return json({ error: 'channel must be gmail, telegram, or both' }, 400, origin)
    }
    if (event.status === 'CONFIRMED') {
      fields.timezone = fields.timezone || event.timezone
      if (!fields.interviewDate || !fields.interviewTime || !fields.timezone) {
        return json({ error: 'Confirmed events require a date, time, and timezone.' }, 400, origin)
      }
      if (channel === 'TELEGRAM' || channel === 'BOTH') {
        const telegram = await env.DB.prepare(
          `SELECT telegram_chat_id, telegram_connected, telegram_notifications_enabled
             FROM user_channels WHERE email = ?`
        ).bind(user.email).first()
        if (!telegram?.telegram_connected || !telegram.telegram_chat_id ||
            !telegram.telegram_notifications_enabled) {
          return json({ error: 'Connect and enable Telegram before selecting this delivery channel.' }, 409, origin)
        }
      }
    }
    await env.DB.prepare(
      `UPDATE interview_events SET company_name = ?, job_role = ?, interview_date = ?,
         interview_time = ?, timezone = ?, location = ?, meeting_url = ?, interview_type = ?,
         delivery_channel = ?, updated_at = CURRENT_TIMESTAMP
        WHERE event_id = ? AND owner_email = ?`
    ).bind(...eventParameters(fields), channel, eventId, user.email).run()
    if (event.status === 'CONFIRMED' && channel) {
      const updated = await ownedEvent(env, user.email, eventId)
      await refreshReminders(env, user.email, updated, channel)
    }
    return json({ success: true }, 200, origin)
  }

  async function confirmEvent(request, env, eventId) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)
    const limited = await consumeRateLimit(request, env, `${user.email}:event_confirm`, 30)
    if (limited) return limited
    const event = await ownedEvent(env, user.email, eventId)
    if (!event) return json({ error: 'Interview event not found' }, 404, origin)
    if (event.status === 'REJECTED') {
      return json({ error: 'Rejected interview events cannot be confirmed.' }, 409, origin)
    }
    let body
    let fields
    try {
      body = await request.json()
      fields = eventFields(body, event)
    } catch (error) {
      return json({ error: error.message || 'Invalid request body' }, 400, origin)
    }
    if (!fields.interviewDate || !fields.interviewTime) {
      return json({ error: 'Confirm the interview date and time before creating reminders.' }, 400, origin)
    }
    const preferences = await env.DB.prepare(
      'SELECT timezone FROM user_settings WHERE owner_email = ?'
    ).bind(user.email).first()
    const timezone = fields.timezone || preferences?.timezone || env.APP_TIME_ZONE || 'UTC'
    if (!validTimezone(timezone)) {
      return json({ error: 'A valid timezone is required before confirming this event.' }, 400, origin)
    }
    const now = getScheduledTime(timezone)
    if (fields.interviewDate < now.date ||
        (fields.interviewDate === now.date && fields.interviewTime <= now.time)) {
      return json({ error: 'The interview must be in the future to create reminders.' }, 400, origin)
    }
    const channel = normalizeChannel(body.channel || event.delivery_channel || 'GMAIL')
    if (!['GMAIL', 'TELEGRAM', 'BOTH'].includes(channel)) {
      return json({ error: 'channel must be gmail, telegram, or both' }, 400, origin)
    }
    if (channel === 'TELEGRAM' || channel === 'BOTH') {
      const telegram = await env.DB.prepare(
        `SELECT telegram_chat_id, telegram_connected, telegram_notifications_enabled
           FROM user_channels WHERE email = ?`
      ).bind(user.email).first()
      if (!telegram?.telegram_connected || !telegram.telegram_chat_id ||
          !telegram.telegram_notifications_enabled) {
        return json({ error: 'Connect and enable Telegram before selecting this delivery channel.' }, 409, origin)
      }
    }
    await env.DB.prepare(
      `UPDATE interview_events SET status = 'CONFIRMED', company_name = ?, job_role = ?,
         interview_date = ?, interview_time = ?, timezone = ?, location = ?, meeting_url = ?,
         interview_type = ?, delivery_channel = ?, updated_at = CURRENT_TIMESTAMP
        WHERE event_id = ? AND owner_email = ?`
    ).bind(...eventParameters({ ...fields, timezone }), channel, eventId, user.email).run()
    const confirmed = await ownedEvent(env, user.email, eventId)
    await refreshReminders(env, user.email, confirmed, channel)
    return json({ success: true }, 200, origin)
  }

  async function rejectEvent(request, env, eventId) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)
    const limited = await consumeRateLimit(request, env, `${user.email}:event_update`, 60)
    if (limited) return limited
    const result = await env.DB.prepare(
      `UPDATE interview_events SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP
        WHERE event_id = ? AND owner_email = ? AND status = 'REVIEW'`
    ).bind(eventId, user.email).run()
    if (!result.meta.changes) return json({ error: 'Reviewable interview event not found' }, 404, origin)
    return json({ success: true }, 200, origin)
  }

  async function deleteEvent(request, env, eventId) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)
    const limited = await consumeRateLimit(request, env, `${user.email}:event_update`, 60)
    if (limited) return limited
    const event = await ownedEvent(env, user.email, eventId)
    if (!event) return json({ error: 'Interview event not found' }, 404, origin)
    await env.DB.batch([
      env.DB.prepare(
        `DELETE FROM notifications WHERE notification_id IN (
           SELECT notification_id FROM interview_reminders WHERE event_id = ?
         ) AND owner_email = ? AND status = 'PENDING'`
      ).bind(eventId, user.email),
      env.DB.prepare('DELETE FROM interview_reminders WHERE event_id = ?').bind(eventId),
      env.DB.prepare('DELETE FROM interview_event_sources WHERE event_id = ? AND owner_email = ?')
        .bind(eventId, user.email),
      env.DB.prepare(
        'UPDATE gmail_messages SET event_id = NULL WHERE owner_email = ? AND event_id = ?'
      ).bind(user.email, eventId),
      env.DB.prepare('DELETE FROM interview_events WHERE event_id = ? AND owner_email = ?')
        .bind(eventId, user.email),
    ])
    return json({ success: true }, 200, origin)
  }

  async function preferences(request, env) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)
    let row = await env.DB.prepare(
      'SELECT timezone FROM user_settings WHERE owner_email = ?'
    ).bind(user.email).first()
    if (!row) {
      const requestedTimezone = new URL(request.url).searchParams.get('timezone')
      const timezone = validTimezone(requestedTimezone)
        ? requestedTimezone
        : env.APP_TIME_ZONE || 'UTC'
      await env.DB.prepare(
        'INSERT OR IGNORE INTO user_settings (owner_email, timezone) VALUES (?, ?)'
      ).bind(user.email, timezone).run()
      row = await env.DB.prepare(
        'SELECT timezone FROM user_settings WHERE owner_email = ?'
      ).bind(user.email).first()
    }
    return json({ timezone: row?.timezone || env.APP_TIME_ZONE || 'UTC' }, 200, origin)
  }

  async function updatePreferences(request, env) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)
    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, origin)
    }
    if (!validTimezone(body.timezone)) {
      return json({ error: 'A valid IANA timezone is required' }, 400, origin)
    }
    await env.DB.prepare(
      `INSERT INTO user_settings (owner_email, timezone)
       VALUES (?, ?)
       ON CONFLICT(owner_email) DO UPDATE SET
         timezone = excluded.timezone, updated_at = CURRENT_TIMESTAMP`
    ).bind(user.email, body.timezone).run()
    return json({ timezone: body.timezone }, 200, origin)
  }

  return {
    connect,
    callback,
    connectionStatus,
    disconnect,
    sync,
    events,
    updateEvent,
    confirmEvent,
    rejectEvent,
    deleteEvent,
    preferences,
    updatePreferences,
    syncScheduled,
  }
}

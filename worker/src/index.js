const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
}

function json(data, status = 200, origin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...JSON_HEADERS,
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

function getOrigin(request, env) {
  const configured = env.APP_ORIGIN || '*'
  if (configured === '*') return '*'
  return configured.split(',').includes(request.headers.get('Origin')) ? request.headers.get('Origin') : configured
}

function normalizeChannel(channel) {
  return String(channel || '').toUpperCase()
}

function parseTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2])
  const period = match[3]?.toUpperCase()
  if (minute > 59 || hour > 23 || (period && hour > 12)) return null
  if (period === 'PM' && hour !== 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
}

function mapNotification(row) {
  return {
    notificationId: row.notification_id,
    title: row.title,
    message: row.message,
    email: row.recipient_email,
    ownerEmail: row.owner_email,
    date: row.scheduled_date,
    time: row.scheduled_time,
    channel: row.channel,
    recurring: Boolean(row.recurring),
    recurrence: row.recurrence,
    status: row.status,
  }
}

function telegramResponse(text, status = 200) {
  return new Response(text, { status })
}

function commandFromText(text) {
  const match = String(text || '').trim().match(/^\/([a-z]+)(?:@[a-z0-9_]+)?(?:\s+([\s\S]+))?$/i)
  return match ? { command: match[1].toLowerCase(), argument: match[2]?.trim() || '' } : null
}

async function hashValue(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sendTelegramMessage(env, chatId, text) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!response.ok) throw new Error(`Telegram message failed with HTTP ${response.status}`)
}

async function createTelegramLinkCode(request, env) {
  if (!request.headers.get('Authorization')) {
    return json({ error: 'Authentication is required' }, 401, getOrigin(request, env))
  }
  const body = await request.json()
  const email = String(body.email || '').trim().toLowerCase()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'A valid email is required' }, 400, getOrigin(request, env))
  }
  const code = crypto.randomUUID().replaceAll('-', '')
  const codeHash = await hashValue(code)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  await env.DB.prepare(
    `INSERT INTO telegram_link_codes (code_hash, email, expires_at)
     VALUES (?, ?, ?)`
  ).bind(codeHash, email, expiresAt).run()
  return json({ code, expiresAt }, 200, getOrigin(request, env))
}

async function listNotifications(request, env) {
  const ownerEmail = new URL(request.url).searchParams.get('ownerEmail')
  if (!ownerEmail) return json({ error: 'ownerEmail is required' }, 400, getOrigin(request, env))
  const result = await env.DB.prepare(
    `SELECT notification_id, title, message, recipient_email, owner_email,
            scheduled_date, scheduled_time, channel, recurring, recurrence, status
       FROM notifications
      WHERE owner_email = ?
      ORDER BY scheduled_date DESC, scheduled_time DESC`
  ).bind(ownerEmail).all()
  return json(result.results.map(mapNotification), 200, getOrigin(request, env))
}

async function createNotification(request, env) {
  const body = await request.json()
  const ownerEmail = String(body.ownerEmail || '').trim()
  const recipientEmail = String(body.email || '').trim()
  const date = String(body.date || '').trim()
  const time = parseTime(body.time)
  const channel = normalizeChannel(body.channel)
  if (!ownerEmail || !recipientEmail || !body.title || !body.message || !validDate(date) || !time) {
    return json({ error: 'title, message, email, ownerEmail, date, and a valid time are required' }, 400, getOrigin(request, env))
  }
  if (!['GMAIL', 'TELEGRAM', 'BOTH'].includes(channel)) {
    return json({ error: 'channel must be gmail, telegram, or both' }, 400, getOrigin(request, env))
  }
  const notificationId = String(body.notificationId || `ntf_${crypto.randomUUID()}`)
  await env.DB.prepare(
    `INSERT INTO notifications
      (notification_id, title, message, recipient_email, owner_email, scheduled_date,
       scheduled_time, channel, recurring, recurrence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    notificationId,
    String(body.title).trim(),
    String(body.message).trim(),
    recipientEmail,
    ownerEmail,
    date,
    time,
    channel,
    body.recurring ? 1 : 0,
    body.recurrence || null
  ).run()
  const row = await env.DB.prepare('SELECT * FROM notifications WHERE notification_id = ?')
    .bind(notificationId).first()
  return json({ notification: mapNotification(row) }, 201, getOrigin(request, env))
}

async function deleteNotification(request, env, id) {
  const result = await env.DB.prepare('DELETE FROM notifications WHERE notification_id = ?').bind(id).run()
  if (!result.meta.changes) return json({ error: 'Notification not found' }, 404, getOrigin(request, env))
  return json({ success: true }, 200, getOrigin(request, env))
}

async function getChannelStatus(request, env) {
  const email = new URL(request.url).searchParams.get('email')
  if (!email) return json({ error: 'email is required' }, 400, getOrigin(request, env))
  const row = await env.DB.prepare(
    'SELECT telegram_connected, telegram_username, telegram_notifications_enabled FROM user_channels WHERE email = ?'
  ).bind(email).first()
  return json({
    telegramConnected: Boolean(row?.telegram_connected),
    telegramUsername: row?.telegram_username || null,
    telegramNotificationsEnabled: row ? Boolean(row.telegram_notifications_enabled) : false,
  }, 200, getOrigin(request, env))
}

async function saveTelegramConnection(request, env) {
  return json({
    error: 'Direct account linking is disabled. Generate a secure link in CloudNotify and use /start in Telegram.',
  }, 410, getOrigin(request, env))
}

async function handleTelegramWebhook(request, env) {
  if (env.TELEGRAM_WEBHOOK_SECRET &&
      request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_WEBHOOK_SECRET) {
    return telegramResponse('Unauthorized', 401)
  }
  let update
  try {
    update = await request.json()
  } catch {
    return telegramResponse('Invalid JSON', 400)
  }
  if (!update || !Number.isInteger(update.update_id)) return telegramResponse('ok')
  const recorded = await env.DB.prepare(
    'INSERT OR IGNORE INTO telegram_updates (update_id) VALUES (?)'
  ).bind(update.update_id).run()
  if (!recorded.meta.changes) return telegramResponse('ok')

  const message = update.message
  const chatId = message?.chat?.id
  const parsed = commandFromText(message?.text)
  if (!chatId || !parsed) return telegramResponse('ok')

  if (parsed.command === 'help') {
    await sendTelegramMessage(env, chatId,
      '/start — Connect CloudNotify to Telegram.\n' +
      '/help — Display command instructions.\n' +
      '/status — Check the Telegram connection status.\n' +
      '/stop — Stop Telegram notifications without deleting scheduled notifications.\n' +
      '/resume — Re-enable Telegram notifications.')
    return telegramResponse('ok')
  }

  const existing = await env.DB.prepare(
    'SELECT email, telegram_notifications_enabled FROM user_channels WHERE telegram_chat_id = ? AND telegram_connected = 1'
  ).bind(String(chatId)).first()

  if (parsed.command === 'start') {
    if (!parsed.argument) {
      await sendTelegramMessage(env, chatId, 'Open CloudNotify Profile and choose Connect Telegram to get a secure, short-lived connection link.')
      return telegramResponse('ok')
    }
    const codeHash = await hashValue(parsed.argument)
    const link = await env.DB.prepare(
      `SELECT email FROM telegram_link_codes
       WHERE code_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP`
    ).bind(codeHash).first()
    if (!link) {
      await sendTelegramMessage(env, chatId, 'This connection link is invalid or expired. Generate a new link in CloudNotify.')
      return telegramResponse('ok')
    }
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO user_channels
          (email, telegram_chat_id, telegram_username, telegram_connected, updated_at)
         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(email) DO UPDATE SET
           telegram_chat_id = excluded.telegram_chat_id,
           telegram_username = excluded.telegram_username,
           telegram_connected = 1,
           updated_at = CURRENT_TIMESTAMP`
      ).bind(link.email, String(chatId), message.from?.username || null),
      env.DB.prepare('UPDATE telegram_link_codes SET used_at = CURRENT_TIMESTAMP WHERE code_hash = ?')
        .bind(codeHash),
    ])
    await sendTelegramMessage(env, chatId, 'CloudNotify is now connected. Telegram notifications are enabled.')
    return telegramResponse('ok')
  }

  if (!existing) {
    await sendTelegramMessage(env, chatId, 'Your Telegram account is not connected to CloudNotify. Use Connect Telegram in your CloudNotify Profile.')
    return telegramResponse('ok')
  }
  if (parsed.command === 'status') {
    await sendTelegramMessage(env, chatId,
      `CloudNotify is connected.\nTelegram notifications are ${existing.telegram_notifications_enabled ? 'enabled' : 'disabled'}.`)
  } else if (parsed.command === 'stop' || parsed.command === 'resume') {
    const enabled = parsed.command === 'resume' ? 1 : 0
    await env.DB.prepare(
      'UPDATE user_channels SET telegram_notifications_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_chat_id = ?'
    ).bind(enabled, String(chatId)).run()
    await sendTelegramMessage(env, chatId,
      enabled ? 'Telegram notifications have been enabled.' : 'Telegram notifications have been disabled. Scheduled notifications were not deleted.')
  }
  return telegramResponse('ok')
}

async function sendTelegram(env, chatId, notification) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `CloudNotify\n\n${notification.title}\n\n${notification.message}`,
    }),
  })
  if (!response.ok) throw new Error(`Telegram delivery failed with HTTP ${response.status}`)
}

async function sendEmail(env, notification) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN || !env.GMAIL_SENDER) {
    throw new Error('Gmail OAuth secrets are not configured')
  }
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  if (!tokenResponse.ok) throw new Error(`Gmail token exchange failed with HTTP ${tokenResponse.status}`)
  const { access_token: accessToken } = await tokenResponse.json()
  const safeSubject = String(notification.title).replace(/[\r\n]+/g, ' ').trim()
  const safeSender = String(env.GMAIL_SENDER).replace(/[\r\n]+/g, ' ').trim()
  const rawMessage = [
    `From: ${safeSender}`,
    `To: ${notification.email}`,
    `Subject: ${safeSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    `<h2>${notification.title}</h2><p>${notification.message}</p>`,
  ].join('\r\n')
  const bytes = new TextEncoder().encode(rawMessage)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const encodedMessage = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  })
  if (!response.ok) throw new Error(`Gmail delivery failed with HTTP ${response.status}`)
}

function getScheduledTime(env) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.APP_TIME_ZONE || 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

async function processDueNotifications(env) {
  const { date, time } = getScheduledTime(env)
  const due = await env.DB.prepare(
    `SELECT n.*, c.telegram_chat_id, c.telegram_notifications_enabled
       FROM notifications n
       LEFT JOIN user_channels c ON c.email = n.owner_email
      WHERE n.status = 'PENDING'
        AND n.scheduled_date = ?
        AND n.scheduled_time <= ?`
  ).bind(date, time).all()

  for (const row of due.results) {
    try {
      const notification = mapNotification(row)
      const channel = normalizeChannel(notification.channel)
      if (channel === 'TELEGRAM' || channel === 'BOTH') {
        if (!row.telegram_chat_id || !row.telegram_notifications_enabled) {
          throw new Error('Telegram notifications are not available for this account')
        }
        await sendTelegram(env, row.telegram_chat_id, notification)
      }
      if (channel === 'GMAIL' || channel === 'BOTH') await sendEmail(env, notification)
      await env.DB.prepare(
        `UPDATE notifications SET status = 'SENT', sent_at = CURRENT_TIMESTAMP, error_message = NULL
          WHERE notification_id = ?`
      ).bind(row.notification_id).run()
    } catch (error) {
      await env.DB.prepare(
        `UPDATE notifications SET status = 'FAILED', error_message = ?
          WHERE notification_id = ?`
      ).bind(error.message, row.notification_id).run()
    }
  }
}

export default {
  async fetch(request, env) {
    const origin = getOrigin(request, env)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    } })

    const url = new URL(request.url)
    try {
      if (url.pathname === '/' && request.method === 'GET') {
        return json({ message: 'CloudNotify API is running', status: 'success' }, 200, origin)
      }
      if (url.pathname === '/notifications' && request.method === 'GET') return await listNotifications(request, env)
      if (url.pathname === '/notifications' && request.method === 'POST') return await createNotification(request, env)
      if (url.pathname.startsWith('/notifications/') && request.method === 'DELETE') {
        return await deleteNotification(request, env, url.pathname.split('/').pop())
      }
      if (url.pathname === '/user/channels' && request.method === 'GET') return await getChannelStatus(request, env)
      if (url.pathname === '/telegram/link-code' && request.method === 'POST') return await createTelegramLinkCode(request, env)
      if (url.pathname === '/telegram/connect' && request.method === 'POST') return await saveTelegramConnection(request, env)
      if (url.pathname === '/telegram/webhook' && request.method === 'POST') return await handleTelegramWebhook(request, env)
      return json({ error: 'Not found' }, 404, origin)
    } catch (error) {
      console.error(error)
      return json({ error: 'Internal server error' }, 500, origin)
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(processDueNotifications(env))
  },
}

export { commandFromText }

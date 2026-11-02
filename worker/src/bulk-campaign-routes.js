const CAMPAIGN_TYPES = new Set([
  'OFFER_LETTERS',
  'INTERVIEW_INVITATIONS',
  'REJECTION_LETTERS',
  'INTERNSHIP_CERTIFICATES',
  'APPOINTMENT_LETTERS',
  'ADMISSION_LETTERS',
  'CUSTOM_DOCUMENTS',
])

function validEmail(value) {
  return typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
}

function safeRecipientData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const entries = Object.entries(value)
  if (entries.length > 50) return null
  const safe = {}
  for (const [key, fieldValue] of entries) {
    if (!/^[a-z0-9_]{1,100}$/.test(key) ||
        typeof fieldValue !== 'string' || fieldValue.length > 2000) return null
    safe[key] = fieldValue
  }
  return safe
}

export function createBulkCampaignHandlers({ json, getOrigin, authenticatedUser }) {
  async function create(request, env) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)

    const contentLength = Number(request.headers.get('Content-Length') || 0)
    if (contentLength > 600 * 1024) {
      return json({ error: 'Campaign data exceeds the upload limit.' }, 413, origin)
    }
    const rawBody = await request.text()
    if (rawBody.length > 600 * 1024) {
      return json({ error: 'Campaign data exceeds the upload limit.' }, 413, origin)
    }

    let body
    try {
      body = JSON.parse(rawBody)
    } catch {
      return json({ error: 'Request body must be valid JSON.' }, 400, origin)
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json({ error: 'Request body must be a JSON object.' }, 400, origin)
    }

    const campaignName = String(body.campaignName || '').trim()
    const organizationName = String(body.organizationName || '').trim()
    const senderName = String(body.senderName || '').trim()
    const senderEmail = String(body.senderEmail || '').trim().toLowerCase()
    const replyToEmail = String(body.replyToEmail || '').trim().toLowerCase()
    const campaignType = String(body.campaignType || '')
    const campaignDate = String(body.campaignDate || '')
    const description = String(body.description || '').trim()

    if (!campaignName || campaignName.length > 120 ||
        !organizationName || organizationName.length > 120 ||
        !senderName || senderName.length > 120 ||
        !validEmail(senderEmail) ||
        (replyToEmail && !validEmail(replyToEmail)) ||
        !CAMPAIGN_TYPES.has(campaignType) ||
        (campaignDate && !validDate(campaignDate)) ||
        description.length > 2000) {
      return json({ error: 'Enter valid campaign, organization, sender, and date details.' }, 400, origin)
    }

    if (!Array.isArray(body.recipients) ||
        body.recipients.length < 1 || body.recipients.length > 500) {
      return json({ error: 'A campaign must contain between 1 and 500 recipient rows.' }, 400, origin)
    }

    const recipients = body.recipients.map((item) => {
      const data = safeRecipientData(item?.data)
      if (!data) return null
      const candidateName = String(item.candidateName || '').trim()
      const email = String(item.email || '').trim().toLowerCase()
      const rowNumber = Number(item.rowNumber)
      if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > 10000 ||
          candidateName.length > 200 || email.length > 254) return null
      return {
        recipientId: crypto.randomUUID(),
        rowNumber,
        candidateName,
        email,
        data,
        included: item.included === true,
        errors: [],
      }
    })
    if (recipients.some((recipient) => !recipient)) {
      return json({ error: 'Recipient rows contain invalid or oversized fields.' }, 400, origin)
    }

    for (const recipient of recipients) {
      if (!recipient.candidateName) recipient.errors.push('Candidate name is required.')
      if (!recipient.email) recipient.errors.push('Email is required.')
      else if (!validEmail(recipient.email)) recipient.errors.push('Email address is invalid.')
      for (const [key, value] of Object.entries(recipient.data)) {
        if (value && /(^|_)(date|day)(_|$)/.test(key) && !validDate(value)) {
          recipient.errors.push(`${key.replaceAll('_', ' ')} must use YYYY-MM-DD format.`)
        }
      }
    }
    const emailCounts = new Map()
    recipients.forEach(({ email }) => {
      if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
    })
    recipients.forEach((recipient) => {
      if (recipient.email && emailCounts.get(recipient.email) > 1) {
        recipient.errors.push('Email address is duplicated in this file.')
      }
      recipient.included = recipient.included && recipient.errors.length === 0
    })

    const campaignId = crypto.randomUUID()
    const storedRecipients = JSON.stringify(recipients.map((recipient) => ({
      recipientId: recipient.recipientId,
      rowNumber: recipient.rowNumber,
      candidateName: recipient.candidateName,
      email: recipient.email,
      data: recipient.data,
      validationStatus: recipient.errors.length ? 'INVALID' : 'VALID',
      validationErrors: recipient.errors,
      included: recipient.included,
    })))

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO bulk_campaigns
          (campaign_id, owner_email, campaign_name, campaign_description,
           organization_name, campaign_type, sender_name, sender_email,
           reply_to_email, campaign_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        campaignId,
        user.email,
        campaignName,
        description,
        organizationName,
        campaignType,
        senderName,
        senderEmail,
        replyToEmail || null,
        campaignDate || null
      ),
      env.DB.prepare(
        `INSERT INTO bulk_campaign_recipients
          (recipient_id, campaign_id, row_number, candidate_name, email,
           recipient_data, validation_status, validation_errors, included)
         SELECT
           json_extract(value, '$.recipientId'),
           ?,
           json_extract(value, '$.rowNumber'),
           json_extract(value, '$.candidateName'),
           json_extract(value, '$.email'),
           json_extract(value, '$.data'),
           json_extract(value, '$.validationStatus'),
           json(json_extract(value, '$.validationErrors')),
           json_extract(value, '$.included')
         FROM json_each(?)`
      ).bind(campaignId, storedRecipients),
    ])

    return json({
      campaignId,
      status: 'DRAFT',
      totalRecipients: recipients.length,
      validRecipients: recipients.filter((recipient) => !recipient.errors.length).length,
      invalidRecipients: recipients.filter((recipient) => recipient.errors.length).length,
    }, 201, origin)
  }

  return { create }
}

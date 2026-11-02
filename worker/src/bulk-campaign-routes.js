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
  async function list(request, env) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)

    const result = await env.DB.prepare(
      `SELECT c.campaign_id, c.campaign_name, c.organization_name, c.campaign_type,
              c.sender_name, c.sender_email, c.status, c.created_at, c.campaign_date,
              COUNT(r.recipient_id) AS total_recipients,
              SUM(CASE WHEN r.validation_status = 'VALID' THEN 1 ELSE 0 END) AS valid_recipients,
              SUM(CASE WHEN r.validation_status = 'INVALID' THEN 1 ELSE 0 END) AS invalid_recipients,
              SUM(CASE WHEN r.included = 1 THEN 1 ELSE 0 END) AS included_recipients
         FROM bulk_campaigns c
         LEFT JOIN bulk_campaign_recipients r ON r.campaign_id = c.campaign_id
        WHERE c.owner_email = ?
        GROUP BY c.campaign_id
        ORDER BY c.created_at DESC
        LIMIT 100`
    ).bind(user.email).all()

    return json(result.results.map((row) => ({
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      organizationName: row.organization_name,
      campaignType: row.campaign_type,
      senderName: row.sender_name,
      senderEmail: row.sender_email,
      status: row.status,
      createdAt: row.created_at,
      campaignDate: row.campaign_date,
      totalRecipients: row.total_recipients,
      validRecipients: row.valid_recipients,
      invalidRecipients: row.invalid_recipients,
      includedRecipients: row.included_recipients,
    })), 200, origin)
  }

  async function get(request, env, campaignId) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)

    const campaign = await env.DB.prepare(
      `SELECT campaign_id, campaign_name, campaign_description, organization_name,
              campaign_type, sender_name, sender_email, reply_to_email, campaign_date,
              email_subject, email_body, document_title, document_body,
              status, created_at, updated_at
         FROM bulk_campaigns
        WHERE campaign_id = ? AND owner_email = ?`
    ).bind(campaignId, user.email).first()
    if (!campaign) return json({ error: 'Campaign not found' }, 404, origin)

    const result = await env.DB.prepare(
      `SELECT recipient_id, row_number, candidate_name, email, recipient_data,
              validation_status, validation_errors, included
         FROM bulk_campaign_recipients
        WHERE campaign_id = ?
        ORDER BY row_number`
    ).bind(campaignId).all()

    return json({
      campaignId: campaign.campaign_id,
      campaignName: campaign.campaign_name,
      description: campaign.campaign_description,
      organizationName: campaign.organization_name,
      campaignType: campaign.campaign_type,
      senderName: campaign.sender_name,
      senderEmail: campaign.sender_email,
      replyToEmail: campaign.reply_to_email,
      campaignDate: campaign.campaign_date,
      emailSubject: campaign.email_subject,
      emailBody: campaign.email_body,
      documentTitle: campaign.document_title,
      documentBody: campaign.document_body,
      status: campaign.status,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      recipients: result.results.map((row) => ({
        recipientId: row.recipient_id,
        rowNumber: row.row_number,
        candidateName: row.candidate_name,
        email: row.email,
        data: JSON.parse(row.recipient_data),
        validationStatus: row.validation_status,
        validationErrors: JSON.parse(row.validation_errors),
        included: Boolean(row.included),
      })),
    }, 200, origin)
  }

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
    const emailSubject = body.emailSubject ?? ''
    const emailBody = body.emailBody ?? ''
    const documentTitle = body.documentTitle ?? ''
    const documentBody = body.documentBody ?? ''

    if (!campaignName || campaignName.length > 120 ||
        !organizationName || organizationName.length > 120 ||
        !senderName || senderName.length > 120 ||
        !validEmail(senderEmail) ||
        (replyToEmail && !validEmail(replyToEmail)) ||
        !CAMPAIGN_TYPES.has(campaignType) ||
        (campaignDate && !validDate(campaignDate)) ||
        description.length > 2000 ||
        typeof emailSubject !== 'string' || emailSubject.length > 200 ||
        typeof emailBody !== 'string' || emailBody.length > 10000 ||
        typeof documentTitle !== 'string' || documentTitle.length > 200 ||
        typeof documentBody !== 'string' || documentBody.length > 20000) {
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
           reply_to_email, campaign_date, email_subject, email_body,
           document_title, document_body)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        campaignDate || null,
        emailSubject,
        emailBody,
        documentTitle,
        documentBody
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

  async function updateTemplates(request, env, campaignId) {
    const origin = getOrigin(request, env)
    const user = await authenticatedUser(request, env)
    if (!user) return json({ error: 'Authentication is required' }, 401, origin)

    const contentLength = Number(request.headers.get('Content-Length') || 0)
    if (contentLength > 50 * 1024) {
      return json({ error: 'Template data exceeds the upload limit.' }, 413, origin)
    }

    const rawBody = await request.text()
    if (rawBody.length > 50 * 1024) {
      return json({ error: 'Template data exceeds the upload limit.' }, 413, origin)
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

    const fields = {
      emailSubject: { column: 'email_subject', max: 200 },
      emailBody: { column: 'email_body', max: 10000 },
      documentTitle: { column: 'document_title', max: 200 },
      documentBody: { column: 'document_body', max: 20000 },
    }
    for (const [field, { max }] of Object.entries(fields)) {
      if (typeof body[field] !== 'string' || body[field].length > max) {
        return json({ error: `${field} must be a string no longer than ${max} characters.` }, 400, origin)
      }
    }

    const campaign = await env.DB.prepare(
      'SELECT campaign_id FROM bulk_campaigns WHERE campaign_id = ? AND owner_email = ?'
    ).bind(campaignId, user.email).first()
    if (!campaign) return json({ error: 'Campaign not found' }, 404, origin)

    await env.DB.prepare(
      `UPDATE bulk_campaigns
          SET email_subject = ?, email_body = ?, document_title = ?, document_body = ?,
              updated_at = CURRENT_TIMESTAMP
        WHERE campaign_id = ? AND owner_email = ?`
    ).bind(
      body.emailSubject,
      body.emailBody,
      body.documentTitle,
      body.documentBody,
      campaignId,
      user.email
    ).run()

    return json({
      campaignId,
      emailSubject: body.emailSubject,
      emailBody: body.emailBody,
      documentTitle: body.documentTitle,
      documentBody: body.documentBody,
    }, 200, origin)
  }

  return { create, list, get, updateTemplates }
}

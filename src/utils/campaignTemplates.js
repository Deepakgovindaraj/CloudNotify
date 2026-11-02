const CAMPAIGN_TEMPLATES = {
  OFFER_LETTERS: {
    emailSubject: 'Your offer from {{organization_name}}',
    emailBody: 'Hello {{candidate_name}},\n\nWe are pleased to offer you the {{job_role}} position at {{organization_name}}. Your personalized offer letter is ready for review.\n\nBest regards,\n{{sender_name}}',
    documentTitle: 'Offer Letter',
    documentBody: '{{campaign_date}}\n\nDear {{candidate_name}},\n\nWe are pleased to offer you the position of {{job_role}} at {{organization_name}}. Your joining date is {{joining_date}}, and your salary is {{salary}}.\n\nPlease contact us at {{sender_email}} if you have any questions.\n\nSincerely,\n{{sender_name}}\n{{organization_name}}',
  },
  INTERVIEW_INVITATIONS: {
    emailSubject: 'Interview invitation from {{organization_name}}',
    emailBody: 'Hello {{candidate_name}},\n\nWe would like to invite you to interview for the {{job_role}} position at {{organization_name}}. Please review your personalized invitation.\n\nBest regards,\n{{sender_name}}',
    documentTitle: 'Interview Invitation',
    documentBody: '{{campaign_date}}\n\nDear {{candidate_name}},\n\nWe are pleased to invite you to interview for the {{job_role}} position at {{organization_name}}.\n\nPlease contact {{sender_email}} to confirm your availability and discuss the interview details.\n\nSincerely,\n{{sender_name}}\n{{organization_name}}',
  },
  REJECTION_LETTERS: {
    emailSubject: 'An update from {{organization_name}}',
    emailBody: 'Hello {{candidate_name}},\n\nThank you for taking the time to apply to {{organization_name}}. Please see your personalized letter for an update.\n\nBest regards,\n{{sender_name}}',
    documentTitle: 'Application Update',
    documentBody: '{{campaign_date}}\n\nDear {{candidate_name}},\n\nThank you for your interest in {{organization_name}} and for the time you invested in the selection process. After careful consideration, we have decided to move forward with another candidate for the {{job_role}} position.\n\nWe appreciate your interest and wish you success in your career.\n\nSincerely,\n{{sender_name}}\n{{organization_name}}',
  },
  INTERNSHIP_CERTIFICATES: {
    emailSubject: 'Your internship certificate from {{organization_name}}',
    emailBody: 'Hello {{candidate_name}},\n\nYour personalized internship certificate from {{organization_name}} is ready.\n\nBest regards,\n{{sender_name}}',
    documentTitle: 'Internship Certificate',
    documentBody: '{{campaign_date}}\n\nCERTIFICATE OF INTERNSHIP\n\nThis certifies that {{candidate_name}} successfully completed an internship as {{job_role}} at {{organization_name}}.\n\nWe thank them for their contribution and wish them continued success.\n\n{{sender_name}}\n{{organization_name}}',
  },
  APPOINTMENT_LETTERS: {
    emailSubject: 'Your appointment at {{organization_name}}',
    emailBody: 'Hello {{candidate_name}},\n\nWe are pleased to share your appointment details for the {{job_role}} position at {{organization_name}}.\n\nBest regards,\n{{sender_name}}',
    documentTitle: 'Appointment Letter',
    documentBody: '{{campaign_date}}\n\nDear {{candidate_name}},\n\nWe are pleased to appoint you as {{job_role}} at {{organization_name}}. Your joining date is {{joining_date}}, and your salary is {{salary}}.\n\nPlease contact us at {{sender_email}} if you have any questions.\n\nSincerely,\n{{sender_name}}\n{{organization_name}}',
  },
  ADMISSION_LETTERS: {
    emailSubject: 'Admission decision from {{organization_name}}',
    emailBody: 'Hello {{candidate_name}},\n\nWe are pleased to share an update about your application to {{organization_name}}. Please review your personalized admission letter.\n\nBest regards,\n{{sender_name}}',
    documentTitle: 'Admission Letter',
    documentBody: '{{campaign_date}}\n\nDear {{candidate_name}},\n\nWe are pleased to offer you admission to {{organization_name}} for {{job_role}}.\n\nPlease contact us at {{sender_email}} with any questions about your next steps.\n\nSincerely,\n{{sender_name}}\n{{organization_name}}',
  },
  CUSTOM_DOCUMENTS: {
    emailSubject: 'A message from {{organization_name}}',
    emailBody: 'Hello {{candidate_name}},\n\nPlease review your personalized document from {{organization_name}}.\n\nBest regards,\n{{sender_name}}',
    documentTitle: 'Personalized Document',
    documentBody: '{{campaign_date}}\n\nDear {{candidate_name}},\n\n{{description}}\n\nSincerely,\n{{sender_name}}\n{{organization_name}}',
  },
}

export function getCampaignTemplate(campaignType) {
  const template = CAMPAIGN_TEMPLATES[campaignType] || CAMPAIGN_TEMPLATES.CUSTOM_DOCUMENTS
  return { ...template }
}

export function buildTemplateValues(campaign, recipient) {
  const customValues = Object.fromEntries(
    Object.entries(recipient?.data || {}).map(([key, value]) => [
      key.toLowerCase(),
      typeof value === 'string' ? value : '',
    ])
  )

  return {
    ...customValues,
    candidate_name: recipient?.candidateName || '',
    email: recipient?.email || '',
    organization_name: campaign?.organizationName || '',
    campaign_name: campaign?.campaignName || '',
    campaign_date: campaign?.campaignDate || '',
    description: campaign?.description || '',
    sender_name: campaign?.senderName || '',
    sender_email: campaign?.senderEmail || '',
    reply_to_email: campaign?.replyToEmail || '',
  }
}

export function renderCampaignTemplate(template, values) {
  return String(template || '').replace(
    /{{\s*([a-z0-9_]+)\s*}}/gi,
    (placeholder, key) => Object.hasOwn(values, key.toLowerCase())
      ? values[key.toLowerCase()]
      : placeholder
  )
}

export function findMissingTemplateValues(template, values) {
  const missing = new Set()
  for (const [, key] of String(template || '').matchAll(/{{\s*([a-z0-9_]+)\s*}}/gi)) {
    const value = values[key.toLowerCase()]
    if (typeof value !== 'string' || !value.trim()) missing.add(key.toLowerCase())
  }
  return [...missing]
}

import { jsPDF } from 'jspdf'
import { buildTemplateValues, renderCampaignTemplate } from './campaignTemplates.js'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 20
const MAX_RENDERED_BODY_LENGTH = 30000

function safeFileName(value) {
  return String(value || 'bulk-campaign')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'bulk-campaign'
}

function addBody(pdf, content, y) {
  const paragraphs = content.split(/\r?\n/)
  const maxWidth = PAGE_WIDTH - MARGIN * 2
  let cursor = y

  for (const paragraph of paragraphs) {
    const lines = pdf.splitTextToSize(paragraph || ' ', maxWidth)
    for (const line of lines) {
      if (cursor > PAGE_HEIGHT - MARGIN) {
        pdf.addPage()
        cursor = MARGIN
      }
      pdf.text(line, MARGIN, cursor)
      cursor += 6
    }
    cursor += 2
  }
}

export function createCampaignPdf(campaign, recipients, templates) {
  const includedRecipients = recipients.filter((recipient) =>
    recipient.included !== false &&
    recipient.validationStatus !== 'INVALID' &&
    !recipient.errors?.length &&
    !recipient.validationErrors?.length
  )
  if (!includedRecipients.length) {
    throw new Error('Select at least one valid recipient before generating documents.')
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  pdf.setProperties({
    title: `${campaign.campaignName || 'Campaign'} personalized documents`,
    subject: 'Personalized campaign documents',
    author: campaign.organizationName || campaign.senderName || 'CloudNotify',
  })

  includedRecipients.forEach((recipient, index) => {
    if (index > 0) pdf.addPage()
    const values = buildTemplateValues(campaign, recipient)
    const title = renderCampaignTemplate(templates.documentTitle, values).trim()
    const body = renderCampaignTemplate(templates.documentBody, values)
    if (!body.trim()) {
      throw new Error('Add document content to the PDF template before generating documents.')
    }
    if (body.length > MAX_RENDERED_BODY_LENGTH) {
      throw new Error(`The generated document for ${recipient.candidateName || recipient.email} is too long.`)
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text(title || 'Personalized Document', MARGIN, 25, {
      maxWidth: PAGE_WIDTH - MARGIN * 2,
    })

    pdf.setDrawColor(210, 210, 210)
    pdf.line(MARGIN, 32, PAGE_WIDTH - MARGIN, 32)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    addBody(pdf, body, 44)
  })

  return pdf
}

export function downloadCampaignPdf(campaign, recipients, templates) {
  const pdf = createCampaignPdf(campaign, recipients, templates)
  pdf.save(`${safeFileName(campaign.campaignName)}-personalized-documents.pdf`)
}

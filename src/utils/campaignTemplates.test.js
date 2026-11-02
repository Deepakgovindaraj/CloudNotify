import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTemplateValues,
  findMissingTemplateValues,
  getCampaignTemplate,
  renderCampaignTemplate,
} from './campaignTemplates.js'
import { createCampaignPdf } from './campaignPdf.js'

test('builds safe recipient-specific values from campaign and CSV fields', () => {
  const values = buildTemplateValues(
    {
      campaignName: 'December offers',
      organizationName: 'Example Inc',
      senderName: 'HR Team',
    },
    {
      candidateName: 'Ada Lovelace',
      email: 'ada@example.test',
      data: { job_role: 'Engineer', candidate_name: 'Ignored CSV name' },
    }
  )

  assert.equal(values.candidate_name, 'Ada Lovelace')
  assert.equal(values.job_role, 'Engineer')
  assert.equal(values.organization_name, 'Example Inc')
  assert.equal(values.sender_name, 'HR Team')
})

test('renders known placeholders and reports missing values', () => {
  const values = { candidate_name: 'Ada Lovelace', salary: '' }
  assert.equal(
    renderCampaignTemplate('Hello {{ candidate_name }} — {{unknown_field}}', values),
    'Hello Ada Lovelace — {{unknown_field}}'
  )
  assert.deepEqual(findMissingTemplateValues(
    '{{candidate_name}} / {{salary}} / {{missing_field}}',
    values
  ), ['salary', 'missing_field'])
})

test('generates a downloadable PDF for included valid recipients only', () => {
  const pdf = createCampaignPdf(
    { campaignName: 'December offers', organizationName: 'Example Inc' },
    [
      {
        rowNumber: 2,
        candidateName: 'Ada Lovelace',
        email: 'ada@example.test',
        data: {},
        included: true,
        errors: [],
      },
      {
        rowNumber: 3,
        candidateName: 'Invalid Candidate',
        email: 'invalid@example.test',
        data: {},
        included: false,
        errors: ['Not included'],
      },
    ],
    {
      documentTitle: 'Offer for {{candidate_name}}',
      documentBody: 'Welcome to {{organization_name}}.',
    }
  )

  const output = pdf.output('arraybuffer')
  assert.equal(new TextDecoder().decode(output.slice(0, 5)), '%PDF-')
  assert.match(new TextDecoder().decode(output), /Ada Lovelace/)
  assert.doesNotMatch(new TextDecoder().decode(output), /Invalid Candidate/)
})

test('rejects PDF generation when no recipients are selected', () => {
  assert.throws(
    () => createCampaignPdf({}, [], { documentTitle: 'Title', documentBody: 'Body' }),
    /Select at least one valid recipient/
  )
})

test('returns independent suggested templates by campaign type', () => {
  const first = getCampaignTemplate('OFFER_LETTERS')
  const second = getCampaignTemplate('OFFER_LETTERS')
  first.documentBody = 'customized'
  assert.notEqual(first.documentBody, second.documentBody)
  assert.match(second.documentTitle, /Offer/)
})

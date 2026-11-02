import test from 'node:test'
import assert from 'node:assert/strict'
import { extractInterview } from '../src/interview-extractor.js'

const now = new Date('2026-01-01T00:00:00Z')

test('extracts structured details from an interview invitation', () => {
  const event = extractInterview({
    now,
    subject: 'Interview invitation: Senior Engineer',
    body: 'We would like to invite you to an interview for the Senior Engineer position at Acme Labs on March 12, 2026 at 10:30 AM PST. Video interview: https://meet.google.com/abc-defg-hij',
  })

  assert.deepEqual(event, {
    companyName: 'Acme Labs',
    jobRole: 'Senior Engineer',
    interviewDate: '2026-03-12',
    interviewTime: '10:30',
    timezone: 'America/Los_Angeles',
    location: null,
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    interviewType: 'remote',
    confidence: 0.98,
  })
})

test('does not classify a general mention of an interview as an invitation', () => {
  assert.equal(
    extractInterview({ subject: 'Interview tips', body: 'Here are some tips for your next interview.' }),
    null
  )
})

test('keeps incomplete invitations reviewable with lower confidence', () => {
  const event = extractInterview({
    now,
    subject: 'Interview scheduled',
    body: 'Your interview is scheduled. More details will follow.',
  })

  assert.equal(event.interviewDate, null)
  assert.equal(event.interviewTime, null)
  assert.equal(event.confidence, 0.45)
})

test('supports day-first dates and 24-hour times', () => {
  const event = extractInterview({
    now,
    subject: 'Interview confirmation',
    body: 'Your interview is scheduled for 12 Mar 2026. Time: 14:15. Location: 100 Main Street, Boston',
  })

  assert.equal(event.interviewDate, '2026-03-12')
  assert.equal(event.interviewTime, '14:15')
  assert.equal(event.location, '100 Main Street, Boston')
})

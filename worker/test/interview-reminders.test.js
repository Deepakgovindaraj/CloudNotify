import test from 'node:test'
import assert from 'node:assert/strict'
import { buildInterviewReminderSchedule } from '../src/interview-reminders.js'

test('builds future day-before and morning-of reminders in the event timezone', () => {
  const reminders = buildInterviewReminderSchedule({
    interview_date: '2026-03-12',
    interview_time: '10:30',
    timezone: 'Asia/Kolkata',
  }, new Date('2026-03-10T12:00:00Z'))

  assert.deepEqual(reminders, [
    { type: 'DAY_BEFORE', date: '2026-03-11', time: '09:00', future: true },
    { type: 'MORNING_OF', date: '2026-03-12', time: '08:00', future: true },
  ])
})

test('moves the morning reminder before early interviews and skips past reminders', () => {
  const reminders = buildInterviewReminderSchedule({
    interview_date: '2026-03-10',
    interview_time: '08:15',
    timezone: 'Asia/Kolkata',
  }, new Date('2026-03-10T00:00:00Z'))

  assert.deepEqual(reminders, [
    { type: 'DAY_BEFORE', date: '2026-03-09', time: '09:00', future: false },
    { type: 'MORNING_OF', date: '2026-03-10', time: '07:45', future: true },
  ])
})

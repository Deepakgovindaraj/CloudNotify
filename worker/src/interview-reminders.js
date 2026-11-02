function localDateTime(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

export function buildInterviewReminderSchedule(event, now = new Date()) {
  const previousDate = new Date(`${event.interview_date}T00:00:00Z`)
  previousDate.setUTCDate(previousDate.getUTCDate() - 1)
  const reminders = [
    { type: 'DAY_BEFORE', date: previousDate.toISOString().slice(0, 10), time: '09:00' },
    { type: 'MORNING_OF', date: event.interview_date, time: '08:00' },
  ]
  const [hour, minute] = event.interview_time.split(':').map(Number)
  if (hour * 60 + minute <= 510) {
    let reminderMinutes = hour * 60 + minute - 30
    const date = new Date(`${event.interview_date}T00:00:00Z`)
    if (reminderMinutes < 0) {
      date.setUTCDate(date.getUTCDate() - 1)
      reminderMinutes += 1440
    }
    reminders[1] = {
      type: 'MORNING_OF',
      date: date.toISOString().slice(0, 10),
      time: `${String(Math.floor(reminderMinutes / 60)).padStart(2, '0')}:${String(reminderMinutes % 60).padStart(2, '0')}`,
    }
  }

  const current = localDateTime(event.timezone, now)
  return reminders.map((reminder) => ({
    ...reminder,
    future: reminder.date > current.date ||
      (reminder.date === current.date && reminder.time > current.time),
  }))
}

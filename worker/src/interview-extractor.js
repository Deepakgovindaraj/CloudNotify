const MONTHS = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
}

const TIMEZONES = {
  IST: 'Asia/Kolkata',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  MST: 'America/Denver',
  MDT: 'America/Denver',
  CST: 'America/Chicago',
  CDT: 'America/Chicago',
  EST: 'America/New_York',
  EDT: 'America/New_York',
  GMT: 'Etc/UTC',
  UTC: 'Etc/UTC',
  BST: 'Europe/London',
  CET: 'Europe/Paris',
  CEST: 'Europe/Paris',
  AEST: 'Australia/Sydney',
  AEDT: 'Australia/Sydney',
}

function cleanText(value) {
  return String(value || '')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1) ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function parseDate(text, now) {
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/)
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const monthPattern = Object.keys(MONTHS).join('|')
  const monthFirst = text.match(new RegExp(
    `\\b(${monthPattern})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`, 'i'
  ))
  const dayFirst = text.match(new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthPattern})\\.?(?:,?\\s+(20\\d{2}))?\\b`, 'i'
  ))
  const match = monthFirst || dayFirst
  if (!match) return null

  const monthName = monthFirst ? match[1] : match[2]
  const day = Number(monthFirst ? match[2] : match[1])
  const month = MONTHS[monthName.toLowerCase().replace('.', '')]
  let year = Number(monthFirst ? match[3] : match[3]) || now.getUTCFullYear()
  let date = validDate(year, month, day)
  if (!date) return null

  if (!match[3] && date < now.toISOString().slice(0, 10)) {
    year += 1
    date = validDate(year, month, day)
  }
  return date
}

function validDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseTime(text) {
  const range = text.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(?:-|–|to|until)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i
  )
  const clock = range
    ? `${range[1]}:${range[2] || '00'} ${range[5]}`
    : text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i)?.[0]
  if (clock) {
    const match = clock.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i)
    let hour = Number(match[1])
    const minute = Number(match[2] || 0)
    if (hour < 1 || hour > 12 || minute > 59) return null
    if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12
    if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  const labeled = text.match(/\b(?:time|at)\s*:?\s*(\d{1,2}):(\d{2})\b/i)
  if (!labeled) return null
  const hour = Number(labeled[1])
  const minute = Number(labeled[2])
  return hour <= 23 && minute <= 59
    ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    : null
}

function parseTimezone(text) {
  const iana = text.match(/\b(?:Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific)\/[A-Za-z_+-]+(?:\/[A-Za-z_+-]+)?\b/)
  if (iana) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: iana[0] })
      return iana[0]
    } catch {
      return null
    }
  }
  const abbreviations = text.match(/\b(IST|PST|PDT|MST|MDT|CST|CDT|EST|EDT|GMT|UTC|BST|CET|CEST|AEST|AEDT)\b/i)
  return abbreviations ? TIMEZONES[abbreviations[1].toUpperCase()] : null
}

function extractCompany(text) {
  const patterns = [
    /\binterview\s+(?:with|at)\s+([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,5}?)(?=\s+(?:on|for|will|is|scheduled|at)\b|[,.;])/i,
    /\b(?:position|role)\s+(?:at|with)\s+([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,5}?)(?=\s+(?:on|for|will|is|scheduled|at)\b|[,.;])/i,
    /\b(?:team|company)\s+at\s+([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,5})/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1].replace(/[,.]+$/, '').trim()
  }
  return null
}

function extractRole(text) {
  const patterns = [
    /\binterview\s+(?:for|regarding)\s+(?:the\s+)?(.{3,70}?)\s+(?:position|role)\b/i,
    /\b(?:position|role)\s+(?:of|for)\s+(.{3,70}?)(?=\s+(?:at|with|on|will)\b|[,.;])/i,
    /\b(?:position|role)\s*:\s*([^,.;\n]{3,70})/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1].replace(/\s+/g, ' ').trim()
  }
  return null
}

function extractLocation(text) {
  const match = text.match(/\b(?:location|address|venue)\s*:\s*([^.;\n]{3,120})/i)
  return match ? match[1].trim() : null
}

export function extractInterview({ subject = '', body = '', now = new Date() }) {
  const text = cleanText(`${subject}\n${body}`)
  const invitation = /\b(?:interview\s+(?:invitation|scheduled|confirmation|details)|invite(?:d)?\s+(?:you\s+)?to\s+(?:an?\s+)?interview|schedule\s+(?:an?\s+)?interview|(?:your|the)\s+interview\s+(?:is|has been)\s+scheduled|we(?:'d| would) like to interview you)\b/i.test(text)
  if (!invitation) return null

  const date = parseDate(text, now)
  const time = parseTime(text)
  const company = extractCompany(text)
  const role = extractRole(text)
  const meetingUrl = text.match(/\bhttps?:\/\/[^\s<>"']+/i)?.[0]?.replace(/[),.;]+$/, '') || null
  const location = extractLocation(text)
  const remote = Boolean(meetingUrl) || /\b(?:video|virtual|online|remote)\s+interview\b/i.test(text)
  const interviewType = remote ? 'remote' : /\b(?:onsite|on-site|in-person|office interview)\b/i.test(text)
    ? 'onsite'
    : /\bphone interview\b/i.test(text) ? 'phone' : 'unknown'
  const timezone = parseTimezone(text)
  const confidence = Math.min(
    1,
    0.45 + (date ? 0.18 : 0) + (time ? 0.14 : 0) + (company ? 0.10 : 0) +
      (role ? 0.06 : 0) + (location || meetingUrl ? 0.05 : 0)
  )

  return {
    companyName: company,
    jobRole: role,
    interviewDate: date,
    interviewTime: time,
    timezone,
    location,
    meetingUrl,
    interviewType,
    confidence: Math.round(confidence * 100) / 100,
  }
}

export const MAX_CSV_SIZE = 256 * 1024
export const MAX_CSV_ROWS = 500
export const MAX_CSV_COLUMNS = 50

const FIELD_NAMES = [
  'candidate_name',
  'email',
  'job_role',
  'salary',
  'joining_date',
  'company_name',
]

export function normalizeFieldName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function suggestedField(header) {
  const normalized = normalizeFieldName(header)
  const aliases = {
    candidate_name: ['candidate_name', 'name', 'full_name', 'applicant_name'],
    email: ['email', 'email_address', 'candidate_email'],
    job_role: ['job_role', 'role', 'position', 'job_title'],
    salary: ['salary', 'compensation'],
    joining_date: ['joining_date', 'start_date', 'joining'],
    company_name: ['company_name', 'company', 'organization'],
  }
  return FIELD_NAMES.find((field) => aliases[field].includes(normalized)) || 'custom'
}

export function suggestColumnMapping(headers) {
  return Object.fromEntries(headers.map((header) => [header, suggestedField(header)]))
}

export function parseCsv(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('The CSV file is empty.')
  }

  const source = text.replace(/^\uFEFF/, '')
  const records = []
  let record = []
  let field = ''
  let inQuotes = false
  let quoteClosed = false

  const pushField = () => {
    record.push(field.trim())
    field = ''
    quoteClosed = false
  }
  const pushRecord = () => {
    pushField()
    if (record.some((value) => value !== '')) records.push(record)
    record = []
  }

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
          quoteClosed = true
        }
      } else {
        field += character
      }
      continue
    }

    if (quoteClosed) {
      if (character === ' ' || character === '\t') continue
      if (character !== ',' && character !== '\r' && character !== '\n') {
        throw new Error('The CSV contains characters after a closing quote.')
      }
    }

    if (character === '"') {
      if (field) throw new Error('The CSV contains an unexpected quote.')
      inQuotes = true
    } else if (character === ',') {
      pushField()
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      pushRecord()
    } else {
      field += character
    }
  }

  if (inQuotes) throw new Error('The CSV contains an unclosed quoted field.')
  if (field || record.length) pushRecord()
  if (!records.length) throw new Error('The CSV must include a header row.')

  const headers = records.shift().map((header) => header.trim())
  if (headers.length < 2 || headers.some((header) => !header)) {
    throw new Error('Add a name and email column with non-empty headers.')
  }
  if (headers.length > MAX_CSV_COLUMNS) {
    throw new Error(`The CSV may contain up to ${MAX_CSV_COLUMNS} columns.`)
  }
  const normalizedHeaders = headers.map(normalizeFieldName)
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    throw new Error('The CSV contains duplicate column names.')
  }

  if (records.length > MAX_CSV_ROWS) {
    throw new Error(`The CSV may contain up to ${MAX_CSV_ROWS} recipient rows.`)
  }

  const rows = records.map((values, index) => {
    if (values.length > headers.length) {
      throw new Error(`CSV row ${index + 2} has more values than the header.`)
    }
    return {
      rowNumber: index + 2,
      values: [...values, ...Array(headers.length - values.length).fill('')],
    }
  })

  if (!rows.length) throw new Error('The CSV does not contain any recipient rows.')
  return { headers, rows }
}

function isValidDate(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
}

export function mapCsvRecipients(headers, rows, mapping) {
  const mappingErrors = []
  for (const requiredField of ['candidate_name', 'email']) {
    const count = headers.filter((header) => mapping[header] === requiredField).length
    if (count !== 1) {
      mappingErrors.push(count
        ? `Map only one column to ${requiredField === 'email' ? 'Email' : 'Candidate name'}.`
        : `Map a column to ${requiredField === 'email' ? 'Email' : 'Candidate name'}.`)
    }
  }

  const mappedFields = headers
    .map((header) => mapping[header])
    .filter((field) => FIELD_NAMES.includes(field))
  const duplicateFields = new Set(
    mappedFields.filter((field, index) => mappedFields.indexOf(field) !== index)
  )
  for (const field of duplicateFields) {
    mappingErrors.push(`Map only one column to ${field.replace('_', ' ')}.`)
  }

  const recipients = rows.map(({ rowNumber, values }) => {
    const data = {}
    headers.forEach((header, index) => {
      const target = mapping[header]
      if (target === 'ignore') return
      const key = target === 'custom' ? normalizeFieldName(header) : target
      if (key) data[key] = values[index] || ''
    })

    const candidateName = String(data.candidate_name || '').trim()
    const email = String(data.email || '').trim().toLowerCase()
    const errors = []
    if (!candidateName) errors.push('Candidate name is required.')
    if (!email) errors.push('Email is required.')
    else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Email address is invalid.')
    }
    for (const [key, value] of Object.entries(data)) {
      if (value && /(^|_)(date|day)(_|$)/.test(key) && !isValidDate(value)) {
        errors.push(`${key.replaceAll('_', ' ')} must use YYYY-MM-DD format.`)
      }
    }

    return { rowNumber, candidateName, email, data, errors, included: errors.length === 0 }
  })

  const emailCounts = new Map()
  recipients.forEach(({ email }) => {
    if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
  })
  recipients.forEach((recipient) => {
    if (recipient.email && emailCounts.get(recipient.email) > 1) {
      recipient.errors.push('Email address is duplicated in this file.')
      recipient.included = false
    }
  })

  return { recipients, mappingErrors }
}

function csvCell(value) {
  let text = String(value ?? '')
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function createValidationReportCsv(recipients) {
  const lines = [
    ['row', 'candidate_name', 'email', 'validation_status', 'validation_errors'],
    ...recipients.map((recipient) => [
      recipient.rowNumber,
      recipient.candidateName,
      recipient.email,
      recipient.errors.length ? 'INVALID' : 'VALID',
      recipient.errors.join('; '),
    ]),
  ]
  return lines.map((line) => line.map(csvCell).join(',')).join('\r\n')
}

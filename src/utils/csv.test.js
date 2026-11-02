import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createValidationReportCsv,
  mapCsvRecipients,
  parseCsv,
  suggestColumnMapping,
} from './csv.js'

test('parses quoted commas, escaped quotes, CRLF, and embedded newlines', () => {
  const parsed = parseCsv(
    '\uFEFFCandidate Name,Email,Company\r\n"Ada, Jr.",ada@example.test,"A ""quoted"" company"\r\n' +
    '"Line one\nLine two",line@example.test,Example'
  )

  assert.deepEqual(parsed.headers, ['Candidate Name', 'Email', 'Company'])
  assert.equal(parsed.rows[0].values[0], 'Ada, Jr.')
  assert.equal(parsed.rows[0].values[2], 'A "quoted" company')
  assert.equal(parsed.rows[1].values[0], 'Line one\nLine two')
})

test('maps fields and flags missing values, invalid dates, and duplicate emails', () => {
  const parsed = parseCsv([
    'candidate_name,email,joining_date,job_role',
    'Ada,ada@example.test,2026-12-01,Engineer',
    'Grace,ADA@example.test,2026-02-30,Manager',
    ',bad-address,2026-12-04,Designer',
  ].join('\n'))
  const result = mapCsvRecipients(
    parsed.headers,
    parsed.rows,
    suggestColumnMapping(parsed.headers)
  )

  assert.deepEqual(result.mappingErrors, [])
  assert.equal(result.recipients[0].errors[0], 'Email address is duplicated in this file.')
  assert(result.recipients[1].errors.some((error) => error.includes('joining date')))
  assert(result.recipients[1].errors.some((error) => error.includes('duplicated')))
  assert(result.recipients[2].errors.some((error) => error.includes('Candidate name')))
  assert(result.recipients[2].errors.some((error) => error.includes('Email address')))
})

test('rejects malformed, oversized, and ambiguous CSV input', () => {
  assert.throws(() => parseCsv('name,email\n"unclosed,a@example.test'), /unclosed/)
  assert.throws(() => parseCsv('name,email\nAda,a@example.test,unexpected'), /more values/)
  assert.throws(() => parseCsv('Name,name\nAda,a@example.test'), /duplicate/)
})

test('validation report escapes CSV cells and neutralizes spreadsheet formulas', () => {
  const report = createValidationReportCsv([{
    rowNumber: 2,
    candidateName: '=HYPERLINK("https://example.test")',
    email: 'ada@example.test',
    errors: ['Invalid, duplicate'],
  }])

  assert(report.includes("'=HYPERLINK("))
  assert(report.includes('""https://example.test""'))
  assert(report.includes('"Invalid, duplicate"'))
})

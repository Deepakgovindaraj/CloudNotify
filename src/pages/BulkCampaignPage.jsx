import { useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Download,
  FileSpreadsheet,
  MailPlus,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { campaignService } from '@/services/campaignService'
import {
  createValidationReportCsv,
  mapCsvRecipients,
  MAX_CSV_SIZE,
  parseCsv,
  suggestColumnMapping,
} from '@/utils/csv'

const CAMPAIGN_TYPES = [
  { value: 'OFFER_LETTERS', label: 'Offer Letters' },
  { value: 'INTERVIEW_INVITATIONS', label: 'Interview Invitations' },
  { value: 'REJECTION_LETTERS', label: 'Rejection Letters' },
  { value: 'INTERNSHIP_CERTIFICATES', label: 'Internship Certificates' },
  { value: 'APPOINTMENT_LETTERS', label: 'Appointment Letters' },
  { value: 'ADMISSION_LETTERS', label: 'Admission Letters' },
  { value: 'CUSTOM_DOCUMENTS', label: 'Custom Documents' },
]

const FIELD_OPTIONS = [
  { value: 'custom', label: 'Keep as custom field' },
  { value: 'candidate_name', label: 'Candidate name' },
  { value: 'email', label: 'Email address' },
  { value: 'job_role', label: 'Job role' },
  { value: 'salary', label: 'Salary' },
  { value: 'joining_date', label: 'Joining date' },
  { value: 'company_name', label: 'Company name' },
  { value: 'ignore', label: 'Ignore column' },
]

const INITIAL_CAMPAIGN = {
  campaignName: '',
  description: '',
  organizationName: '',
  campaignType: 'OFFER_LETTERS',
  senderName: '',
  senderEmail: '',
  replyToEmail: '',
  campaignDate: '',
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function downloadReport(recipients) {
  const blob = new Blob([createValidationReportCsv(recipients)], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'recipient-validation-report.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function BulkCampaignPage() {
  const fileInput = useRef(null)
  const [step, setStep] = useState(1)
  const [campaign, setCampaign] = useState(INITIAL_CAMPAIGN)
  const [campaignError, setCampaignError] = useState('')
  const [fileError, setFileError] = useState('')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [includedRows, setIncludedRows] = useState(new Set())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [saving, setSaving] = useState(false)
  const [savedCampaign, setSavedCampaign] = useState(null)

  const { recipients, mappingErrors } = useMemo(
    () => mapCsvRecipients(headers, rows, mapping),
    [headers, rows, mapping]
  )
  const validRecipients = recipients.filter((recipient) => recipient.errors.length === 0)
  const invalidRecipients = recipients.filter((recipient) => recipient.errors.length > 0)
  const selectedRecipients = validRecipients.filter((recipient) =>
    includedRows.has(recipient.rowNumber)
  )

  const visibleRecipients = recipients.filter((recipient) => {
    if (filter === 'VALID' && recipient.errors.length) return false
    if (filter === 'INVALID' && !recipient.errors.length) return false
    if (filter === 'SELECTED' && !includedRows.has(recipient.rowNumber)) return false
    const query = search.trim().toLowerCase()
    return !query || recipient.candidateName.toLowerCase().includes(query) ||
      recipient.email.toLowerCase().includes(query)
  })

  const updateCampaign = (field) => (event) => {
    setCampaign((current) => ({ ...current, [field]: event.target.value }))
    setCampaignError('')
  }

  const validateCampaign = () => {
    if (!campaign.campaignName.trim() || !campaign.organizationName.trim() ||
        !campaign.senderName.trim() || !isEmail(campaign.senderEmail.trim()) ||
        (campaign.replyToEmail && !isEmail(campaign.replyToEmail.trim()))) {
      setCampaignError('Enter the campaign, organization, sender name, and a valid sender email.')
      return false
    }
    if (campaign.campaignDate && Number.isNaN(Date.parse(`${campaign.campaignDate}T00:00:00`))) {
      setCampaignError('Choose a valid campaign date.')
      return false
    }
    return true
  }

  const acceptFile = async (file) => {
    setFileError('')
    setSavedCampaign(null)
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Choose a CSV file.')
      return
    }
    if (file.size > MAX_CSV_SIZE) {
      setFileError('CSV files must be 256 KB or smaller.')
      return
    }
    try {
      const parsed = parseCsv(await file.text())
      const nextMapping = suggestColumnMapping(parsed.headers)
      const result = mapCsvRecipients(parsed.headers, parsed.rows, nextMapping)
      setFileName(file.name)
      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setMapping(nextMapping)
      setIncludedRows(new Set(
        result.recipients
          .filter((recipient) => recipient.errors.length === 0)
          .map((recipient) => recipient.rowNumber)
      ))
      setSearch('')
      setFilter('ALL')
    } catch (error) {
      setFileError(error.message || 'Could not read the CSV file.')
      setFileName('')
      setHeaders([])
      setRows([])
      setMapping({})
      setIncludedRows(new Set())
    }
  }

  const toggleRecipient = (rowNumber) => {
    setIncludedRows((current) => {
      const next = new Set(current)
      if (next.has(rowNumber)) next.delete(rowNumber)
      else next.add(rowNumber)
      return next
    })
  }

  const selectVisible = () => {
    setIncludedRows((current) => new Set([
      ...current,
      ...visibleRecipients
        .filter((recipient) => recipient.errors.length === 0)
        .map((recipient) => recipient.rowNumber),
    ]))
  }

  const excludeVisible = () => {
    setIncludedRows((current) => {
      const next = new Set(current)
      visibleRecipients.forEach((recipient) => next.delete(recipient.rowNumber))
      return next
    })
  }

  const removeInvalid = () => {
    const invalidRowNumbers = new Set(invalidRecipients.map((recipient) => recipient.rowNumber))
    setRows((current) => current.filter((row) => !invalidRowNumbers.has(row.rowNumber)))
    setIncludedRows((current) => new Set(
      [...current].filter((rowNumber) => !invalidRowNumbers.has(rowNumber))
    ))
  }

  const saveDraft = async () => {
    setSaving(true)
    setCampaignError('')
    try {
      const result = await campaignService.createDraft({
        ...campaign,
        recipients: recipients.map((recipient) => ({
          ...recipient,
          included: includedRows.has(recipient.rowNumber),
        })),
      })
      setSavedCampaign(result)
    } catch (error) {
      setCampaignError(
        error.response?.data?.error || 'Could not save this campaign draft. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const resetCampaign = () => {
    setStep(1)
    setCampaign(INITIAL_CAMPAIGN)
    setCampaignError('')
    setFileError('')
    setFileName('')
    setHeaders([])
    setRows([])
    setMapping({})
    setIncludedRows(new Set())
    setSavedCampaign(null)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 p-3 text-white">
            <MailPlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Bulk Delivery</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create a campaign draft and validate recipients before delivery.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2" aria-label="Campaign setup progress">
        {['Campaign information', 'Recipients', 'Review draft'].map((label, index) => {
          const currentStep = index + 1
          return (
            <div
              key={label}
              className={`rounded-xl border p-3 text-xs sm:text-sm ${
                step === currentStep
                  ? 'border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300'
                  : step > currentStep
                    ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 text-slate-500 dark:border-slate-700'
              }`}
            >
              <span className="font-semibold">{String(currentStep).padStart(2, '0')}</span>
              <span className="ml-2">{label}</span>
            </div>
          )
        })}
      </div>

      {savedCampaign ? (
        <section className="glass-card space-y-4 p-6" role="status">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-6 w-6" />
            <h2 className="font-display text-lg font-semibold">Campaign draft saved</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {savedCampaign.totalRecipients} recipients saved: {savedCampaign.validRecipients} valid
            {' '}and {savedCampaign.invalidRecipients} invalid. No emails were sent.
          </p>
          <p className="text-xs text-slate-500">Draft ID: {savedCampaign.campaignId}</p>
          <Button onClick={resetCampaign}>Create another campaign</Button>
        </section>
      ) : (
        <section className="glass-card space-y-6 p-5 sm:p-7">
          {step === 1 && (
            <>
              <div>
                <h2 className="font-display text-lg font-semibold">Campaign information</h2>
                <p className="mt-1 text-sm text-slate-500">Set up the details for this draft.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Campaign name"
                  name="campaignName"
                  maxLength={120}
                  value={campaign.campaignName}
                  onChange={updateCampaign('campaignName')}
                  placeholder="December engineering offers"
                  required
                />
                <Input
                  label="Organization name"
                  name="organizationName"
                  maxLength={120}
                  value={campaign.organizationName}
                  onChange={updateCampaign('organizationName')}
                  placeholder="Your organization"
                  required
                />
                <Select
                  label="Campaign type"
                  name="campaignType"
                  value={campaign.campaignType}
                  onChange={updateCampaign('campaignType')}
                  options={CAMPAIGN_TYPES}
                />
                <Input
                  label="Campaign date"
                  name="campaignDate"
                  type="date"
                  value={campaign.campaignDate}
                  onChange={updateCampaign('campaignDate')}
                />
                <Input
                  label="Sender name"
                  name="senderName"
                  maxLength={120}
                  value={campaign.senderName}
                  onChange={updateCampaign('senderName')}
                  placeholder="People Operations"
                  required
                />
                <Input
                  label="Sender email"
                  name="senderEmail"
                  type="email"
                  maxLength={254}
                  value={campaign.senderEmail}
                  onChange={updateCampaign('senderEmail')}
                  placeholder="hr@example.com"
                  required
                />
                <Input
                  label="Reply-to email"
                  name="replyToEmail"
                  type="email"
                  maxLength={254}
                  value={campaign.replyToEmail}
                  onChange={updateCampaign('replyToEmail')}
                  placeholder="people@example.com"
                />
              </div>
              <Textarea
                label="Campaign description"
                name="description"
                rows={3}
                maxLength={2000}
                value={campaign.description}
                onChange={updateCampaign('description')}
                placeholder="Optional notes about this campaign"
              />
              {campaignError && <p className="text-sm text-red-500" role="alert">{campaignError}</p>}
              <div className="flex justify-end">
                <Button
                  icon={ArrowRight}
                  onClick={() => {
                    if (validateCampaign()) setStep(2)
                  }}
                >
                  Continue to recipients
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h2 className="font-display text-lg font-semibold">Upload and validate recipients</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload a CSV up to 256 KB. Required fields are candidate name and email.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  acceptFile(event.dataTransfer.files[0])
                }}
                className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary-500/40 bg-primary-500/5 p-8 text-center transition hover:border-primary-500"
              >
                {fileName ? (
                  <FileSpreadsheet className="mb-3 h-8 w-8 text-primary-500" />
                ) : (
                  <Upload className="mb-3 h-8 w-8 text-primary-500" />
                )}
                <span className="font-medium">{fileName || 'Drop a CSV file here or browse'}</span>
                <span className="mt-1 text-xs text-slate-500">
                  Your file is parsed in the browser; it is not stored as an uploaded file.
                </span>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(event) => acceptFile(event.target.files[0])}
                />
              </button>
              {fileError && <p className="text-sm text-red-500" role="alert">{fileError}</p>}

              {headers.length > 0 && (
                <>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold">Map CSV columns</h3>
                      <p className="text-xs text-slate-500">
                        CloudNotify suggests common fields. Keep other columns as custom data or ignore them.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {headers.map((header) => (
                        <Select
                          key={header}
                          label={header}
                          value={mapping[header] || 'custom'}
                          onChange={(event) => setMapping((current) => ({
                            ...current,
                            [header]: event.target.value,
                          }))}
                          options={FIELD_OPTIONS}
                        />
                      ))}
                    </div>
                    {mappingErrors.length > 0 && (
                      <div className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300" role="alert">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <ul>{mappingErrors.map((error) => <li key={error}>{error}</li>)}</ul>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800/60">
                      <p className="text-xs text-slate-500">Valid recipients</p>
                      <p className="mt-1 text-2xl font-semibold text-emerald-600">{validRecipients.length}</p>
                    </div>
                    <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800/60">
                      <p className="text-xs text-slate-500">Invalid recipients</p>
                      <p className="mt-1 text-2xl font-semibold text-red-500">{invalidRecipients.length}</p>
                    </div>
                    <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800/60">
                      <p className="text-xs text-slate-500">Selected to include</p>
                      <p className="mt-1 text-2xl font-semibold">{selectedRecipients.length}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Input
                        label="Search recipients"
                        name="recipientSearch"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Name or email"
                      />
                      <Select
                        label="Show"
                        name="recipientFilter"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        options={[
                          { value: 'ALL', label: 'All rows' },
                          { value: 'VALID', label: 'Valid' },
                          { value: 'INVALID', label: 'Invalid' },
                          { value: 'SELECTED', label: 'Selected' },
                        ]}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={selectVisible}>
                        Select visible valid
                      </Button>
                      <Button variant="secondary" size="sm" onClick={excludeVisible}>
                        Exclude visible
                      </Button>
                      {invalidRecipients.length > 0 && (
                        <Button variant="ghost" size="sm" icon={Trash2} onClick={removeInvalid}>
                          Remove invalid rows
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Download}
                        onClick={() => downloadReport(recipients)}
                      >
                        Download report
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800">
                        <tr>
                          <th className="p-3">Include</th>
                          <th className="p-3">Candidate</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Validation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRecipients.map((recipient) => (
                          <tr key={recipient.rowNumber} className="border-t border-slate-200 dark:border-slate-700">
                            <td className="p-3">
                              <input
                                type="checkbox"
                                aria-label={`Include ${recipient.candidateName || `CSV row ${recipient.rowNumber}`}`}
                                checked={includedRows.has(recipient.rowNumber)}
                                disabled={recipient.errors.length > 0}
                                onChange={() => toggleRecipient(recipient.rowNumber)}
                                className="h-4 w-4 accent-primary-600"
                              />
                            </td>
                            <td className="p-3">{recipient.candidateName || '—'}</td>
                            <td className="p-3">{recipient.email || '—'}</td>
                            <td className="p-3">
                              {recipient.errors.length
                                ? <span className="text-xs text-red-500">{recipient.errors.join(' ')}</span>
                                : <span className="text-xs text-emerald-600">Valid</span>}
                            </td>
                          </tr>
                        ))}
                        {visibleRecipients.length === 0 && (
                          <tr><td className="p-5 text-center text-slate-500" colSpan={4}>No recipients match this filter.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {campaignError && <p className="text-sm text-red-500" role="alert">{campaignError}</p>}
              <div className="flex justify-between">
                <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  icon={ArrowRight}
                  disabled={!headers.length || mappingErrors.length > 0 || !selectedRecipients.length}
                  onClick={() => setStep(3)}
                >
                  Review draft
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <h2 className="font-display text-lg font-semibold">Review campaign draft</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Confirm the recipient selection and campaign details before saving.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Campaign', campaign.campaignName],
                  ['Organization', campaign.organizationName],
                  ['Type', CAMPAIGN_TYPES.find(({ value }) => value === campaign.campaignType)?.label],
                  ['Sender', `${campaign.senderName} · ${campaign.senderEmail}`],
                  ['Total CSV rows', recipients.length],
                  ['Valid', validRecipients.length],
                  ['Invalid', invalidRecipients.length],
                  ['Included', selectedRecipients.length],
                  ['Excluded valid', validRecipients.length - selectedRecipients.length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800/60">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 break-words font-medium">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                <p className="font-semibold">Draft only — no emails will be sent.</p>
                <p className="mt-1 text-slate-500">
                  Email templates, document generation, approvals, and delivery are planned for later phases.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Included recipient preview</h3>
                <ul className="mt-2 max-h-56 divide-y divide-slate-200 overflow-auto rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                  {selectedRecipients.map((recipient) => (
                    <li key={recipient.rowNumber} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
                      <span>{recipient.candidateName}</span>
                      <span className="text-slate-500">{recipient.email}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {campaignError && <p className="text-sm text-red-500" role="alert">{campaignError}</p>}
              <div className="flex flex-wrap justify-between gap-3">
                <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(2)}>
                  Back to recipients
                </Button>
                <Button loading={saving} onClick={saveDraft}>
                  Save campaign draft
                </Button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}

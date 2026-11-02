import { useMemo, useState } from 'react'
import { Download, FileText, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import {
  buildTemplateValues,
  findMissingTemplateValues,
  getCampaignTemplate,
  renderCampaignTemplate,
} from '@/utils/campaignTemplates'

export function CampaignTemplateEditor({
  campaign,
  recipients,
  templates,
  onChange,
  onTemplatesChange,
  onDownload,
  downloading = false,
  downloadError = '',
}) {
  const [previewRecipientId, setPreviewRecipientId] = useState('')
  const eligibleRecipients = useMemo(
    () => recipients.filter((recipient) =>
      recipient.included !== false &&
      recipient.validationStatus !== 'INVALID' &&
      !recipient.errors?.length &&
      !recipient.validationErrors?.length
    ),
    [recipients]
  )
  const selectedRecipient = eligibleRecipients.find((recipient) =>
    String(recipient.recipientId || recipient.rowNumber) === previewRecipientId
  ) || eligibleRecipients[0]
  const values = selectedRecipient ? buildTemplateValues(campaign, selectedRecipient) : {}
  const subjectPreview = renderCampaignTemplate(templates.emailSubject, values)
  const emailPreview = renderCampaignTemplate(templates.emailBody, values)
  const documentTitlePreview = renderCampaignTemplate(templates.documentTitle, values)
  const documentPreview = renderCampaignTemplate(templates.documentBody, values)
  const missingValues = selectedRecipient
    ? [...new Set([
      ...findMissingTemplateValues(templates.emailSubject, values),
      ...findMissingTemplateValues(templates.emailBody, values),
      ...findMissingTemplateValues(templates.documentTitle, values),
      ...findMissingTemplateValues(templates.documentBody, values),
    ])]
    : []

  const update = (field) => (event) => {
    onChange(field, event.target.value)
  }

  const loadSuggestedTemplate = () => {
    onTemplatesChange(getCampaignTemplate(campaign.campaignType))
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold">Message and document templates</h3>
          <p className="mt-1 text-sm text-slate-500">
            Personalize with placeholders such as {'{{candidate_name}}'}, {'{{organization_name}}'},
            {' {{job_role}}'}, and any mapped CSV field. This prepares content only; nothing is sent.
            The download combines one personalized document per included recipient into a single PDF.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={loadSuggestedTemplate}>
          Load suggested template
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-medium">
            <Mail className="h-4 w-4 text-primary-500" />
            Message template
          </div>
          <Input
            label="Email subject"
            name="emailSubject"
            maxLength={200}
            value={templates.emailSubject}
            onChange={update('emailSubject')}
          />
          <Textarea
            label="Email message"
            name="emailBody"
            rows={7}
            maxLength={10000}
            value={templates.emailBody}
            onChange={update('emailBody')}
          />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-medium">
            <FileText className="h-4 w-4 text-primary-500" />
            Personalized PDF template
          </div>
          <Input
            label="Document title"
            name="documentTitle"
            maxLength={200}
            value={templates.documentTitle}
            onChange={update('documentTitle')}
          />
          <Textarea
            label="Document content"
            name="documentBody"
            rows={7}
            maxLength={20000}
            value={templates.documentBody}
            onChange={update('documentBody')}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-slate-100 p-4 dark:bg-slate-800/60">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[220px] flex-1">
            <Select
              label="Preview recipient"
              name="templatePreviewRecipient"
              value={selectedRecipient
                ? String(selectedRecipient.recipientId || selectedRecipient.rowNumber)
                : ''}
              onChange={(event) => setPreviewRecipientId(event.target.value)}
              options={eligibleRecipients.map((recipient) => ({
                value: String(recipient.recipientId || recipient.rowNumber),
                label: `${recipient.candidateName || 'Unnamed'} · ${recipient.email}`,
              }))}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={Download}
            loading={downloading}
            disabled={!eligibleRecipients.length}
            onClick={onDownload}
          >
            Download combined PDF
          </Button>
        </div>

        {downloadError && <p className="text-sm text-red-500" role="alert">{downloadError}</p>}
        {!selectedRecipient ? (
          <p className="text-sm text-slate-500">Include a valid recipient to preview templates and generate PDFs.</p>
        ) : (
          <>
            {missingValues.length > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-300" role="status">
                These placeholders are blank for this recipient: {missingValues.map((key) => `{{${key}}}`).join(', ')}
              </p>
            )}
            <div className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message preview (not sent)</p>
                <p className="mt-3 break-words font-medium">{subjectPreview || '(No subject)'}</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                  {emailPreview || '(No message content)'}
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">PDF preview</p>
                <h4 className="mt-3 break-words font-display text-lg font-semibold">
                  {documentTitlePreview || 'Personalized Document'}
                </h4>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                  {documentPreview || '(No document content)'}
                </p>
              </article>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

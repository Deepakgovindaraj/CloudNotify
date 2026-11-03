const docGroups = [
  {
    title: 'Getting Started',
    articles: [
      ['introduction', 'Introduction', 'CloudNotify brings scheduled notifications and supported communication channels together in one app.'],
      ['features', 'Features', 'Explore notification scheduling, Gmail and Telegram channels, notification history and the current Bulk Delivery workflow.'],
      ['how-it-works', 'How It Works', 'Create a notification, choose a supported channel and schedule its delivery for a selected date and time.'],
      ['creating-an-account', 'Creating an Account', 'Sign in to CloudNotify with Google to access the authenticated application.'],
      ['google-sign-in', 'Google Sign-In', 'Use Google sign-in on the public login page to access CloudNotify.'],
      ['dashboard-overview', 'Dashboard Overview', 'The dashboard summarizes notifications and provides access to the app’s main features.'],
      ['first-notification', 'First Notification', 'Create a notification by entering its message, recipient, channel, date and time.'],
    ],
  },
  {
    title: 'User Guide',
    articles: [
      ['creating-notifications', 'Creating Notifications', 'Create a notification with a title, message, recipient email, delivery channel, date and time.'],
      ['scheduling-notifications', 'Scheduling Notifications', 'Choose a date, time and time zone when creating a notification.'],
      ['notification-history', 'Notification History', 'Review notifications and their recorded delivery statuses in the history view.'],
      ['managing-channels', 'Managing Channels', 'Connect and manage the Gmail and Telegram channels supported by the app.'],
      ['profile-and-settings', 'Profile and Settings', 'Manage the account profile and available application preferences.'],
    ],
  },
  {
    title: 'Integrations',
    articles: [
      ['gmail-integration', 'Gmail Integration', 'CloudNotify sends scheduled Gmail notifications through its configured delivery account. Inbox access is not requested.'],
      ['telegram-integration', 'Telegram Integration', 'Link Telegram using the connection flow available in the profile and channel settings.'],
      ['whatsapp-manual', 'WhatsApp Manual', 'WhatsApp delivery is not currently available in the application.'],
      ['whatsapp-automated', 'WhatsApp Automated', 'Automated WhatsApp integration is not currently available in the application.'],
      ['bulk-mail-integration', 'Bulk Mail Integration', 'Bulk Delivery currently supports campaign drafts, recipient validation, template previews and PDF downloads.'],
    ],
  },
  {
    title: 'Bulk Mail Documentation',
    articles: [
      ['creating-campaigns', 'Creating Campaigns', 'Create and save a Bulk Delivery campaign draft with organization and sender details.'],
      ['uploading-csv-files', 'Uploading CSV Files', 'Import CSV recipient data in the browser; the current parser limits files to 256 KB and 500 rows.'],
      ['recipient-validation', 'Recipient Validation', 'Review parsed recipient rows and download a validation report for included recipients.'],
      ['email-templates', 'Email Templates', 'Configure and preview personalized campaign message templates; sending is not available in this phase.'],
      ['document-templates', 'Document Templates', 'Configure campaign document templates and preview generated personalized content.'],
      ['personalized-pdf-generation', 'Personalized PDF Generation', 'Generate and download a combined personalized PDF in the browser.'],
      ['whatsapp-manual-delivery', 'WhatsApp Manual Delivery', 'WhatsApp campaign delivery is not currently available in the application.'],
      ['whatsapp-automated-delivery', 'WhatsApp Automated Delivery', 'Automated WhatsApp campaign delivery is not currently available in the application.'],
      ['campaign-approval', 'Campaign Approval', 'Campaign approval and message delivery are future work and are not available in this release.'],
      ['delivery-tracking', 'Delivery Tracking', 'Campaign delivery tracking is not available because Bulk Delivery does not send campaign messages yet.'],
    ],
  },
  {
    title: 'Developer Documentation',
    articles: [
      ['api-overview', 'API Overview', 'The application uses private backend endpoints; a public developer API is not currently documented.'],
      ['authentication', 'Authentication', 'App sign-in is implemented for the CloudNotify product; public API authentication guidance is not available.'],
      ['api-reference', 'API Reference', 'A public API reference is not currently available.'],
      ['webhooks', 'Webhooks', 'Public customer webhook documentation is not currently available.'],
      ['error-handling', 'Error Handling', 'A public developer guide to API errors is not currently available.'],
      ['integration-examples', 'Integration Examples', 'Public third-party integration examples are not currently available.'],
    ],
  },
]

export const DOC_GROUPS = docGroups.map((group) => ({
  ...group,
  articles: group.articles.map(([slug, title, summary]) => ({
    slug,
    title,
    summary,
    category: group.title,
    comingSoon: [
      'whatsapp-manual',
      'whatsapp-automated',
      'whatsapp-manual-delivery',
      'whatsapp-automated-delivery',
      'campaign-approval',
      'delivery-tracking',
      'api-overview',
      'authentication',
      'api-reference',
      'webhooks',
      'error-handling',
      'integration-examples',
    ].includes(slug),
  })),
}))

export const DOC_ARTICLES = DOC_GROUPS.flatMap((group) => group.articles)

export const LEGAL_PAGES = {
  terms: {
    title: 'Terms of Service',
    summary: 'Draft terms of service pending legal review.',
  },
  privacy: {
    title: 'Privacy Policy',
    summary: 'Draft privacy notice pending legal review and confirmation of applicable data practices.',
  },
  cookies: {
    title: 'Cookie Policy',
    summary: 'Draft cookie notice pending legal review and confirmation of cookie usage.',
  },
  'acceptable-use': {
    title: 'Acceptable Use Policy',
    summary: 'Draft acceptable use policy pending legal review.',
  },
  'data-processing': {
    title: 'Data Processing Agreement',
    summary: 'Draft data processing terms pending legal review and confirmation of processing roles.',
  },
  'data-retention': {
    title: 'Data Retention Policy',
    summary: 'Draft retention notice pending legal review and confirmation of retention periods.',
  },
  security: {
    title: 'Security',
    summary: 'Security information and reporting instructions require review before publication.',
  },
}

export const LEGAL_RELATED_LINKS = [
  ['Terms of Service', '/legal/terms'],
  ['Privacy Policy', '/legal/privacy'],
  ['Cookie Policy', '/legal/cookies'],
  ['Acceptable Use Policy', '/legal/acceptable-use'],
  ['Data Processing Agreement', '/legal/data-processing'],
  ['Data Retention Policy', '/legal/data-retention'],
  ['Security', '/legal/security'],
]

export const GUIDES = {
  'google-sign-in': [
    'Choose Sign in with Google on the public CloudNotify login page.',
    'Google sign-in authenticates you to CloudNotify; it does not request or grant CloudNotify access to your Gmail inbox.',
  ],
  'gmail-integration': [
    'The Gmail channel sends scheduled notifications through CloudNotify’s configured delivery account.',
    'The Gmail delivery account is separate from the Google account you use to sign in.',
    'Reading or syncing a user’s Gmail inbox and automatically finding interview invitations are not part of the current plan.',
  ],
  'first-notification': [
    'Open Create Notification from the app navigation.',
    'Enter a title, message and recipient email address.',
    'Choose Gmail, Telegram or both, then select a date and time.',
    'Save the notification and check its status in the notification history.',
  ],
  'creating-notifications': [
    'Enter a title, message, recipient email, date and time in the notification form.',
    'Choose Gmail, Telegram or both as the channel.',
    'The notification is saved with a pending status for scheduled delivery.',
  ],
  'scheduling-notifications': [
    'Set the delivery date and time in the notification form.',
    'CloudNotify uses the selected time zone; the profile time zone is used when available.',
    'Review scheduled items in the notification history.',
  ],
  'uploading-csv-files': [
    'Choose a CSV file from the Bulk Delivery campaign editor.',
    'Map its columns to the campaign recipient fields and review the parsed rows.',
    'The current browser-side parser supports files up to 256 KB and 500 rows.',
  ],
  'recipient-validation': [
    'Import a CSV and review rows in the campaign editor.',
    'Select which validated rows to include in a preview or generated document.',
    'Download the validation report CSV when you need a copy of the row results.',
  ],
  'personalized-pdf-generation': [
    'Select a saved campaign draft and configure its document template.',
    'Preview the personalized content for included, valid recipients.',
    'Generate and download the combined PDF. Generation runs in your browser; the generated file is not uploaded or persisted by this workflow.',
  ],
}

export const PUBLIC_PAGES = {
  '/status': {
    title: 'System Status',
    summary: 'CloudNotify does not currently publish a live system monitoring or uptime feed on this page.',
    sections: [
      { heading: 'Live status unavailable', body: 'No live status data is connected here, so this page does not report service health, incidents or uptime.' },
      { heading: 'Need help?', body: 'Visit Support for the currently available support information.' },
    ],
  },
  '/support': {
    title: 'Support',
    summary: 'Support contact details and a support request service are not configured for this public page.',
    sections: [
      { heading: 'Contact information', body: 'No support email address or contact destination is configured in the application. We have not provided a form that could suggest a request was submitted.' },
      { heading: 'Self-service help', body: 'Browse the public documentation for guides to notifications, channels and Bulk Delivery.' },
    ],
  },
  '/changelog': {
    title: 'Changelog',
    summary: 'There are no verified, published release notes configured for this page.',
    sections: [
      { heading: 'Release notes', body: 'No release history is available to display here yet.' },
    ],
  },
  '/roadmap': {
    title: 'Roadmap',
    summary: 'There are no verified, published roadmap items configured for this page.',
    sections: [
      { heading: 'Upcoming work', body: 'This page does not announce or promise planned features. Check the documentation for the current availability of specific features.' },
    ],
  },
  '/about': {
    title: 'About CloudNotify',
    summary: 'CloudNotify is a notification management application for scheduling messages through supported channels.',
    sections: [
      { heading: 'What the app supports', body: 'The current application includes scheduled notifications through Gmail and Telegram, notification history, profile and settings pages, and a Bulk Delivery campaign draft workflow.' },
      { heading: 'Bulk Delivery availability', body: 'Bulk Delivery supports campaign drafts, CSV validation, template previews and personalized PDF downloads. Campaign message sending, approval and delivery tracking are not available in this phase.' },
    ],
  },
}

export const LEGAL_LAST_UPDATED = 'November 3, 2026'

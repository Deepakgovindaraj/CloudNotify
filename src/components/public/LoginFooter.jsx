import { Cloud, HeartPulse } from 'lucide-react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '@/constants/config'

const footerGroups = [
  {
    title: 'Product',
    links: [
      ['Features', '/docs/features'],
      ['How It Works', '/docs/how-it-works'],
      ['Changelog', '/changelog'],
      ['Roadmap', '/roadmap'],
      ['System Status', '/status'],
    ],
  },
  {
    title: 'Documentation',
    links: [
      ['Documentation Home', '/docs'],
      ['Getting Started', '/docs/introduction'],
      ['User Guide', '/docs/creating-notifications'],
      ['Gmail Integration', '/docs/gmail-integration'],
      ['Telegram Integration', '/docs/telegram-integration'],
      ['Bulk Mail & Document Delivery', '/docs/bulk-mail-integration'],
      ['WhatsApp Integration', '/docs/whatsapp-manual'],
      ['FAQs', '/docs/faqs'],
      ['Troubleshooting', '/docs/troubleshooting'],
    ],
  },
  {
    title: 'Developers',
    links: [
      ['API Documentation', '/docs/api-overview'],
      ['API Reference', '/docs/api-reference'],
      ['Authentication Guide', '/docs/authentication'],
      ['Webhooks', '/docs/webhooks'],
      ['Integration Guide', '/docs/integration-examples'],
      ['Security Documentation', '/legal/security'],
    ],
  },
  {
    title: 'Legal & Support',
    links: [
      ['Terms of Service', '/legal/terms'],
      ['Privacy Policy', '/legal/privacy'],
      ['Cookie Policy', '/legal/cookies'],
      ['Acceptable Use Policy', '/legal/acceptable-use'],
      ['Data Processing Agreement', '/legal/data-processing'],
      ['Data Retention Policy', '/legal/data-retention'],
      ['Contact Support', '/support'],
      ['Report a Security Issue', '/legal/security'],
    ],
  },
]

export function LoginFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.09] bg-[#0B0912] text-[#F5F3FA]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-14 sm:grid-cols-2 sm:px-10 lg:grid-cols-[1.15fr_1fr_1.15fr_1fr] lg:gap-9 lg:py-16">
        {footerGroups.map((group, index) => (
          <section key={group.title} aria-labelledby={`footer-${index}`}>
            {index === 0 ? (
              <>
                <Link to="/auth" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B56CFF]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.07] text-[#D8C6FF]">
                    <Cloud className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-lg font-semibold">{APP_NAME}</span>
                </Link>
                <p className="mt-4 text-sm font-medium text-white/75">
                  Intelligent Notifications. Smarter Communication.
                </p>
                <p className="mt-3 max-w-xs text-sm leading-6 text-white/50">
                  Manage notifications, automate communication and deliver personalized business documents through one unified platform.
                </p>
              </>
            ) : (
              <h2 id={`footer-${index}`} className="mb-5 text-sm font-semibold tracking-wide text-white">
                {group.title}
              </h2>
            )}
            {index === 0 && (
              <h2 id={`footer-${index}`} className="mb-4 mt-8 text-sm font-semibold tracking-wide text-white">
                {group.title}
              </h2>
            )}
            <ul className="space-y-2.5">
              {group.links.map(([label, to]) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-sm leading-5 text-white/50 transition-colors duration-200 hover:text-[#D8C6FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B56CFF]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 text-xs text-white/45 sm:px-10 md:flex-row md:items-center md:justify-between">
          <p>© 2026 {APP_NAME}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link to="/support" className="transition-colors hover:text-white">Contact Us</Link>
            <Link to="/status" className="inline-flex items-center gap-2 transition-colors hover:text-white">
              <HeartPulse className="h-3.5 w-3.5 text-[#B56CFF]" aria-hidden="true" />
              System Status
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

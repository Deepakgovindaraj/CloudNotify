import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, Cloud, Menu, Search, X } from 'lucide-react'
import { APP_NAME } from '@/constants/config'
import {
  DOC_ARTICLES,
  DOC_GROUPS,
  GUIDES,
  LEGAL_LAST_UPDATED,
  LEGAL_PAGES,
  LEGAL_RELATED_LINKS,
  PUBLIC_PAGES,
} from '@/data/publicContent'

const pageStyles = {
  shell: 'min-h-screen bg-[#0d0b12] text-[#f5f3fa]',
  link: 'text-[#c4a7ff] transition-colors hover:text-white',
  panel: 'rounded-2xl border border-white/[0.09] bg-white/[0.025]',
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function PageHeader() {
  return (
    <header className="border-b border-white/[0.08]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/auth" className="inline-flex items-center gap-3 font-display text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#c4a7ff]">
            <Cloud className="h-5 w-5" aria-hidden="true" />
          </span>
          {APP_NAME}
        </Link>
        <Link to="/auth" className={`text-sm ${pageStyles.link}`}>Sign in</Link>
      </div>
    </header>
  )
}

function DocumentationSidebar({ activeSlug, isHome, search, setSearch, mobileOpen, setMobileOpen }) {
  const groups = useMemo(() => DOC_GROUPS.map((group) => ({
    ...group,
    articles: group.articles.filter((article) =>
      `${article.title} ${article.summary}`.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((group) => group.articles.length), [search])

  return (
    <>
      <button
        type="button"
        className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/75 lg:hidden"
        aria-expanded={mobileOpen}
        aria-controls="docs-sidebar"
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        {mobileOpen ? 'Close contents' : 'Browse documentation'}
      </button>
      <aside
        id="docs-sidebar"
        className={`${pageStyles.panel} ${mobileOpen ? 'block' : 'hidden'} max-h-[75vh] overflow-y-auto p-4 lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)]`}
      >
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search documentation"
            aria-label="Search documentation"
            className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#7950F2]/70"
          />
        </label>
        <Link
          to="/docs"
          onClick={() => setMobileOpen(false)}
          aria-current={isHome ? 'page' : undefined}
          className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isHome ? 'bg-[#7950F2]/15 text-[#D8C6FF]' : 'text-white/65 hover:bg-white/[0.05] hover:text-white'}`}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Documentation Home
        </Link>
        <nav className="mt-4 space-y-5" aria-label="Documentation navigation">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                {group.title}
              </h2>
              <ul className="mt-2 space-y-0.5">
                {group.articles.map((article) => (
                  <li key={article.slug}>
                    <Link
                      to={`/docs/${article.slug}`}
                      onClick={() => setMobileOpen(false)}
                      aria-current={activeSlug === article.slug ? 'page' : undefined}
                      className={`block rounded-lg px-3 py-2 text-[13px] leading-5 transition-colors ${activeSlug === article.slug ? 'bg-[#7950F2]/15 text-[#D8C6FF]' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'}`}
                    >
                      {article.title}
                      {article.comingSoon && <span className="ml-1.5 text-[10px] text-white/35">Soon</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {!groups.length && <p className="px-3 py-5 text-sm text-white/45">No guides match that search.</p>}
        </nav>
      </aside>
    </>
  )
}

function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-7 text-xs text-white/40">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.to ? <Link className={pageStyles.link} to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function DocumentationPage({ slug }) {
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentIndex = DOC_ARTICLES.findIndex((article) => article.slug === slug)
  const article = DOC_ARTICLES[currentIndex]
  const activeArticle = article || DOC_ARTICLES[0]
  const steps = GUIDES[activeArticle.slug]
  const sections = [
    { heading: 'Overview', body: activeArticle.summary },
    ...(steps ? [{ heading: 'In this guide', steps }] : []),
    ...(activeArticle.comingSoon ? [{ heading: 'Availability', body: 'This feature or public documentation is not available in the current application. This page describes its current status and does not imply that it is supported.' }] : []),
  ]
  const previous = currentIndex > 0 ? DOC_ARTICLES[currentIndex - 1] : null
  const next = currentIndex >= 0 && currentIndex < DOC_ARTICLES.length - 1
    ? DOC_ARTICLES[currentIndex + 1]
    : null

  return (
    <div className={pageStyles.shell}>
      <PageHeader />
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[270px_minmax(0,1fr)]">
          <DocumentationSidebar
            activeSlug={article ? activeArticle.slug : null}
            isHome={slug === null}
            search={search}
            setSearch={setSearch}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
          />
          <article className="min-w-0">
            <Breadcrumbs items={[
              { label: 'Documentation', to: '/docs' },
              ...(article ? [{ label: article.category, to: `/docs/${DOC_GROUPS.find((group) => group.title === article.category)?.articles[0]?.slug}` }] : []),
              { label: article ? article.title : 'Home' },
            ]} />
            {article ? (
              <>
                <p className="text-sm font-medium text-[#B56CFF]">{article.category}</p>
                <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{article.title}</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-white/60">{article.summary}</p>
                {article.comingSoon && (
                  <p className="mt-6 inline-flex rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-3 py-1 text-xs font-medium text-amber-100/80">
                    Not available in the current application
                  </p>
                )}
                {sections.length > 1 && (
                  <nav className={`${pageStyles.panel} mt-8 p-5`} aria-label="On this page">
                    <h2 className="text-sm font-semibold">On this page</h2>
                    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      {sections.map((section) => (
                        <li key={section.heading}><a className={pageStyles.link} href={`#${slugify(section.heading)}`}>{section.heading}</a></li>
                      ))}
                    </ul>
                  </nav>
                )}
                <div className="mt-9 space-y-8">
                  {sections.map((section) => (
                    <section key={section.heading} id={slugify(section.heading)} className="scroll-mt-8">
                      <h2 className="font-display text-xl font-semibold">{section.heading}</h2>
                      {section.body && <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65">{section.body}</p>}
                      {section.steps && (
                        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-white/65 marker:text-[#B56CFF]">
                          {section.steps.map((step) => <li key={step}>{step}</li>)}
                        </ol>
                      )}
                    </section>
                  ))}
                </div>
                <nav className="mt-12 grid gap-3 border-t border-white/[0.08] pt-6 sm:grid-cols-2" aria-label="Article navigation">
                  {previous ? (
                    <Link to={`/docs/${previous.slug}`} className={`${pageStyles.panel} p-4 transition-colors hover:border-[#7950F2]/40`}>
                      <span className="flex items-center gap-2 text-xs text-white/40"><ArrowLeft className="h-3.5 w-3.5" />Previous</span>
                      <span className="mt-2 block text-sm font-medium">{previous.title}</span>
                    </Link>
                  ) : <span />}
                  {next && (
                    <Link to={`/docs/${next.slug}`} className={`${pageStyles.panel} p-4 text-left transition-colors hover:border-[#7950F2]/40 sm:text-right`}>
                      <span className="flex items-center justify-end gap-2 text-xs text-white/40">Next<ArrowRight className="h-3.5 w-3.5" /></span>
                      <span className="mt-2 block text-sm font-medium">{next.title}</span>
                    </Link>
                  )}
                </nav>
              </>
            ) : slug === null ? (
              <>
                <p className="text-sm font-medium text-[#B56CFF]">Public documentation</p>
                <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Documentation Home</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-white/60">
                  Browse guides for current CloudNotify features. Items marked Soon are unavailable or do not have public developer documentation yet.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {DOC_GROUPS.map((group) => (
                    <section key={group.title} className={`${pageStyles.panel} p-5`}>
                      <h2 className="font-display text-lg font-semibold">{group.title}</h2>
                      <ul className="mt-3 space-y-2">
                        {group.articles.slice(0, 4).map((item) => (
                          <li key={item.slug}><Link className={`text-sm ${pageStyles.link}`} to={`/docs/${item.slug}`}>{item.title}</Link></li>
                        ))}
                      </ul>
                      <Link className="mt-4 inline-block text-xs text-white/45 hover:text-white" to={`/docs/${group.articles[0].slug}`}>
                        Browse category
                      </Link>
                    </section>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[#B56CFF]">Documentation</p>
                <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Guide not found</h1>
                <p className="mt-4 text-base leading-7 text-white/60">This documentation page is not available. Browse the documentation index to find a guide.</p>
                <Link to="/docs" className={`mt-6 inline-flex items-center gap-2 text-sm ${pageStyles.link}`}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Documentation Home
                </Link>
              </>
            )}
          </article>
        </div>
      </main>
    </div>
  )
}

function LegalPage({ slug }) {
  const page = LEGAL_PAGES[slug]
  const securityPage = slug === 'security'
  return (
    <div className={pageStyles.shell}>
      <PageHeader />
      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
        <Breadcrumbs items={[{ label: 'Home', to: '/auth' }, { label: 'Legal' }, { label: page.title }]} />
        <p className="text-sm font-medium text-[#B56CFF]">{securityPage ? 'Security' : 'Legal information'}</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{page.title}</h1>
        <p className="mt-3 text-sm text-white/40">Last updated: {LEGAL_LAST_UPDATED}</p>
        <div className="mt-8 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-5 text-sm leading-7 text-amber-50/80">
          <strong className="font-semibold text-amber-100">Pending review.</strong>{' '}
          This page is a draft and has not been approved for legal or security reliance. It intentionally does not state unverified company details, policies, certifications, contact information or data practices.
        </div>
        <section className={`${pageStyles.panel} mt-8 p-6 sm:p-8`}>
          <h2 className="font-display text-xl font-semibold">Review status</h2>
          <p className="mt-3 text-sm leading-7 text-white/65">{page.summary}</p>
          <p className="mt-4 text-sm leading-7 text-white/65">
            The final {page.title.toLowerCase()} requires review and approval before it can describe CloudNotify’s obligations or practices. Do not treat this draft as an agreement, notice, certification or security-reporting channel.
          </p>
          {securityPage && (
            <p className="mt-4 text-sm leading-7 text-white/65">
              A dedicated security-reporting contact is not configured on this page. No issue-report submission is accepted here.
            </p>
          )}
        </section>
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">Related pages</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {LEGAL_RELATED_LINKS.filter(([, path]) => path !== `/legal/${slug}`).map(([label, path]) => (
              <li key={path}><Link className={`${pageStyles.panel} block px-4 py-3 text-sm ${pageStyles.link}`} to={path}>{label}</Link></li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

function PublicLandingPage({ page }) {
  return (
    <div className={pageStyles.shell}>
      <PageHeader />
      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
        <Breadcrumbs items={[{ label: 'Home', to: '/auth' }, { label: page.title }]} />
        <p className="text-sm font-medium text-[#B56CFF]">CloudNotify</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{page.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/60">{page.summary}</p>
        <div className="mt-9 space-y-4">
          {page.sections.map((section) => (
            <section key={section.heading} className={`${pageStyles.panel} p-6 sm:p-8`}>
              <h2 className="font-display text-lg font-semibold">{section.heading}</h2>
              <p className="mt-3 text-sm leading-7 text-white/60">{section.body}</p>
            </section>
          ))}
        </div>
        <Link to="/docs" className={`mt-8 inline-flex items-center gap-2 text-sm ${pageStyles.link}`}>
          <BookOpen className="h-4 w-4" aria-hidden="true" /> Browse documentation
        </Link>
      </main>
    </div>
  )
}

export function PublicInfoPage() {
  const { pathname } = useLocation()
  if (pathname === '/docs' || pathname.startsWith('/docs/')) {
    const slug = pathname === '/docs' ? null : pathname.slice('/docs/'.length)
    return <DocumentationPage slug={slug} />
  }
  if (pathname.startsWith('/legal/')) {
    const slug = pathname.slice('/legal/'.length)
    if (LEGAL_PAGES[slug]) return <LegalPage slug={slug} />
    return <PublicLandingPage page={{ title: 'Page not found', summary: 'This public information page is not available.', sections: [] }} />
  }
  const page = PUBLIC_PAGES[pathname]
  if (page) return <PublicLandingPage page={page} />
  return <PublicLandingPage page={{ title: 'Page not found', summary: 'This public information page is not available.', sections: [] }} />
}

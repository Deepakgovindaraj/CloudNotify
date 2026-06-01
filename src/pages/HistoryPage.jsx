import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { StatusBadge, ChannelBadge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { TableRowSkeleton } from '@/components/ui/Skeleton'
import { formatDate, formatNotificationTime } from '@/utils/formatters'
import { STATUS_OPTIONS } from '@/constants/config'

const PAGE_SIZE = 5
export function HistoryPage() {
  const { notifications, loading, error, refetch, deleteNotification } = useNotifications()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    let list = [...notifications]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (n) =>
          (n.title || '').toLowerCase().includes(q) ||
          (n.message || '').toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter(
        (n) =>
          (n.status || '').toLowerCase() === statusFilter.toLowerCase()
      )
    }
    list.sort((a, b) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [notifications, search, statusFilter, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
  
    setDeleting(true)
  
    await deleteNotification(deleteTarget.notificationId)
  
    await refetch()
  
    setDeleting(false)
    setDeleteTarget(null)
  }

  if (error === 'network') return <ErrorState onRetry={refetch} />

  const statusOptions = STATUS_OPTIONS.map((s) => ({
    value: s,
    label: s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1),
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">Notification History</h1>
        <p className="text-slate-500 text-sm mt-1">View and manage all scheduled notifications.</p>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          options={statusOptions}
          className="sm:w-40"
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                {[
                  { key: 'title', label: 'Title' },
                  { key: null, label: 'Message' },
                  { key: 'channel', label: 'Channel' },
                  { key: 'date', label: 'Date' },
                  { key: 'time', label: 'Time' },
                  { key: 'status', label: 'Status' },
                  { key: null, label: '' },
                ].map((col) => (
                  <th key={col.label} className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                    {col.key ? (
                      <button
                        onClick={() => toggleSort(col.key)}
                        className="flex items-center gap-1 hover:text-primary-600"
                      >
                        {col.label}
                        {sortKey === col.key &&
                          (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : paginated.length ? (
                paginated.map((n) => (
                  <tr
                    key={n.notificationId}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{n.title}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{n.message}</td>
                    <td className="px-4 py-3"><ChannelBadge channel={n.channel} /></td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(n.date)}</td>
                    <td className="px-4 py-3 text-slate-500">{n.time}</td>
                    <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteTarget(n)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <EmptyState variant={search || statusFilter !== 'all' ? 'search' : 'notifications'} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Notification?"
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      >
        Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
      </Modal>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpDown,
  ChevronRight,
  FolderOpen,
  House,
  LayoutGrid,
  LayoutList,
  Search,
  Server,
  Settings,
  SortAsc,
  SortDesc,
  X,
} from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import { FileIcon } from '@/components/autoindex/FileIcon'
import { SettingsSheet } from '@/components/autoindex/SettingsSheet'
import {
  type Entry,
  type BreadcrumbSegment,
  parseAutoindex,
  parseMtime,
  pathSegments,
  parentHref,
} from '@/lib/parser'
import type { SortKey, SortDir, ViewMode, Theme, Palette } from '@/lib/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMtime(mtime: string): string {
  const d = parseMtime(mtime)
  if (!d) return mtime
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSizeBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

function sortEntries(entries: Entry[], key: SortKey, dir: SortDir): Entry[] {
  const sorted = [...entries].sort((a, b) => {
    // Directories always float to the top
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1

    if (key === 'type') return a.name.localeCompare(b.name)

    let cmp = 0
    if (key === 'name') {
      cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    } else if (key === 'mtime') {
      const da = parseMtime(a.mtime)?.getTime() ?? 0
      const db = parseMtime(b.mtime)?.getTime() ?? 0
      cmp = da - db
    } else if (key === 'size') {
      cmp = (a.rawSize ?? -1) - (b.rawSize ?? -1)
    }

    return dir === 'asc' ? cmp : -cmp
  })

  return sorted
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SortButtonProps {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
  className?: string
}

function SortButton({ label, sortKey, current, dir, onSort, className }: SortButtonProps) {
  const active = current === sortKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-xs font-medium select-none hover:text-foreground transition-colors ${
        active ? 'text-foreground' : 'text-muted-foreground'
      } ${className ?? ''}`}
    >
      {label}
      {active ? (
        dir === 'asc' ? <SortAsc className="size-3.5" /> : <SortDesc className="size-3.5" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-40" />
      )}
    </button>
  )
}

interface FileRowProps {
  entry: Entry
  showSize?: boolean
}

function FileRow({ entry, showSize = true }: FileRowProps) {
  return (
    <a
      href={entry.href}
      className="group flex items-center gap-3 px-4 py-2.5 rounded-md hover:bg-muted/60 transition-colors text-sm no-underline"
    >
      <FileIcon
        name={entry.name}
        isDir={entry.type === 'directory'}
        className="size-4.5 shrink-0"
        strokeWidth={1.5}
      />
      <span className="flex-1 truncate text-foreground group-hover:text-primary font-normal">
        {entry.name}
        {entry.type === 'directory' && (
          <span className="text-muted-foreground ml-0.5">/</span>
        )}
      </span>
      <span className="hidden sm:block w-44 text-right text-muted-foreground text-xs shrink-0">
        {formatMtime(entry.mtime)}
      </span>
      {showSize && (
        <span className="hidden md:block w-20 text-right text-muted-foreground text-xs shrink-0">
          {entry.type === 'directory'
            ? '—'
            : entry.rawSize != null
            ? formatSizeBytes(entry.rawSize)
            : (entry.size ?? '—')}
        </span>
      )}
    </a>
  )
}

interface FileCardProps {
  entry: Entry
}

function FileCard({ entry }: FileCardProps) {
  return (
    <a
      href={entry.href}
      className="group flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-ring/40 hover:bg-muted/40 transition-all text-center no-underline"
    >
      <FileIcon
        name={entry.name}
        isDir={entry.type === 'directory'}
        className="size-8 shrink-0"
        strokeWidth={1.5}
      />
      <span className="text-xs text-foreground font-normal w-full truncate group-hover:text-primary leading-snug">
        {entry.name}
        {entry.type === 'directory' && (
          <span className="text-muted-foreground">/</span>
        )}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {entry.type === 'directory'
          ? 'Folder'
          : entry.rawSize != null
          ? formatSizeBytes(entry.rawSize)
          : (entry.size ?? '—')}
      </span>
    </a>
  )
}

interface BreadcrumbNavProps {
  segments: BreadcrumbSegment[]
}

function BreadcrumbNav({ segments }: BreadcrumbNavProps) {
  return (
    <nav aria-label="Directory path" className="flex items-center gap-1 flex-wrap">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1
        return (
          <span key={seg.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0" />}
            {isLast ? (
              <span className="text-sm font-medium text-foreground">
                {i === 0 ? <House className="size-3.5" /> : seg.label}
              </span>
            ) : (
              <a
                href={seg.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors no-underline"
              >
                {i === 0 ? <House className="size-3.5" /> : seg.label}
              </a>
            )}
          </span>
        )
      })}
    </nav>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [path, setPath] = useState('/')
  const [loaded, setLoaded] = useState(false)

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [view, setView] = useState<ViewMode>('list')

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('sandrone-theme') as Theme) ?? 'dark'
    } catch {
      return 'dark'
    }
  })

  const [palette, setPalette] = useState<Palette>(() => {
    try {
      return (localStorage.getItem('sandrone-palette') as Palette) ?? 'neutral'
    } catch {
      return 'neutral'
    }
  })

  const [bgBrightness, setBgBrightness] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('sandrone-bg-brightness')
      return stored ? Number(stored) : 70
    } catch {
      return 70
    }
  })

  const [settingsOpen, setSettingsOpen] = useState(false)

  // Parse the native nginx autoindex markup on first render
  useEffect(() => {
    const parsed = parseAutoindex(document)
    if (parsed) {
      setEntries(parsed.entries)
      setPath(parsed.path)
    }
    setLoaded(true)
  }, [])

  // Sync theme class to <html> and persist to localStorage
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('sandrone-theme', theme)
    } catch {}
  }, [theme])

  // Sync palette class to <html> and persist to localStorage
  useEffect(() => {
    const el = document.documentElement
    // Remove any existing palette- classes
    const toRemove = [...el.classList].filter(cls => cls.startsWith('palette-'))
    toRemove.forEach(cls => el.classList.remove(cls))
    if (palette !== 'neutral') {
      el.classList.add(`palette-${palette}`)
    }
    try {
      localStorage.setItem('sandrone-palette', palette)
    } catch {}
  }, [palette])

  // Auto-switch to dark when Sandrone palette is selected
  useEffect(() => {
    if (palette === 'sandrone' && theme !== 'dark') {
      setTheme('dark')
    }
  }, [palette])  // eslint-disable-line react-hooks/exhaustive-deps

  // Sync bg brightness CSS var to <html> and persist
  useEffect(() => {
    document.documentElement.style.setProperty('--bg-brightness', (bgBrightness / 100).toFixed(2))
    try {
      localStorage.setItem('sandrone-bg-brightness', String(bgBrightness))
    } catch {}
  }, [bgBrightness])

  const segments = useMemo(() => pathSegments(path), [path])

  // Hide the internal /_autoindex/ assets folder at the root listing only
  const visibleEntries = useMemo(() => {
    if (path !== '/') return entries
    return entries.filter(e => !(e.type === 'directory' && e.name === '_autoindex'))
  }, [entries, path])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? visibleEntries.filter(e => e.name.toLowerCase().includes(q)) : visibleEntries
  }, [visibleEntries, search])

  const sorted = useMemo(() => sortEntries(filtered, sortKey, sortDir), [filtered, sortKey, sortDir])

  const dirCount = useMemo(() => visibleEntries.filter(e => e.type === 'directory').length, [visibleEntries])
  const fileCount = useMemo(() => visibleEntries.filter(e => e.type === 'file').length, [visibleEntries])
  const totalBytes = useMemo(
    () => visibleEntries.reduce((acc, e) => acc + (e.rawSize ?? 0), 0),
    [visibleEntries]
  )

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const isRoot = path === '/' || path === ''
  const upHref = isRoot ? null : parentHref(path)

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <span className="text-sm text-muted-foreground animate-pulse">Loading…</span>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="autoindex-app min-h-screen bg-background text-foreground flex flex-col">

        {/* ── Top bar ── */}
        <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">

            {/* Branding */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Server className="size-4.5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-sm font-semibold tracking-tight text-foreground hidden sm:block">
                Sandrone
              </span>
            </div>

            {/* Breadcrumb */}
            <div className="flex-1 min-w-0 hidden md:block">
              <BreadcrumbNav segments={segments} />
            </div>

            {/* Search */}
            <div className="relative flex-1 md:max-w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter files…"
                className="pl-8 h-8 text-sm bg-muted/40 border-input/60 focus-visible:bg-background"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Sort (mobile/compact) */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8 shrink-0 md:hidden')}
                    />
                  }
                >
                  <ArrowUpDown className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Sort</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuRadioGroup value={sortKey} onValueChange={v => setSortKey(v as SortKey)}>
                  <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="mtime">Modified</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="type">Type</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings button — always visible */}
            <Tooltip>
              <TooltipTrigger
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8 shrink-0')}
                onClick={() => setSettingsOpen(true)}
                aria-label="Open settings"
              >
                <Settings className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>

          </div>

          {/* Mobile breadcrumb */}
          <div className="md:hidden px-4 py-2">
            <BreadcrumbNav segments={segments} />
          </div>
        </header>

        {/* ── Display controls bar ── */}
        <div className="controls-bar border-b border-border bg-background/80 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 h-10 flex items-center gap-4">

            {/* View toggle */}
            <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
              <Tooltip>
                <TooltipTrigger
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon' }),
                    'size-8',
                    view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground',
                  )}
                  onClick={() => setView('list')}
                  aria-label="List view"
                >
                  <LayoutList className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>List view</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon' }),
                    'size-8',
                    view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground',
                  )}
                  onClick={() => setView('grid')}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Grid view</TooltipContent>
              </Tooltip>
            </div>

          </div>
        </div>

        {/* ── Main content ── */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4">

          {/* "Go up" row */}
          {upHref && (
            <a
              href={upHref}
              className="flex items-center gap-3 px-4 py-2.5 rounded-md hover:bg-muted/60 transition-colors text-sm no-underline mb-1"
            >
              <FolderOpen className="size-4.5 text-yellow-400/90 shrink-0" strokeWidth={1.5} />
              <span className="text-muted-foreground">..</span>
            </a>
          )}

          {/* List view column headers */}
          {view === 'list' && sorted.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-1.5 mb-0.5">
              <span className="w-4.5 shrink-0" />
              <SortButton
                label="Name"
                sortKey="name"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="flex-1"
              />
              <SortButton
                label="Modified"
                sortKey="mtime"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="hidden sm:flex w-44 justify-end"
              />
              <SortButton
                label="Size"
                sortKey="size"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="hidden md:flex w-20 justify-end"
              />
            </div>
          )}

          {/* Empty / no-results state */}
          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <FolderOpen className="size-10 opacity-30" strokeWidth={1} />
              <p className="text-sm">
                {search ? `No files match "${search}"` : 'This directory is empty'}
              </p>
              {search && (
                <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
                  Clear filter
                </Button>
              )}
            </div>
          )}

          {/* File listing */}
          {view === 'list' ? (
            <div className="flex flex-col gap-px">
              {sorted.map(entry => (
                <FileRow key={entry.href} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {sorted.map(entry => (
                <FileCard key={entry.href} entry={entry} />
              ))}
            </div>
          )}

        </main>

        {/* ── Status bar ── */}
        <footer className="border-t border-border bg-background/80 backdrop-blur">
          <div className="relative max-w-7xl mx-auto px-4 min-h-9 py-2 h-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{dirCount} folder{dirCount !== 1 ? 's' : ''}</span>
            <Separator orientation="vertical" className="h-3" />
            <span>{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
            {totalBytes > 0 && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span>{formatSizeBytes(totalBytes)} total</span>
              </>
            )}
            {search && filtered.length !== visibleEntries.length && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span className="text-foreground/70">{sorted.length} shown</span>
              </>
            )}

            {/* Center credit */}
            <span className="absolute left-1/2 -translate-x-1/2 text-muted-foreground/50 whitespace-nowrap">
              Powered by{' '}
              <a
                href="https://github.com/teppyboy/sandrone-autoindex"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground/70 hover:text-foreground transition-colors no-underline"
              >
                Sandrone-AutoIndex
              </a>
            </span>
          </div>
        </footer>

      </div>

      {/* Settings sheet — rendered outside main div so it can portal freely */}
      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={theme}
        onThemeChange={setTheme}
        palette={palette}
        onPaletteChange={setPalette}
        bgBrightness={bgBrightness}
        onBgBrightnessChange={setBgBrightness}
      />
    </TooltipProvider>
  )
}

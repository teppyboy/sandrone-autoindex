import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpDown,
  ChevronRight,
  FolderOpen,
  House,
  Search,
  Server,
  Settings,
  SortAsc,
  SortDesc,
  X,
} from 'lucide-react'

import { FileIcon } from '@/components/autoindex/FileIcon'
import { MobileSearchSheet } from '@/components/autoindex/MobileSearchSheet'
import { SettingsSheet } from '@/components/autoindex/SettingsSheet'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  type BreadcrumbSegment,
  type Entry,
  parseAutoindex,
  parseMtime,
  parentHref,
  pathSegments,
} from '@/lib/parser'
import type { Palette, SortDir, SortKey, Theme, ViewMode } from '@/lib/types'
import { useIsMobile } from '@/lib/useIsMobile'
import { cn } from '@/lib/utils'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'mtime', label: 'Modified' },
  { value: 'size', label: 'Size' },
  { value: 'type', label: 'Type' },
]

function formatMtime(mtime: string): string {
  const date = parseMtime(mtime)
  if (!date) return mtime

  return date.toLocaleString(undefined, {
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
  return [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    if (key === 'type') return a.name.localeCompare(b.name)

    let comparison = 0

    if (key === 'name') {
      comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    } else if (key === 'mtime') {
      const aTime = parseMtime(a.mtime)?.getTime() ?? 0
      const bTime = parseMtime(b.mtime)?.getTime() ?? 0
      comparison = aTime - bTime
    } else if (key === 'size') {
      comparison = (a.rawSize ?? -1) - (b.rawSize ?? -1)
    }

    return dir === 'asc' ? comparison : -comparison
  })
}

function getSortLabel(sortKey: SortKey): string {
  return SORT_OPTIONS.find(option => option.value === sortKey)?.label ?? 'Name'
}

function readStoredNumber(key: string, fallback: number): number {
  try {
    const stored = localStorage.getItem(key)
    const parsed = stored == null ? NaN : Number(stored)
    return Number.isFinite(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function readStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem('sandrone-view')
    return stored === 'grid' ? 'grid' : 'list'
  } catch {
    return 'list'
  }
}

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
      className={cn(
        'flex items-center gap-1 text-xs font-medium select-none hover:text-foreground transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground',
        className,
      )}
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
  isMobile: boolean
  showSize?: boolean
}

function FileRow({ entry, isMobile, showSize = true }: FileRowProps) {
  const isDirectory = entry.type === 'directory'
  const sizeLabel = isDirectory
    ? null
    : entry.rawSize != null
    ? formatSizeBytes(entry.rawSize)
    : (entry.size ?? null)

  return (
    <a
      href={entry.href}
      className={cn(
        'group flex items-center gap-3 px-4 rounded-md hover:bg-muted/60 transition-colors text-sm no-underline',
        isMobile ? 'py-3' : 'py-2.5',
      )}
    >
      <FileIcon
        name={entry.name}
        isDir={isDirectory}
        className={cn('shrink-0', isMobile ? 'size-5' : 'size-4.5')}
        strokeWidth={1.5}
      />

      <span className="flex-1 min-w-0">
        <span className="block truncate text-foreground group-hover:text-primary font-normal">
          {entry.name}
          {isDirectory && <span className="text-muted-foreground ml-0.5">/</span>}
        </span>

        {isMobile && (
          <span className="mt-0.5 flex items-center gap-1.5 min-w-0 text-[11px] text-muted-foreground">
            {sizeLabel && <span className="shrink-0">{sizeLabel}</span>}
            {sizeLabel && <span className="shrink-0">·</span>}
            <span className="truncate">{formatMtime(entry.mtime)}</span>
          </span>
        )}
      </span>

      {!isMobile && (
        <span className="w-44 shrink-0 text-right text-xs text-muted-foreground">
          {formatMtime(entry.mtime)}
        </span>
      )}

      {!isMobile && showSize && (
        <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
          {isDirectory
            ? '—'
            : entry.rawSize != null
            ? formatSizeBytes(entry.rawSize)
            : (entry.size ?? '—')}
        </span>
      )}

      {isMobile && isDirectory && (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
      )}
    </a>
  )
}

interface FileCardProps {
  entry: Entry
  isMobile: boolean
}

function FileCard({ entry, isMobile }: FileCardProps) {
  return (
    <a
      href={entry.href}
      className={cn(
        'group flex flex-col items-center gap-2 rounded-lg border border-border hover:border-ring/40 hover:bg-muted/40 transition-all text-center no-underline',
        isMobile ? 'p-3' : 'p-4',
      )}
    >
      <FileIcon
        name={entry.name}
        isDir={entry.type === 'directory'}
        className={cn('shrink-0', isMobile ? 'size-7' : 'size-8')}
        strokeWidth={1.5}
      />

      <span
        className={cn(
          'w-full text-xs text-foreground font-normal leading-snug group-hover:text-primary',
          isMobile ? 'line-clamp-2' : 'truncate',
        )}
      >
        {entry.name}
        {entry.type === 'directory' && <span className="text-muted-foreground">/</span>}
      </span>

      <span className="mt-auto text-[10px] text-muted-foreground">
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
  className?: string
}

function BreadcrumbNav({ segments, className }: BreadcrumbNavProps) {
  return (
    <nav aria-label="Directory path" className={cn('flex items-center gap-1', className)}>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1

        return (
          <span key={segment.href} className="flex shrink-0 items-center gap-1">
            {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />}

            {isLast ? (
              <span className="text-sm font-medium text-foreground">
                {index === 0 ? <House className="size-3.5" /> : segment.label}
              </span>
            ) : (
              <a
                href={segment.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground no-underline"
              >
                {index === 0 ? <House className="size-3.5" /> : segment.label}
              </a>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export default function App() {
  const isMobile = useIsMobile()

  const [entries, setEntries] = useState<Entry[]>([])
  const [path, setPath] = useState('/')
  const [loaded, setLoaded] = useState(false)

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [view, setView] = useState<ViewMode>(readStoredViewMode)

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

  const [bgBrightness, setBgBrightness] = useState<number>(() => readStoredNumber('sandrone-bg-brightness', 70))
  const [bgBlur, setBgBlur] = useState<number>(() => readStoredNumber('sandrone-bg-blur', 0))
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const parsed = parseAutoindex(document)
    if (parsed) {
      setEntries(parsed.entries)
      setPath(parsed.path)
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('sandrone-theme', theme)
    } catch {}
  }, [theme])

  useEffect(() => {
    const element = document.documentElement
    const paletteClasses = [...element.classList].filter(className => className.startsWith('palette-'))

    paletteClasses.forEach(className => element.classList.remove(className))

    if (palette !== 'neutral') {
      element.classList.add(`palette-${palette}`)
    }

    try {
      localStorage.setItem('sandrone-palette', palette)
    } catch {}
  }, [palette])

  useEffect(() => {
    if (palette === 'sandrone' && theme !== 'dark') {
      setTheme('dark')
    }
  }, [palette, theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--bg-brightness', (bgBrightness / 100).toFixed(2))
    try {
      localStorage.setItem('sandrone-bg-brightness', String(bgBrightness))
    } catch {}
  }, [bgBrightness])

  useEffect(() => {
    document.documentElement.style.setProperty('--bg-blur', `${bgBlur}px`)
    try {
      localStorage.setItem('sandrone-bg-blur', String(bgBlur))
    } catch {}
  }, [bgBlur])

  useEffect(() => {
    try {
      localStorage.setItem('sandrone-view', view)
    } catch {}
  }, [view])

  useEffect(() => {
    if (!isMobile && mobileSearchOpen) {
      setMobileSearchOpen(false)
    }
  }, [isMobile, mobileSearchOpen])

  const segments = useMemo(() => pathSegments(path), [path])

  const visibleEntries = useMemo(() => {
    if (path !== '/') return entries
    return entries.filter(entry => !(entry.type === 'directory' && entry.name === '_autoindex'))
  }, [entries, path])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? visibleEntries.filter(entry => entry.name.toLowerCase().includes(query)) : visibleEntries
  }, [search, visibleEntries])

  const sorted = useMemo(() => sortEntries(filtered, sortKey, sortDir), [filtered, sortDir, sortKey])

  const dirCount = useMemo(() => visibleEntries.filter(entry => entry.type === 'directory').length, [visibleEntries])
  const fileCount = useMemo(() => visibleEntries.filter(entry => entry.type === 'file').length, [visibleEntries])
  const totalBytes = useMemo(
    () => visibleEntries.reduce((sum, entry) => sum + (entry.rawSize ?? 0), 0),
    [visibleEntries],
  )

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(currentDir => (currentDir === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(key)
    setSortDir('asc')
  }

  const isRoot = path === '/' || path === ''
  const upHref = isRoot ? null : parentHref(path)
  const sortLabel = getSortLabel(sortKey)
  const hasActiveSearch = search.trim().length > 0

  const renderSearchField = (className?: string) => (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Filter files…"
        className="h-8 border-input/60 bg-muted/40 pl-8 text-sm focus-visible:bg-background"
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
  )

  const settingsButton = (
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
  )

  const creditContent = (
    <>
      Powered by{' '}
      <a
        href="https://github.com/teppyboy/sandrone-autoindex"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground/70 transition-colors hover:text-foreground no-underline"
      >
        Sandrone-AutoIndex
      </a>
    </>
  )

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="animate-pulse text-sm text-muted-foreground">Loading…</span>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="autoindex-app flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
          {isMobile ? (
            <>
              <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Server className="size-4.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  <span className="truncate text-sm font-semibold tracking-tight text-foreground">Sandrone</span>
                </div>

                <Tooltip>
                  <TooltipTrigger
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'icon' }),
                      'size-8 shrink-0',
                      hasActiveSearch && 'bg-muted text-foreground',
                    )}
                    onClick={() => setMobileSearchOpen(true)}
                    aria-label="Open search"
                  >
                    <Search className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>Search</TooltipContent>
                </Tooltip>

                {settingsButton}
              </div>

              <div className="breadcrumb-scroll mx-auto max-w-7xl overflow-x-auto pl-5 pr-4 pt-2 pb-3">
                <BreadcrumbNav segments={segments} className="min-w-max flex-nowrap" />
              </div>
            </>
          ) : (
            <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
              <div className="flex shrink-0 items-center gap-2">
                <Server className="size-4.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-sm font-semibold tracking-tight text-foreground">Sandrone</span>
              </div>

              <div className="min-w-0 flex-1">
                <BreadcrumbNav segments={segments} className="flex-wrap" />
              </div>

              {renderSearchField('w-64 shrink-0')}
              {settingsButton}
            </div>
          )}
        </header>

        <div className="controls-bar border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-10 max-w-7xl items-center gap-2.5 px-4">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'gap-1.5 px-2 text-muted-foreground hover:text-foreground',
                )}
              >
                <ArrowUpDown className="size-3.5" />
                <span className="whitespace-nowrap">Sort: {sortLabel}</span>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuRadioGroup
                  value={sortKey}
                  onValueChange={value => {
                    const nextSortKey = value as SortKey
                    if (nextSortKey !== sortKey) {
                      setSortKey(nextSortKey)
                      setSortDir('asc')
                    }
                  }}
                >
                  {SORT_OPTIONS.map(option => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8 shrink-0')}
                onClick={() => setSortDir(currentDir => (currentDir === 'asc' ? 'desc' : 'asc'))}
                aria-label={`Switch to ${sortDir === 'asc' ? 'descending' : 'ascending'} order`}
              >
                {sortDir === 'asc' ? <SortAsc className="size-4" /> : <SortDesc className="size-4" />}
              </TooltipTrigger>
              <TooltipContent>{sortDir === 'asc' ? 'Ascending order' : 'Descending order'}</TooltipContent>
            </Tooltip>

            <div className="flex-1" />

            {isMobile && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {sorted.length} item{sorted.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-4">
          {upHref && (
            <a
              href={upHref}
              className={cn(
                'mb-1 flex items-center gap-3 rounded-md px-4 text-sm transition-colors hover:bg-muted/60 no-underline',
                isMobile ? 'py-3' : 'py-2.5',
              )}
            >
              <FolderOpen
                className={cn('shrink-0 text-yellow-400/90', isMobile ? 'size-5' : 'size-4.5')}
                strokeWidth={1.5}
              />
              <span className="text-muted-foreground">..</span>
            </a>
          )}

          {!isMobile && view === 'list' && sorted.length > 0 && (
            <div className="mb-0.5 flex items-center gap-3 px-4 py-1.5">
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
                className="w-44 justify-end"
              />

              <SortButton
                label="Size"
                sortKey="size"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="w-20 justify-end"
              />
            </div>
          )}

          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
              <FolderOpen className="size-10 opacity-30" strokeWidth={1} />
              <p className="text-sm">{search ? `No files match "${search}"` : 'This directory is empty'}</p>
              {search && (
                <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
                  Clear filter
                </Button>
              )}
            </div>
          )}

          {view === 'list' ? (
            <div className="flex flex-col gap-px">
              {sorted.map(entry => (
                <FileRow key={entry.href} entry={entry} isMobile={isMobile} />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                'grid gap-2',
                isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8',
              )}
            >
              {sorted.map(entry => (
                <FileCard key={entry.href} entry={entry} isMobile={isMobile} />
              ))}
            </div>
          )}
        </main>

        <footer className="border-t border-border bg-background/80 backdrop-blur">
          {isMobile ? (
            <div className="mx-auto flex min-h-9 max-w-7xl items-center justify-center px-4 py-2 text-xs text-muted-foreground">
              <span className="w-full text-center text-muted-foreground/50">{creditContent}</span>
            </div>
          ) : (
            <div className="relative mx-auto flex min-h-9 h-auto max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs text-muted-foreground">
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

              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-muted-foreground/50">
                {creditContent}
              </span>
            </div>
          )}
        </footer>
      </div>

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={theme}
        onThemeChange={setTheme}
        view={view}
        onViewChange={setView}
        palette={palette}
        onPaletteChange={setPalette}
        bgBrightness={bgBrightness}
        onBgBrightnessChange={setBgBrightness}
        bgBlur={bgBlur}
        onBgBlurChange={setBgBlur}
      />

      <MobileSearchSheet
        open={isMobile && mobileSearchOpen}
        onOpenChange={setMobileSearchOpen}
        search={search}
        onSearchChange={setSearch}
      />
    </TooltipProvider>
  )
}

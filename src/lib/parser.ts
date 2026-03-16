export type EntryType = 'directory' | 'file'

export interface Entry {
  /** Decoded filename (no trailing slash) */
  name: string
  /** Raw href attribute from nginx (percent-encoded, dirs have trailing /) */
  href: string
  type: EntryType
  /** "DD-Mon-YYYY HH:MM" as emitted by nginx */
  mtime: string
  /** Human-readable size string (e.g. "234K") or null for directories */
  size: string | null
  /** Numeric bytes estimate for sorting, null for directories */
  rawSize: number | null
}

export interface ParsedIndex {
  path: string
  entries: Entry[]
}

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

/** Parse a nginx mtime string "DD-Mon-YYYY HH:MM" into a Date. */
export function parseMtime(mtime: string): Date | null {
  const m = mtime.match(/^(\d{2})-(\w{3})-(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!m) return null
  const [, day, mon, year, hour, min] = m
  const month = MONTH_MAP[mon]
  if (month === undefined) return null
  return new Date(Number(year), month, Number(day), Number(hour), Number(min))
}

/** Convert a size string like "234K", "1M", "2G", or bare digits into bytes. */
function sizeToBytes(sizeStr: string): number | null {
  const m = sizeStr.match(/^(\d+(?:\.\d+)?)([KMGkmg]?)$/)
  if (!m) return null
  const num = parseFloat(m[1])
  const unit = m[2].toUpperCase()
  const mult: Record<string, number> = { '': 1, K: 1024, M: 1048576, G: 1073741824 }
  return num * (mult[unit] ?? 1)
}

/**
 * Parse the native nginx autoindex HTML from a Document.
 *
 * Nginx emits entries inside a <pre> block. Each entry is an <a> tag
 * followed by a text node containing whitespace + date + size.
 *
 * Example line inside <pre>:
 *   <a href="foo.txt">foo.txt</a>               15-Jan-2024 10:30    234K
 */
export function parseAutoindex(doc: Document = document): ParsedIndex | null {
  const h1 = doc.querySelector<HTMLElement>('body > h1') ?? doc.querySelector<HTMLElement>('h1')
  const pre = doc.querySelector<HTMLElement>('body > pre') ?? doc.querySelector<HTMLElement>('pre')
  if (!h1 || !pre) return null

  const pathMatch = (h1.textContent ?? '').trim().match(/^Index of (.+)$/)
  const path = pathMatch?.[1]?.trim() ?? '/'

  const entries: Entry[] = []

  for (const link of Array.from(pre.querySelectorAll<HTMLAnchorElement>('a'))) {
    const href = link.getAttribute('href') ?? ''
    if (!href || href === '../') continue

    // Decode filename from href; strip trailing slash for display
    const rawName = href.endsWith('/') ? href.slice(0, -1) : href
    let name: string
    try {
      name = decodeURIComponent(rawName)
    } catch {
      name = rawName
    }

    // Text node after </a> contains: padding-spaces + date + size + newline
    const afterText = link.nextSibling?.textContent ?? ''

    // Match "DD-Mon-YYYY HH:MM" then optional whitespace then size/dash
    const lineMatch = afterText.match(
      /(\d{2}-\w{3}-\d{4}\s+\d{2}:\d{2})\s+(-|\d+(?:\.\d+)?[KMGkmg]?)\s*$/m
    )
    const mtime = lineMatch?.[1]?.replace(/\s+/, ' ') ?? '-'
    const rawSizeStr = lineMatch?.[2]?.trim() ?? '-'

    const isDir = href.endsWith('/') || rawSizeStr === '-'
    const type: EntryType = isDir ? 'directory' : 'file'
    const size = isDir ? null : rawSizeStr
    const rawSize = isDir ? null : sizeToBytes(rawSizeStr)

    entries.push({ name, href, type, mtime, size, rawSize })
  }

  return { path, entries }
}

/** Return the parent-directory href given the current path string. */
export function parentHref(path: string): string {
  const parts = path.replace(/\/$/, '').split('/')
  if (parts.length <= 1) return '/'
  parts.pop()
  return parts.join('/') + '/'
}

/** Split a path like "/a/b/c/" into breadcrumb segments. */
export interface BreadcrumbSegment {
  label: string
  href: string
}
export function pathSegments(path: string): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [{ label: 'Root', href: '/' }]
  const parts = path.replace(/^\/|\/$/g, '').split('/').filter(Boolean)
  let href = '/'
  for (const part of parts) {
    href += part + '/'
    segments.push({ label: decodeURIComponent(part), href })
  }
  return segments
}

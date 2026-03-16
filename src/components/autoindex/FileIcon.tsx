import {
  File,
  Folder,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileArchive,
  FileCode2,
  FileSpreadsheet,
  type LucideProps,
} from 'lucide-react'

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'avif'])
const VIDEO_EXTS = new Set(['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'm4v', 'wmv'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'opus', 'wma'])
const DOC_EXTS = new Set(['pdf', 'doc', 'docx', 'odt', 'rtf', 'md', 'txt', 'rst'])
const ARCHIVE_EXTS = new Set(['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar', 'zst', 'lz4'])
const CODE_EXTS = new Set([
  'js', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp',
  'cs', 'rb', 'php', 'swift', 'kt', 'sh', 'bash', 'zsh', 'fish', 'ps1',
  'html', 'css', 'json', 'yaml', 'yml', 'toml', 'xml', 'sql',
])
const SHEET_EXTS = new Set(['xls', 'xlsx', 'ods', 'csv'])

function getExt(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

interface FileIconProps extends LucideProps {
  name: string
  isDir?: boolean
}

export function FileIcon({ name, isDir = false, ...props }: FileIconProps) {
  if (isDir) return <Folder {...props} className={`text-yellow-400/90 ${props.className ?? ''}`} />

  const ext = getExt(name)
  if (IMAGE_EXTS.has(ext))   return <FileImage    {...props} className={`text-pink-400/90 ${props.className ?? ''}`} />
  if (VIDEO_EXTS.has(ext))   return <FileVideo    {...props} className={`text-purple-400/90 ${props.className ?? ''}`} />
  if (AUDIO_EXTS.has(ext))   return <FileAudio    {...props} className={`text-sky-400/90 ${props.className ?? ''}`} />
  if (DOC_EXTS.has(ext))     return <FileText     {...props} className={`text-blue-400/90 ${props.className ?? ''}`} />
  if (ARCHIVE_EXTS.has(ext)) return <FileArchive  {...props} className={`text-orange-400/90 ${props.className ?? ''}`} />
  if (CODE_EXTS.has(ext))    return <FileCode2    {...props} className={`text-green-400/90 ${props.className ?? ''}`} />
  if (SHEET_EXTS.has(ext))   return <FileSpreadsheet {...props} className={`text-emerald-400/90 ${props.className ?? ''}`} />
  return <File {...props} className={`text-zinc-400/90 ${props.className ?? ''}`} />
}

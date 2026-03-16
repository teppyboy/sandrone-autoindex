import { LayoutGrid, LayoutList, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Palette, Theme, ViewMode } from '@/lib/types'
import { useIsMobile } from '@/lib/useIsMobile'

// ─── Palette swatch definitions ──────────────────────────────────────────────

const PALETTES: { id: Palette; label: string; color: string }[] = [
  { id: 'neutral',  label: 'Neutral',  color: 'oklch(0.556 0 0)' },
  { id: 'blue',     label: 'Blue',     color: 'oklch(0.546 0.245 262.881)' },
  { id: 'rose',     label: 'Rose',     color: 'oklch(0.627 0.214 352.58)' },
  { id: 'green',    label: 'Green',    color: 'oklch(0.527 0.154 150.069)' },
  { id: 'orange',   label: 'Orange',   color: 'oklch(0.646 0.222 41.116)' },
  { id: 'purple',   label: 'Purple',   color: 'oklch(0.585 0.233 277.117)' },
  { id: 'sandrone', label: 'Sandrone', color: 'oklch(0.70 0.09 52)' },
]

// ─── Component ───────────────────────────────────────────────────────────────

interface SettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
  view: ViewMode
  onViewChange: (view: ViewMode) => void
  palette: Palette
  onPaletteChange: (palette: Palette) => void
  bgBrightness: number
  onBgBrightnessChange: (value: number) => void
  bgBlur: number
  onBgBlurChange: (value: number) => void
}

export function SettingsSheet({
  open,
  onOpenChange,
  theme,
  onThemeChange,
  view,
  onViewChange,
  palette,
  onPaletteChange,
  bgBrightness,
  onBgBrightnessChange,
  bgBlur,
  onBgBlurChange,
}: SettingsSheetProps) {
  const isMobile = useIsMobile()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          isMobile
            ? 'max-h-[85dvh] rounded-t-2xl overflow-y-auto'
            : 'w-72 sm:max-w-72',
        )}
      >
        {/* Drag handle — mobile only */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20" />
          </div>
        )}

        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-6">

          {/* ── Layout (list / grid) ── */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Layout
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewChange('list')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 h-9 rounded-md border text-sm transition-colors',
                  view === 'list'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-border/60',
                )}
              >
                <LayoutList className="size-3.5" />
                List
              </button>
              <button
                onClick={() => onViewChange('grid')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 h-9 rounded-md border text-sm transition-colors',
                  view === 'grid'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-border/60',
                )}
              >
                <LayoutGrid className="size-3.5" />
                Grid
              </button>
            </div>
          </div>

          {/* ── Appearance (dark / light) ── */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Appearance
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onThemeChange('light')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 h-9 rounded-md border text-sm transition-colors',
                  theme === 'light'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-border/60',
                )}
              >
                <Sun className="size-3.5" />
                Light
              </button>
              <button
                onClick={() => onThemeChange('dark')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 h-9 rounded-md border text-sm transition-colors',
                  theme === 'dark'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-border/60',
                )}
              >
                <Moon className="size-3.5" />
                Dark
              </button>
            </div>
          </div>

          {/* ── Colour palette ── */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Color
            </p>
            <div className="grid grid-cols-4 gap-2">
              {PALETTES.map(p => (
                <button
                  key={p.id}
                  onClick={() => onPaletteChange(p.id)}
                  title={p.label}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2 rounded-lg border text-[11px] transition-colors',
                    palette === p.id
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40',
                  )}
                >
                  <span
                    className="size-5 rounded-full ring-1 ring-black/10 shrink-0"
                    style={{ background: p.color }}
                  />
                  <span className="truncate w-full text-center leading-tight">{p.label}</span>
                </button>
              ))}
            </div>
            {palette === 'sandrone' && (
              <p className="mt-2.5 text-[11px] text-muted-foreground">
                Sandrone activates glassmorphism with the anime background. Dark mode is required.
              </p>
            )}
          </div>

          {/* ── Background brightness (Sandrone only) ── */}
          {palette === 'sandrone' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Background brightness
                  </p>
                  <span className="text-xs tabular-nums text-muted-foreground">{bgBrightness}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={bgBrightness}
                  onChange={e => onBgBrightnessChange(Number(e.target.value))}
                  className="w-full cursor-pointer accent-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Background blur
                  </p>
                  <span className="text-xs tabular-nums text-muted-foreground">{bgBlur}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={16}
                  step={1}
                  value={bgBlur}
                  onChange={e => onBgBlurChange(Number(e.target.value))}
                  className="w-full cursor-pointer accent-primary"
                />
              </div>
            </div>
          )}

        </div>
      </SheetContent>
    </Sheet>
  )
}

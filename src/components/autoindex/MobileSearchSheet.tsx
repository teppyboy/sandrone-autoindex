import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'

interface MobileSearchSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  search: string
  onSearchChange: (value: string) => void
}

export function MobileSearchSheet({
  open,
  onOpenChange,
  search,
  onSearchChange,
}: MobileSearchSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        showCloseButton={false}
        className="rounded-b-2xl px-4 pt-3 pb-4"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                autoFocus
                value={search}
                onChange={event => onSearchChange(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    onOpenChange(false)
                  }
                }}
                placeholder="Filter files..."
                className="h-10 rounded-xl border-input/60 bg-muted/40 pl-9 pr-9 text-sm focus-visible:bg-background"
              />

              {search && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

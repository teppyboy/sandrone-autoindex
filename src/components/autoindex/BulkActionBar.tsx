import { Check, Download, FolderInput, Minus, Trash2, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchMove: () => void;
  onBatchDelete: () => void;
  onDownload: () => void;
  isMobile?: boolean;
  busy?: boolean;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onDeselectAll,
  onBatchMove,
  onBatchDelete,
  onDownload,
  isMobile,
  busy,
}: BulkActionBarProps) {
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <div className="controls-bar border-b border-border bg-primary/5 backdrop-blur">
      <div className="mx-auto flex h-10 max-w-7xl items-center gap-2 px-4">
        {/* Select all checkbox */}
        <button
          type="button"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="flex size-5 shrink-0 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
          aria-label={allSelected ? "Deselect all" : "Select all"}
        >
          {allSelected ? (
            <Check className="size-3" />
          ) : someSelected ? (
            <Minus className="size-3" />
          ) : null}
        </button>

        {/* Count */}
        <span className="shrink-0 text-sm font-medium text-foreground">
          {selectedCount}{" "}
          <span className="text-muted-foreground">of {totalCount}</span>
        </span>

        <div className="flex-1" />

        {/* Move */}
        <Tooltip>
          <TooltipTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: isMobile ? "icon-sm" : "sm" }),
              "shrink-0 gap-1.5",
            )}
            onClick={busy ? undefined : onBatchMove}
            disabled={busy}
          >
            <FolderInput className="size-4" />
            {!isMobile && "Move"}
          </TooltipTrigger>
          <TooltipContent>Move selected</TooltipContent>
        </Tooltip>

        {/* Delete */}
        <Tooltip>
          <TooltipTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: isMobile ? "icon-sm" : "sm" }),
              "shrink-0 gap-1.5 text-destructive hover:text-destructive",
            )}
            onClick={busy ? undefined : onBatchDelete}
            disabled={busy}
          >
            <Trash2 className="size-4" />
            {!isMobile && "Delete"}
          </TooltipTrigger>
          <TooltipContent>Delete selected</TooltipContent>
        </Tooltip>

        {/* Download */}
        <Tooltip>
          <TooltipTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: isMobile ? "icon-sm" : "sm" }),
              "shrink-0 gap-1.5",
            )}
            onClick={busy ? undefined : onDownload}
            disabled={busy}
          >
            <Download className="size-4" />
            {!isMobile && "Download"}
          </TooltipTrigger>
          <TooltipContent>Download selected files</TooltipContent>
        </Tooltip>

        {/* Deselect */}
        <Tooltip>
          <TooltipTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "shrink-0",
            )}
            onClick={onDeselectAll}
            aria-label="Clear selection"
          >
            <X className="size-4" />
          </TooltipTrigger>
          <TooltipContent>Clear selection</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

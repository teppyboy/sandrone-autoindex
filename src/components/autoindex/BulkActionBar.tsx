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
    <div className="controls-bar border-b border-primary/20 bg-primary/8 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-7xl items-center gap-2 px-4">
        {/* Select all checkbox */}
        <button
          type="button"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-background text-primary transition-colors hover:bg-primary/10"
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
          <span className="text-muted-foreground">of {totalCount} selected</span>
        </span>

        <div className="flex-1" />

        {/* Move */}
        <Tooltip>
          <TooltipTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: isMobile ? "icon-sm" : "sm" }),
              "shrink-0 gap-1.5 rounded-full",
            )}
            onClick={busy ? undefined : onBatchMove}
            disabled={busy}
            aria-label="Move selected"
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
              "shrink-0 gap-1.5 rounded-full text-destructive hover:text-destructive",
            )}
            onClick={busy ? undefined : onBatchDelete}
            disabled={busy}
            aria-label="Delete selected"
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
              "shrink-0 gap-1.5 rounded-full",
            )}
            onClick={busy ? undefined : onDownload}
            disabled={busy}
            aria-label="Download selected files"
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
              "shrink-0 rounded-full",
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

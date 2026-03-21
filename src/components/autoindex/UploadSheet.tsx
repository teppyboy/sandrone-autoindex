import { CircleAlert, LoaderCircle, Upload, X } from "lucide-react";
import { useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox, CheckboxLabel } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DestinationPicker } from "@/components/autoindex/DestinationPicker";
import type { Entry } from "@/lib/parser";
import { useIsMobile } from "@/lib/useIsMobile";
import { cn } from "@/lib/utils";
import type { UploadItem } from "@/lib/webdav/types";

interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  actualPath: string;
  items: UploadItem[];
  overwriteExisting: boolean;
  disabled?: boolean;
  busy?: boolean;
  message: string | null;
  currentEntries?: Entry[];
  onOverwriteChange: (checked: boolean) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onRemoveItem: (id: string) => void;
  onRetryItem: (id: string) => void;
  onClearFinished: () => void;
  onUploadAll: () => Promise<void> | void;
  onDestinationChange?: (path: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export function UploadSheet({
  open,
  onOpenChange,
  currentPath,
  actualPath,
  items,
  overwriteExisting,
  disabled = false,
  busy = false,
  message,
  currentEntries,
  onOverwriteChange,
  onFilesSelected,
  onRemoveItem,
  onRetryItem,
  onClearFinished,
  onUploadAll,
  onDestinationChange,
}: UploadSheetProps) {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pendingCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.status === "pending" ||
          item.status === "conflict" ||
          item.status === "error",
      ).length,
    [items],
  );

  const queueContent = (
    <ScrollArea
      className={cn(
        "rounded-xl border border-border bg-muted/20",
        isMobile ? "flex-1 min-h-0" : "h-[min(50vh,26rem)]",
      )}
    >
      <div className="space-y-2 p-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-10 text-center text-muted-foreground">
            <Upload className="size-6 opacity-40" />
            <p className="text-sm">No files selected yet.</p>
          </div>
        ) : (
          items.map((item) => {
            const isBusy =
              item.status === "checking" || item.status === "uploading";
            const progressLabel =
              item.status === "uploading"
                ? `${item.progress}%`
                : item.status;

            return (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-background/70 p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.file.name}
                      </p>
                      <span className="shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">
                        {progressLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatFileSize(item.file.size)}
                    </p>
                    {item.message && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.message}
                      </p>
                    )}
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-200",
                          item.status === "success"
                            ? "bg-green-500/80"
                            : item.status === "error" ||
                                item.status === "conflict"
                              ? "bg-destructive/80"
                              : "bg-primary",
                        )}
                        style={{
                          width: `${item.status === "success" ? 100 : item.progress}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {(item.status === "error" ||
                      item.status === "conflict") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRetryItem(item.id)}
                        disabled={busy}
                      >
                        Retry
                      </Button>
                    )}
                    {!isBusy && item.status !== "success" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                    {isBusy && (
                      <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      className="sr-only"
      onChange={(event) => {
        if (event.target.files) {
          onFilesSelected(event.target.files);
          event.target.value = "";
        }
      }}
    />
  );

  const dropZone = (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={disabled || busy}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/25 px-5 py-6 text-center transition-colors",
        disabled || busy
          ? "cursor-not-allowed opacity-60"
          : "hover:border-primary/40 hover:bg-muted/40 hover:text-foreground",
      )}
    >
      <span className="rounded-full bg-primary/10 p-3 text-primary">
        <Upload className="size-5" />
      </span>
      <span className="text-sm font-medium text-foreground">
        Choose files to upload
      </span>
      <span className="text-xs text-muted-foreground">
        Your sign-in is verified before uploads begin.
      </span>
    </button>
  );

  const overwriteCheckbox = (
    <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
      <Checkbox
        id="webdav-overwrite"
        checked={overwriteExisting}
        onCheckedChange={(checked) => onOverwriteChange(checked === true)}
        disabled={busy}
      />
      <div className="space-y-1">
        <CheckboxLabel
          htmlFor="webdav-overwrite"
          className="block font-medium"
        >
          Overwrite existing files
        </CheckboxLabel>
        <p className="text-xs leading-relaxed text-muted-foreground">
          When disabled, existing files stay untouched and conflicts are
          flagged in the queue.
        </p>
      </div>
    </div>
  );

  const uploadButton = (
    <Button
      size="lg"
      className="w-full"
      disabled={disabled || busy || pendingCount === 0}
      onClick={() => void onUploadAll()}
    >
      {busy && <LoaderCircle className="size-4 animate-spin" />}
      {busy
        ? "Uploading..."
        : `Upload ${pendingCount} file${pendingCount === 1 ? "" : "s"}`}
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex h-dvh max-h-dvh flex-col gap-0 rounded-none"
          showCloseButton={false}
        >
          {/* Mobile drag handle */}
          <div className="flex shrink-0 justify-center pt-3 pb-1">
            <div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Header */}
          <div className="shrink-0 px-4 pb-3">
            <div className="flex items-center justify-between">
              <SheetTitle>Upload Files</SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </div>

            {/* Destination with picker */}
            <div className="mt-2">
              <DestinationPicker
                currentPath={currentPath}
                actualPath={actualPath}
                currentEntries={currentEntries}
                onNavigate={(p) => onDestinationChange?.(p)}
                disabled={disabled || busy}
              />
            </div>
          </div>

          {/* Fixed top content */}
          <div className="shrink-0 space-y-3 px-4">
            {fileInput}
            {dropZone}
            {overwriteCheckbox}
            {message && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}
          </div>

          {/* Queue header */}
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3 pb-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Queue ({items.length})
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFinished}
              disabled={busy}
            >
              Clear finished
            </Button>
          </div>

          {/* Scrollable queue */}
          <div className="min-h-0 flex-1 px-4 flex flex-col">{queueContent}</div>

          {/* Fixed bottom button */}
          <div className="shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {uploadButton}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[28rem] sm:max-w-[28rem]">
        <SheetHeader>
          <SheetTitle>Upload Files</SheetTitle>
        </SheetHeader>

        {/* Destination with picker */}
        <div className="px-4">
          <DestinationPicker
            currentPath={currentPath}
            actualPath={actualPath}
            currentEntries={currentEntries}
            onNavigate={(p) => onDestinationChange?.(p)}
            disabled={disabled || busy}
          />
        </div>

        <div className="space-y-4 px-4 pb-4">
          {fileInput}
          {dropZone}
          {overwriteCheckbox}

          {message && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Queue
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFinished}
              disabled={busy}
            >
              Clear finished
            </Button>
          </div>

          {queueContent}

          {uploadButton}
        </div>
      </SheetContent>
    </Sheet>
  );
}

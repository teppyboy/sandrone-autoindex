import { CircleAlert, FolderInput, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DestinationPicker } from "@/components/autoindex/DestinationPicker";
import type { Entry } from "@/lib/parser";
import { useIsMobile } from "@/lib/useIsMobile";
import { cn } from "@/lib/utils";
import type { FileOperationStatus } from "@/lib/webdav/types";

interface MoveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: Entry | null;
  currentPath: string;
  actualPath: string;
  currentEntries?: Entry[];
  status: FileOperationStatus;
  error: string | null;
  onMove: (entry: Entry, destinationDir: string) => void;
}

export function MoveSheet({
  open,
  onOpenChange,
  entry,
  currentPath,
  actualPath,
  currentEntries,
  status,
  error,
  onMove,
}: MoveSheetProps) {
  const isMobile = useIsMobile();
  const [destination, setDestination] = useState(currentPath || "/");
  const isBusy = status === "loading";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry || !destination.trim() || isBusy) return;
    onMove(entry, destination.trim());
  };

  const handleClose = (nextOpen: boolean) => {
    if (isBusy) return;
    onOpenChange(nextOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          isMobile
            ? "max-h-[85dvh] overflow-y-auto rounded-t-2xl"
            : "w-96 sm:max-w-96",
        )}
      >
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
          </div>
        )}

        <SheetHeader>
          <SheetTitle>Move</SheetTitle>
          <SheetDescription>
            Move{" "}
            <span className="font-mono text-xs text-foreground">
              {entry?.name}
            </span>{" "}
            to a different directory.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <span className="rounded-full bg-primary/10 p-2 text-primary">
              <FolderInput className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {entry?.name}
                {entry?.type === "directory" && "/"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                From: {currentPath || "/"}
              </p>
            </div>
          </div>

          <DestinationPicker
            currentPath={destination}
            actualPath={actualPath}
            currentEntries={currentEntries}
            onNavigate={setDestination}
            disabled={isBusy}
            excludeEntry={entry}
          />

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <SheetFooter className="mt-1 px-0 pb-0">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isBusy || !destination.trim()}
            >
              {isBusy && <LoaderCircle className="size-4 animate-spin" />}
              {isBusy ? "Moving..." : "Move"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

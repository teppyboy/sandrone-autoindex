import { CircleAlert, LoaderCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Entry } from "@/lib/parser";
import { useIsMobile } from "@/lib/useIsMobile";
import { cn } from "@/lib/utils";
import type { FileOperationStatus } from "@/lib/webdav/types";

interface DeleteConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: Entry | null;
  status: FileOperationStatus;
  error: string | null;
  onDelete: (entry: Entry) => void;
}

export function DeleteConfirmSheet({
  open,
  onOpenChange,
  entry,
  status,
  error,
  onDelete,
}: DeleteConfirmSheetProps) {
  const isMobile = useIsMobile();
  const isBusy = status === "loading";

  const handleDelete = () => {
    if (!entry || isBusy) return;
    onDelete(entry);
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
          <SheetTitle>Delete</SheetTitle>
          <SheetDescription>
            This action cannot be undone.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            <span className="rounded-full bg-destructive/20 p-2 text-destructive">
              <Trash2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {entry?.name}
                {entry?.type === "directory" && "/"}
              </p>
              <p className="text-xs text-muted-foreground">
                {entry?.type === "directory"
                  ? "This directory and all its contents will be permanently deleted."
                  : "This file will be permanently deleted."}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <SheetFooter className="mt-1 flex-row gap-2 px-0 pb-0">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => handleClose(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="flex-1"
              onClick={handleDelete}
              disabled={isBusy}
            >
              {isBusy && <LoaderCircle className="size-4 animate-spin" />}
              {isBusy ? "Deleting..." : "Delete"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { CircleAlert, LoaderCircle, Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface RenameSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: Entry | null;
  status: FileOperationStatus;
  error: string | null;
  onRename: (entry: Entry, newName: string) => void;
}

export function RenameSheet({
  open,
  onOpenChange,
  entry,
  status,
  error,
  onRename,
}: RenameSheetProps) {
  const isMobile = useIsMobile();
  const [newName, setNewName] = useState(entry?.name ?? "");
  const isBusy = status === "loading";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry || !newName.trim() || isBusy) return;
    onRename(entry, newName.trim());
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
          <SheetTitle>Rename</SheetTitle>
          <SheetDescription>
            Enter a new name for{" "}
            <span className="font-mono text-xs text-foreground">
              {entry?.name}
            </span>
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <span className="rounded-full bg-primary/10 p-2 text-primary">
              <Pencil className="size-4" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {entry?.name}
              {entry?.type === "directory" && "/"}
            </span>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="rename-input"
              className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              New name
            </label>
            <Input
              id="rename-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              className="h-10 bg-muted/40"
              disabled={isBusy}
              autoFocus
            />
          </div>

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
              disabled={isBusy || !newName.trim() || newName.trim() === entry?.name}
            >
              {isBusy && <LoaderCircle className="size-4 animate-spin" />}
              {isBusy ? "Renaming..." : "Rename"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

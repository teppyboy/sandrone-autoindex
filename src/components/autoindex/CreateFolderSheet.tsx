import { CircleAlert, FolderPlus, LoaderCircle } from "lucide-react";
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
import { useIsMobile } from "@/lib/useIsMobile";
import { cn } from "@/lib/utils";
import type { FileOperationStatus } from "@/lib/webdav/types";

interface CreateFolderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  status: FileOperationStatus;
  error: string | null;
  onCreate: (name: string) => void;
}

export function CreateFolderSheet({
  open,
  onOpenChange,
  currentPath,
  status,
  error,
  onCreate,
}: CreateFolderSheetProps) {
  const isMobile = useIsMobile();
  const [folderName, setFolderName] = useState("");
  const isBusy = status === "loading";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim() || isBusy) return;
    onCreate(folderName.trim());
  };

  const handleClose = (nextOpen: boolean) => {
    if (isBusy) return;
    onOpenChange(nextOpen);
    if (!nextOpen) setFolderName("");
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
          <SheetTitle>New Folder</SheetTitle>
          <SheetDescription>
            Create a new folder in{" "}
            <span className="font-mono text-xs text-foreground">
              {currentPath || "/"}
            </span>
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <span className="rounded-full bg-primary/10 p-2 text-primary">
              <FolderPlus className="size-4" />
            </span>
            <span className="text-sm text-muted-foreground">
              Enter a name for the new folder
            </span>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="folder-name-input"
              className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Folder name
            </label>
            <Input
              id="folder-name-input"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="my-folder"
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
              disabled={isBusy || !folderName.trim()}
            >
              {isBusy && <LoaderCircle className="size-4 animate-spin" />}
              {isBusy ? "Creating..." : "Create Folder"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

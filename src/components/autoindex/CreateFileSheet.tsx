import { CircleAlert, FilePlus, LoaderCircle } from "lucide-react";
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

interface CreateFileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  status: FileOperationStatus;
  error: string | null;
  onCreate: (name: string) => void;
}

export function CreateFileSheet({
  open,
  onOpenChange,
  currentPath,
  status,
  error,
  onCreate,
}: CreateFileSheetProps) {
  const isMobile = useIsMobile();
  const [fileName, setFileName] = useState("");
  const isBusy = status === "loading";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = fileName.trim();
    if (!name || isBusy) return;
    const finalName = name.includes(".") ? name : `${name}.txt`;
    onCreate(finalName);
  };

  const handleClose = (nextOpen: boolean) => {
    if (isBusy) return;
    onOpenChange(nextOpen);
    if (!nextOpen) setFileName("");
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
          <SheetTitle>New Text File</SheetTitle>
          <SheetDescription>
            Create a new text file in{" "}
            <span className="font-mono text-xs text-foreground">
              {currentPath || "/"}
            </span>
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <span className="rounded-full bg-primary/10 p-2 text-primary">
              <FilePlus className="size-4" />
            </span>
            <span className="text-sm text-muted-foreground">
              Enter a name for the new file
            </span>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="file-name-input"
              className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              File name
            </label>
            <Input
              id="file-name-input"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="notes.txt"
              className="h-10 bg-muted/40"
              disabled={isBusy}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              .txt extension is added automatically if none specified
            </p>
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
              disabled={isBusy || !fileName.trim()}
            >
              {isBusy && <LoaderCircle className="size-4 animate-spin" />}
              {isBusy ? "Creating..." : "Create File"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

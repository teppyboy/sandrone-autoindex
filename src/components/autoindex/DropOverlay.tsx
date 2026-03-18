import { Upload } from "lucide-react";

interface DropOverlayProps {
  visible: boolean;
}

export function DropOverlay({ visible }: DropOverlayProps) {
  if (!visible) return null;

  return (
    <div className="drag-overlay">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-background/90 px-12 py-10 shadow-xl">
        <span className="rounded-full bg-primary/10 p-4 text-primary">
          <Upload className="size-8" />
        </span>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            Drop files to upload
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Files will be added to the upload queue
          </p>
        </div>
      </div>
    </div>
  );
}

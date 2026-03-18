import {
  ChevronRight,
  CircleAlert,
  Folder,
  FolderOpen,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Entry } from "@/lib/parser";
import { pathSegments } from "@/lib/parser";
import { cn } from "@/lib/utils";
import { fetchDirectoryListing } from "@/lib/webdav/client";

interface DestinationPickerProps {
  currentPath: string;
  actualPath: string;
  currentEntries?: Entry[];
  onNavigate: (path: string) => void;
  disabled?: boolean;
  excludeEntry?: Entry | null;
}

function SubdirectoryList({
  currentPath,
  actualPath,
  currentEntries,
  onNavigate,
  disabled,
  excludeEntry,
}: {
  currentPath: string;
  actualPath: string;
  currentEntries?: Entry[];
  onNavigate: (path: string) => void;
  disabled?: boolean;
  excludeEntry?: Entry | null;
}) {
  const [fetchedEntries, setFetchedEntries] = useState<Entry[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchRef = useRef(0);

  const normalizedCurrent = currentPath || "/";
  const normalizedActual = actualPath || "/";

  const isActualPath =
    normalizedCurrent === normalizedActual ||
    normalizedCurrent === normalizedActual.replace(/\/$/, "") ||
    normalizedActual === normalizedCurrent.replace(/\/$/, "");

  useEffect(() => {
    if (isActualPath) return;

    const fetchId = ++fetchRef.current;

    const dirUrl = new URL(
      normalizedCurrent.endsWith("/")
        ? normalizedCurrent
        : normalizedCurrent + "/",
      window.location.origin,
    ).toString();

    fetchDirectoryListing(dirUrl)
      .then((entries) => {
        if (fetchRef.current !== fetchId) return;
        setFetchedEntries(entries);
        setFetchError(null);
      })
      .catch((err) => {
        if (fetchRef.current !== fetchId) return;
        setFetchedEntries(null);
        setFetchError(
          err instanceof Error
            ? err.message
            : "Failed to load subdirectories.",
        );
      });
  }, [normalizedCurrent, isActualPath]);

  const loading =
    !isActualPath && fetchedEntries === null && fetchError === null;

  const entries = isActualPath
    ? (currentEntries ?? [])
    : (fetchedEntries ?? []);

  const excludeName = excludeEntry?.name;
  const directories = entries.filter(
    (e) => e.type === "directory" && e.name !== excludeName,
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <LoaderCircle className="size-3.5 animate-spin" />
        Loading folders...
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <CircleAlert className="size-3.5 shrink-0" />
        {fetchError}
      </div>
    );
  }

  if (directories.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Folders
      </p>
      <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-muted/20">
        {directories.map((dir) => (
          <button
            key={dir.href}
            type="button"
            disabled={disabled}
            onClick={() => {
              const newDest =
                (normalizedCurrent.endsWith("/")
                  ? normalizedCurrent
                  : normalizedCurrent + "/") +
                encodeURIComponent(dir.name) +
                "/";
              onNavigate(newDest);
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
              disabled
                ? "cursor-not-allowed opacity-50"
                : "hover:bg-muted/60",
            )}
          >
            <Folder className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{dir.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DestinationPicker({
  currentPath,
  actualPath,
  currentEntries,
  onNavigate,
  disabled,
  excludeEntry,
}: DestinationPickerProps) {
  const segments = pathSegments(currentPath || "/");

  const breadcrumb = (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {segments.map((segment, i) => (
        <span key={segment.href} className="flex shrink-0 items-center gap-0.5">
          {i > 0 && (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" />
          )}
          <button
            type="button"
            onClick={() => onNavigate(segment.href)}
            className={cn(
              "rounded px-1 py-0.5 font-mono text-xs transition-colors",
              i === segments.length - 1
                ? "text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {segment.label}
          </button>
        </span>
      ))}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
        {breadcrumb}
      </div>
      <SubdirectoryList
        currentPath={currentPath}
        actualPath={actualPath}
        currentEntries={currentEntries}
        onNavigate={onNavigate}
        disabled={disabled}
        excludeEntry={excludeEntry}
      />
    </div>
  );
}

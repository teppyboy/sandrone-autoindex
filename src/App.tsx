import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Check,
  ChevronRight,
  CircleAlert,
  FilePlus,
  FolderOpen,
  FolderPlus,
  House,
  LoaderCircle,
  MoreHorizontal,
  Search,
  Server,
  Settings,
  SortAsc,
  SortDesc,
  Upload,
  User,
  X,
} from "lucide-react";

import { AuthSheet } from "@/components/autoindex/AuthSheet";
import { BulkActionBar } from "@/components/autoindex/BulkActionBar";
import { CreateFileSheet } from "@/components/autoindex/CreateFileSheet";
import { CreateFolderSheet } from "@/components/autoindex/CreateFolderSheet";
import { DeleteConfirmSheet } from "@/components/autoindex/DeleteConfirmSheet";
import { DropOverlay } from "@/components/autoindex/DropOverlay";
import { EntryActions } from "@/components/autoindex/EntryActions";
import { FileIcon } from "@/components/autoindex/FileIcon";
import { MobileSearchSheet } from "@/components/autoindex/MobileSearchSheet";
import { MoveSheet } from "@/components/autoindex/MoveSheet";
import { RenameSheet } from "@/components/autoindex/RenameSheet";
import { SettingsSheet } from "@/components/autoindex/SettingsSheet";
import { UploadSheet } from "@/components/autoindex/UploadSheet";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type BreadcrumbSegment,
  type Entry,
  parseAutoindex,
  parseMtime,
  parentHref,
  pathSegments,
} from "@/lib/parser";
import type { Palette, SortDir, SortKey, Theme, ViewMode } from "@/lib/types";
import { useIsMobile } from "@/lib/useIsMobile";
import { cn } from "@/lib/utils";
import {
  buildResourceUrl,
  checkResourceExists,
  createDirectory,
  createEmptyFile,
  deleteResource,
  getCurrentDirectoryUrl,
  moveResource,
  refreshAutoindexListing,
  uploadFile,
  WebDavError,
} from "@/lib/webdav/client";
import { useUploadQueue } from "@/lib/webdav/useUploadQueue";
import { useWebDavSession } from "@/lib/webdav/useWebDavSession";
import type { FileOperationStatus } from "@/lib/webdav/types";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "mtime", label: "Modified" },
  { value: "size", label: "Size" },
  { value: "type", label: "Type" },
];

function formatMtime(mtime: string): string {
  const date = parseMtime(mtime);
  if (!date) return mtime;

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSizeBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function sortEntries(entries: Entry[], key: SortKey, dir: SortDir): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    if (key === "type") return a.name.localeCompare(b.name);

    let comparison = 0;

    if (key === "name") {
      comparison = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
    } else if (key === "mtime") {
      const aTime = parseMtime(a.mtime)?.getTime() ?? 0;
      const bTime = parseMtime(b.mtime)?.getTime() ?? 0;
      comparison = aTime - bTime;
    } else if (key === "size") {
      comparison = (a.rawSize ?? -1) - (b.rawSize ?? -1);
    }

    return dir === "asc" ? comparison : -comparison;
  });
}

function getSortLabel(sortKey: SortKey): string {
  return (
    SORT_OPTIONS.find((option) => option.value === sortKey)?.label ?? "Name"
  );
}

function readStoredNumber(key: string, fallback: number): number {
  try {
    const stored = localStorage.getItem(key);
    const parsed = stored == null ? NaN : Number(stored);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function readStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem("sandrone-view");
    return stored === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

function readStoredTheme(): Theme {
  try {
    return (localStorage.getItem("sandrone-theme") as Theme) ?? "dark";
  } catch {
    return "dark";
  }
}

function readStoredPalette(): Palette {
  try {
    return (localStorage.getItem("sandrone-palette") as Palette) ?? "neutral";
  } catch {
    return "neutral";
  }
}

function formatUploadMessage(count: number, hadFailure: boolean): string {
  if (count === 0) {
    return hadFailure
      ? "No files were uploaded. Review the queue and try again."
      : "No files needed uploading.";
  }

  return hadFailure
    ? `Uploaded ${count} file${count === 1 ? "" : "s"}, but some items still need attention.`
    : `Uploaded ${count} file${count === 1 ? "" : "s"} successfully.`;
}

interface SortButtonProps {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortButton({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: SortButtonProps) {
  const active = current === sortKey;

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        "flex items-center gap-1 text-xs font-medium select-none hover:text-foreground transition-colors",
        active ? "text-foreground" : "text-muted-foreground",
        className,
      )}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <SortAsc className="size-3.5" />
        ) : (
          <SortDesc className="size-3.5" />
        )
      ) : (
        <ArrowUpDown className="size-3.5 opacity-40" />
      )}
    </button>
  );
}

interface FileRowProps {
  entry: Entry;
  isMobile: boolean;
  showSize?: boolean;
  isAuthenticated: boolean;
  onRename: (entry: Entry) => void;
  onMove: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onDragStart?: (entry: Entry) => void;
  onDragEnd?: () => void;
  onMoveToDirectory?: (sourceEntry: Entry, targetDir: Entry) => void;
  draggedEntry: Entry | null;
  selected: boolean;
  onToggleSelect: (href: string) => void;
  onNavigate: (href: string) => void;
}

function FileRow({ entry, isMobile, showSize = true, isAuthenticated, onRename, onMove, onDelete, onDragStart, onDragEnd, onMoveToDirectory, draggedEntry, selected, onToggleSelect, onNavigate }: FileRowProps) {
  const isDirectory = entry.type === "directory";
  const isDragging = draggedEntry?.href === entry.href;
  const isDropTarget = isDirectory && draggedEntry !== null && draggedEntry.href !== entry.href;
  const sizeLabel = isDirectory
    ? null
    : entry.rawSize != null
      ? formatSizeBytes(entry.rawSize)
      : (entry.size ?? null);

  const handleRowDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x/sandrone-entry", JSON.stringify(entry));
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(entry);
  };

  const handleRowDragEnd = () => {
    onDragEnd?.();
  };

  const handleDirDragOver = (e: React.DragEvent) => {
    if (!isDropTarget) return;
    if (!e.dataTransfer.types.includes("application/x/sandrone-entry")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDirDragEnter = (e: React.DragEvent) => {
    if (!isDropTarget) return;
    if (!e.dataTransfer.types.includes("application/x/sandrone-entry")) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add("drag-over-directory");
  };

  const handleDirDragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("drag-over-directory");
  };

  const handleDirDrop = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("drag-over-directory");
    if (!isDropTarget) return;
    if (!e.dataTransfer.types.includes("application/x/sandrone-entry")) return;
    e.preventDefault();

    try {
      const data = e.dataTransfer.getData("application/x/sandrone-entry");
      const sourceEntry = JSON.parse(data) as Entry;
      if (sourceEntry.href === entry.href) return;
      onMoveToDirectory?.(sourceEntry, entry);
    } catch {
      // ignore parse errors
    }
  };

  return (
    <div
      className={cn(
        "group entry-row flex items-center gap-3 px-4 rounded-md hover:bg-muted/60 transition-colors text-sm",
        isMobile ? "py-3" : "py-2.5",
        isDragging && "dragging",
        isDropTarget && "drag-over-directory",
        selected && "entry-selected",
      )}
      draggable={isAuthenticated}
      onDragStart={handleRowDragStart}
      onDragEnd={handleRowDragEnd}
      onDragOver={handleDirDragOver}
      onDragEnter={handleDirDragEnter}
      onDragLeave={handleDirDragLeave}
      onDrop={handleDirDrop}
    >
      {isAuthenticated && (
        <button
          type="button"
          className={cn(
            "entry-checkbox size-4 flex items-center justify-center rounded bg-background",
            selected
              ? "bg-primary border-primary text-primary-foreground"
              : "border-border hover:border-ring",
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect(entry.href);
          }}
          aria-label={selected ? `Deselect ${entry.name}` : `Select ${entry.name}`}
        >
          {selected && <Check className="size-3" strokeWidth={2.5} />}
        </button>
      )}

      <a
        href={entry.href}
        className="flex flex-1 min-w-0 items-center gap-3 no-underline"
        onClick={(e) => {
          if (isDragging) { e.preventDefault(); return; }
          if (isDirectory) {
            e.preventDefault();
            onNavigate(entry.href);
          }
        }}
      >
        <FileIcon
          name={entry.name}
          isDir={isDirectory}
          className={cn("shrink-0", isMobile ? "size-5" : "size-4.5")}
          strokeWidth={1.5}
        />

        <span className="flex-1 min-w-0">
          <span className="block truncate text-foreground group-hover:text-primary font-normal">
            {entry.name}
            {isDirectory && (
              <span className="text-muted-foreground ml-0.5">/</span>
            )}
          </span>

          {isMobile && (
            <span className="mt-0.5 flex items-center gap-1.5 min-w-0 text-[11px] text-muted-foreground">
              {sizeLabel && <span className="shrink-0">{sizeLabel}</span>}
              {sizeLabel && <span className="shrink-0">·</span>}
              <span className="truncate">{formatMtime(entry.mtime)}</span>
            </span>
          )}
        </span>

        {!isMobile && (
          <span className="w-44 shrink-0 text-right text-xs text-muted-foreground">
            {formatMtime(entry.mtime)}
          </span>
        )}

        {!isMobile && showSize && (
          <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
            {isDirectory
              ? "—"
              : entry.rawSize != null
                ? formatSizeBytes(entry.rawSize)
                : (entry.size ?? "—")}
          </span>
        )}

        {isMobile && isDirectory && (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
        )}
      </a>

      {isAuthenticated && (
        <EntryActions
          entry={entry}
          onRename={onRename}
          onMove={onMove}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

interface FileCardProps {
  entry: Entry;
  isMobile: boolean;
  isAuthenticated: boolean;
  onRename: (entry: Entry) => void;
  onMove: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onDragStart?: (entry: Entry) => void;
  onDragEnd?: () => void;
  onMoveToDirectory?: (sourceEntry: Entry, targetDir: Entry) => void;
  draggedEntry: Entry | null;
  selected: boolean;
  onToggleSelect: (href: string) => void;
  onNavigate: (href: string) => void;
}

function FileCard({ entry, isMobile, isAuthenticated, onRename, onMove, onDelete, onDragStart, onDragEnd, onMoveToDirectory, draggedEntry, selected, onToggleSelect, onNavigate }: FileCardProps) {
  const isDirectory = entry.type === "directory";
  const isDragging = draggedEntry?.href === entry.href;
  const isDropTarget = isDirectory && draggedEntry !== null && draggedEntry.href !== entry.href;

  const handleCardDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x/sandrone-entry", JSON.stringify(entry));
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(entry);
  };

  const handleCardDragEnd = () => {
    onDragEnd?.();
  };

  const handleDirDragOver = (e: React.DragEvent) => {
    if (!isDropTarget) return;
    if (!e.dataTransfer.types.includes("application/x/sandrone-entry")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDirDragEnter = (e: React.DragEvent) => {
    if (!isDropTarget) return;
    if (!e.dataTransfer.types.includes("application/x/sandrone-entry")) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add("drag-over-directory");
  };

  const handleDirDragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("drag-over-directory");
  };

  const handleDirDrop = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("drag-over-directory");
    if (!isDropTarget) return;
    if (!e.dataTransfer.types.includes("application/x/sandrone-entry")) return;
    e.preventDefault();

    try {
      const data = e.dataTransfer.getData("application/x/sandrone-entry");
      const sourceEntry = JSON.parse(data) as Entry;
      if (sourceEntry.href === entry.href) return;
      onMoveToDirectory?.(sourceEntry, entry);
    } catch {
      // ignore parse errors
    }
  };

  return (
    <div
      className={cn(
        "group entry-card relative flex flex-col items-center gap-2 rounded-lg border border-border hover:border-ring/40 hover:bg-muted/40 transition-all text-center",
        isMobile ? "p-3" : "p-4",
        isDragging && "dragging",
        isDropTarget && "drag-over-directory",
        selected && "entry-selected",
      )}
      draggable={isAuthenticated}
      onDragStart={handleCardDragStart}
      onDragEnd={handleCardDragEnd}
      onDragOver={handleDirDragOver}
      onDragEnter={handleDirDragEnter}
      onDragLeave={handleDirDragLeave}
      onDrop={handleDirDrop}
    >
      {isAuthenticated && (
        <>
          <button
            type="button"
            className={cn(
              "entry-checkbox absolute top-1 left-1 size-5 flex items-center justify-center rounded bg-background",
              selected
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border hover:border-ring",
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSelect(entry.href);
            }}
            aria-label={selected ? `Deselect ${entry.name}` : `Select ${entry.name}`}
          >
            {selected && <Check className="size-3" strokeWidth={2.5} />}
          </button>
          <div className="absolute top-1 right-1">
            <EntryActions
              entry={entry}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
            />
          </div>
        </>
      )}

      <a href={entry.href} className="flex flex-col items-center gap-2 no-underline"
        onClick={(e) => {
          if (isDragging) { e.preventDefault(); return; }
          if (entry.type === "directory") {
            e.preventDefault();
            onNavigate(entry.href);
          }
        }}
      >
        <FileIcon
          name={entry.name}
          isDir={entry.type === "directory"}
          className={cn("shrink-0", isMobile ? "size-7" : "size-8")}
          strokeWidth={1.5}
        />

        <span
          className={cn(
            "w-full text-xs text-foreground font-normal leading-snug group-hover:text-primary",
            isMobile ? "line-clamp-2" : "truncate",
          )}
        >
          {entry.name}
          {entry.type === "directory" && (
            <span className="text-muted-foreground">/</span>
          )}
        </span>

        <span className="mt-auto text-[10px] text-muted-foreground">
          {entry.type === "directory"
            ? "Folder"
            : entry.rawSize != null
              ? formatSizeBytes(entry.rawSize)
              : (entry.size ?? "—")}
        </span>
      </a>
    </div>
  );
}

interface BreadcrumbNavProps {
  segments: BreadcrumbSegment[];
  isMobile?: boolean;
  className?: string;
  onNavigate: (href: string) => void;
}

type BreadcrumbDisplayItem =
  | {
      type: "segment";
      segment: BreadcrumbSegment;
      isLast: boolean;
    }
  | {
      type: "overflow";
      segments: BreadcrumbSegment[];
    };

function BreadcrumbOverflowMenu({
  segments,
  onNavigate,
}: {
  segments: BreadcrumbSegment[];
  onNavigate: (href: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "size-6 text-muted-foreground hover:text-foreground",
        )}
        aria-label="Show hidden breadcrumb segments"
      >
        <MoreHorizontal className="size-3.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-64 max-w-[calc(100vw-2rem)]"
      >
        {segments.map((segment) => (
          <DropdownMenuItem
            key={segment.href}
            className="items-start py-2"
            title={segment.label}
            onClick={() => {
              onNavigate(segment.href);
            }}
          >
            <span className="whitespace-normal [overflow-wrap:anywhere]">
              {segment.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface BreadcrumbSegmentItemProps {
  segment: BreadcrumbSegment;
  isLast: boolean;
  isMobile: boolean;
  onNavigate: (href: string) => void;
}

function BreadcrumbSegmentItem({
  segment,
  isLast,
  isMobile,
  onNavigate,
}: BreadcrumbSegmentItemProps) {
  const isRoot = segment.href === "/";
  const desktopLabelClassName =
    "block max-w-40 truncate lg:max-w-52 xl:max-w-64";
  const mobileLabelClassName = "block max-w-full [overflow-wrap:anywhere]";

  if (isLast) {
    return isRoot ? (
      <span className="inline-flex min-h-5 items-center text-sm font-medium leading-5 text-foreground">
        <House className="size-3.5" />
      </span>
    ) : (
      <span
        className={cn(
          "min-h-5 text-sm font-medium leading-5 text-foreground",
          isMobile ? mobileLabelClassName : desktopLabelClassName,
        )}
        title={isMobile ? undefined : segment.label}
      >
        {segment.label}
      </span>
    );
  }

  return isRoot ? (
    <a
      href={segment.href}
      className="inline-flex min-h-5 items-center text-muted-foreground transition-colors hover:text-foreground no-underline"
      aria-label="Root"
      onClick={(e) => {
        e.preventDefault();
        onNavigate(segment.href);
      }}
    >
      <House className="size-3.5" />
    </a>
  ) : (
    <a
      href={segment.href}
      className={cn(
        "min-h-5 text-sm leading-5 text-muted-foreground transition-colors hover:text-foreground no-underline",
        isMobile ? mobileLabelClassName : desktopLabelClassName,
      )}
      title={isMobile ? undefined : segment.label}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(segment.href);
      }}
    >
      {segment.label}
    </a>
  );
}

function BreadcrumbNav({
  segments,
  isMobile = false,
  className,
  onNavigate,
}: BreadcrumbNavProps) {
  const displayItems: BreadcrumbDisplayItem[] =
    !isMobile && segments.length > 4
      ? [
          { type: "segment", segment: segments[0], isLast: false },
          { type: "overflow", segments: segments.slice(1, -2) },
          {
            type: "segment",
            segment: segments[segments.length - 2],
            isLast: false,
          },
          {
            type: "segment",
            segment: segments[segments.length - 1],
            isLast: true,
          },
        ]
      : segments.map((segment, index) => ({
          type: "segment" as const,
          segment,
          isLast: index === segments.length - 1,
        }));

  return (
    <nav
      aria-label="Directory path"
      className={cn(
        "flex gap-1",
        isMobile
          ? "w-full flex-wrap items-start content-start gap-y-1"
          : "min-w-0 flex-wrap items-center",
        className,
      )}
    >
      {displayItems.map((item, index) => {
        return (
          <span
            key={
              item.type === "segment"
                ? item.segment.href
                : "breadcrumb-overflow"
            }
            className={cn(
              "flex gap-1",
              isMobile
                ? "min-w-0 max-w-full items-start"
                : "shrink-0 items-center",
            )}
          >
            {index > 0 && (
              <ChevronRight
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground/50",
                  isMobile && "mt-0.5",
                )}
              />
            )}

            {item.type === "overflow" ? (
              <BreadcrumbOverflowMenu segments={item.segments} onNavigate={onNavigate} />
            ) : (
              <BreadcrumbSegmentItem
                segment={item.segment}
                isLast={item.isLast}
                isMobile={isMobile}
                onNavigate={onNavigate}
              />
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default function App() {
  const isMobile = useIsMobile();
  const {
    sessionStatus,
    username,
    authorization,
    remember,
    serverSupport,
    capability,
    message: authMessage,
    error: authError,
    isAuthenticated,
    signIn,
    signOut,
    handleWriteFailure,
    markWriteSuccess,
  } = useWebDavSession();
  const {
    items: uploadItems,
    overwriteExisting,
    setOverwriteExisting,
    addFiles,
    updateItem,
    removeItem,
    clearFinished,
    resetItem,
    clearAll,
  } = useUploadQueue();
  const initialParsed = useMemo(() => parseAutoindex(document), []);

  const [entries, setEntries] = useState<Entry[]>(
    () => initialParsed?.entries ?? [],
  );
  const [path, setPath] = useState(() => initialParsed?.path ?? "/");
  const loaded = true;

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [view, setView] = useState<ViewMode>(readStoredViewMode);

  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  const [palette, setPalette] = useState<Palette>(readStoredPalette);

  const [bgBrightness, setBgBrightness] = useState<number>(() =>
    readStoredNumber("sandrone-bg-brightness", 70),
  );
  const [bgBlur, setBgBlur] = useState<number>(() =>
    readStoredNumber("sandrone-bg-blur", 0),
  );
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const [renameTarget, setRenameTarget] = useState<Entry | null>(null);
  const [renameStatus, setRenameStatus] = useState<FileOperationStatus>("idle");
  const [renameError, setRenameError] = useState<string | null>(null);

  const [moveTarget, setMoveTarget] = useState<Entry | null>(null);
  const [moveStatus, setMoveStatus] = useState<FileOperationStatus>("idle");
  const [moveError, setMoveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<FileOperationStatus>("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [draggedEntry, setDraggedEntry] = useState<Entry | null>(null);
  const [osDragCounter, setOsDragCounter] = useState(0);

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderStatus, setCreateFolderStatus] = useState<FileOperationStatus>("idle");
  const [createFolderError, setCreateFolderError] = useState<string | null>(null);

  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [createFileStatus, setCreateFileStatus] = useState<FileOperationStatus>("idle");
  const [createFileError, setCreateFileError] = useState<string | null>(null);

  const [uploadDestination, setUploadDestination] = useState<string>("");

  const [selectedHrefs, setSelectedHrefs] = useState<Set<string>>(new Set());
  const [selectionPath, setSelectionPath] = useState(path || "/");
  const [batchMoveTarget, setBatchMoveTarget] = useState<Entry | null>(null);
  const [batchMoveStatus, setBatchMoveStatus] = useState<FileOperationStatus>("idle");
  const [batchMoveError, setBatchMoveError] = useState<string | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleteStatus, setBatchDeleteStatus] = useState<FileOperationStatus>("idle");
  const [batchDeleteError, setBatchDeleteError] = useState<string | null>(null);

  const [navigating, setNavigating] = useState(false);

  const preferredTheme = palette === "sandrone" ? "dark" : theme;
  const effectiveMobileSearchOpen = isMobile ? mobileSearchOpen : false;
  const effectiveUploadSheetOpen = isAuthenticated ? uploadSheetOpen : false;

  const navigateToDirectory = async (href: string, replace?: boolean) => {
    setNavigating(true);

    try {
      const response = await fetch(href, { cache: "no-store" });
      if (!response.ok) {
        window.location.assign(href);
        return;
      }

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const parsed = parseAutoindex(doc);

      if (!parsed) {
        window.location.assign(href);
        return;
      }

      setEntries(parsed.entries);
      setPath(parsed.path);
      setSearch("");
      setSelectedHrefs(new Set());

      if (replace) {
        window.history.replaceState({}, "", href);
      } else {
        window.history.pushState({}, "", href);
      }

      window.scrollTo(0, 0);
    } catch {
      window.location.assign(href);
    }

    setNavigating(false);
  };

  useEffect(() => {
    const handlePopState = () => {
      void navigateToDirectory(window.location.href, true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      preferredTheme === "dark",
    );
    try {
      localStorage.setItem("sandrone-theme", preferredTheme);
    } catch {
      // ignore storage persistence errors
    }
  }, [preferredTheme]);

  useEffect(() => {
    const element = document.documentElement;
    const paletteClasses = [...element.classList].filter((className) =>
      className.startsWith("palette-"),
    );

    paletteClasses.forEach((className) => element.classList.remove(className));

    if (palette !== "neutral") {
      element.classList.add(`palette-${palette}`);
    }

    try {
      localStorage.setItem("sandrone-palette", palette);
    } catch {
      // ignore storage persistence errors
    }
  }, [palette]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--bg-brightness",
      (bgBrightness / 100).toFixed(2),
    );
    try {
      localStorage.setItem("sandrone-bg-brightness", String(bgBrightness));
    } catch {
      // ignore storage persistence errors
    }
  }, [bgBrightness]);

  useEffect(() => {
    document.documentElement.style.setProperty("--bg-blur", `${bgBlur}px`);
    try {
      localStorage.setItem("sandrone-bg-blur", String(bgBlur));
    } catch {
      // ignore storage persistence errors
    }
  }, [bgBlur]);

  useEffect(() => {
    try {
      localStorage.setItem("sandrone-view", view);
    } catch {
      // ignore storage persistence errors
    }
  }, [view]);

  useEffect(() => {
    if (isMobile || !mobileSearchOpen) return;

    const timeoutId = window.setTimeout(() => {
      setMobileSearchOpen(false);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isMobile, mobileSearchOpen]);

  useEffect(() => {
    if (isAuthenticated || !uploadSheetOpen) return;

    const timeoutId = window.setTimeout(() => {
      setUploadSheetOpen(false);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isAuthenticated, uploadSheetOpen]);

  const segments = useMemo(() => pathSegments(path), [path]);

  const visibleEntries = useMemo(
    () =>
      entries.filter(
        (entry) => !(entry.type === "directory" && entry.name === "_autoindex"),
      ),
    [entries],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? visibleEntries.filter((entry) =>
          entry.name.toLowerCase().includes(query),
        )
      : visibleEntries;
  }, [search, visibleEntries]);

  const sorted = useMemo(
    () => sortEntries(filtered, sortKey, sortDir),
    [filtered, sortDir, sortKey],
  );

  const effectiveHrefs = useMemo(
    () => (selectionPath === (path || "/") ? selectedHrefs : new Set<string>()),
    [selectionPath, path, selectedHrefs],
  );
  const hasSelection = effectiveHrefs.size > 0;
  const selectedEntries = useMemo(
    () => sorted.filter((e) => effectiveHrefs.has(e.href)),
    [sorted, effectiveHrefs],
  );
  const allSelected =
    sorted.length > 0 && effectiveHrefs.size === sorted.length;

  const toggleSelect = (href: string) => {
    setSelectedHrefs((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
    setSelectionPath(path || "/");
  };

  const selectAll = () => {
    setSelectedHrefs(new Set(sorted.map((e) => e.href)));
    setSelectionPath(path || "/");
  };

  const clearSelection = () => {
    setSelectedHrefs(new Set());
  };

  const dirCount = useMemo(
    () => visibleEntries.filter((entry) => entry.type === "directory").length,
    [visibleEntries],
  );
  const fileCount = useMemo(
    () => visibleEntries.filter((entry) => entry.type === "file").length,
    [visibleEntries],
  );
  const totalBytes = useMemo(
    () => visibleEntries.reduce((sum, entry) => sum + (entry.rawSize ?? 0), 0),
    [visibleEntries],
  );

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((currentDir) => (currentDir === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir("asc");
  };

  const isRoot = path === "/" || path === "";
  const upHref = isRoot ? null : parentHref(path);
  const sortLabel = getSortLabel(sortKey);
  const hasActiveSearch = search.trim().length > 0;
  const shouldShowWebDavUi = serverSupport === "supported" || isAuthenticated;
  const canUseUpload =
    isAuthenticated &&
    capability !== "forbidden" &&
    capability !== "unsupported";
  const uploadButtonDisabled =
    uploading || capability === "checking" || !canUseUpload;
  const visibleNotice =
    authError ??
    uploadMessage ??
    (isAuthenticated &&
    (capability === "forbidden" || capability === "unsupported")
      ? authMessage
      : null);

  const renderSearchField = (className?: string) => (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Filter files…"
        className="h-8 border-input/60 bg-muted/40 pl-8 text-sm focus-visible:bg-background"
      />

      {search && (
        <button
          onClick={() => setSearch("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );

  const headerAccountControl = !shouldShowWebDavUi ? (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0"
      onClick={() => setSettingsOpen(true)}
      aria-label="Open settings"
    >
      <Settings className="size-4" />
    </Button>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({
            variant: "ghost",
            size: isAuthenticated && !isMobile ? "sm" : "icon",
          }),
          "shrink-0",
        )}
        aria-label={
          isAuthenticated
            ? `Open account menu for ${username ?? "current user"}`
            : "Open account menu"
        }
      >
        <User className="size-4" />
        {isAuthenticated && !isMobile && (
          <span className="max-w-32 truncate">{username ?? "Account"}</span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
          <Settings className="size-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setAuthSheetOpen(true)}>
          {isAuthenticated ? (
            <User className="size-4" />
          ) : (
            <User className="size-4" />
          )}
          <span>{isAuthenticated ? "WebDAV account" : "Sign in"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const uploadButton =
    shouldShowWebDavUi && isAuthenticated ? (
      <Button
        variant="outline"
        size="sm"
        className={cn("shrink-0", isMobile ? "px-2.5" : undefined)}
        onClick={() => setUploadSheetOpen(true)}
        disabled={uploadButtonDisabled}
      >
        {uploading ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        {!isMobile && "Upload"}
      </Button>
    ) : null;

  const creditContent = (
    <>
      Powered by{" "}
      <a
        href="https://github.com/teppyboy/sandrone-autoindex"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground/70 transition-colors hover:text-foreground no-underline"
      >
        Sandrone-AutoIndex
      </a>
    </>
  );

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="animate-pulse text-sm text-muted-foreground">
          Loading…
        </span>
      </div>
    );
  }

  const handleFilesSelected = (files: FileList | File[]) => {
    setUploadMessage(null);
    setUploadDestination(path || "/");
    addFiles(files);

    if (!isMobile) {
      setUploadSheetOpen(true);
    }
  };

  const handleUploadAll = async () => {
    if (!authorization || uploadItems.length === 0 || uploading) return;

    setUploading(true);
    setUploadMessage(null);

    const queuedItems = uploadItems.filter(
      (item) =>
        item.status === "pending" ||
        item.status === "error" ||
        item.status === "conflict",
    );
    let uploadedCount = 0;
    let hadFailure = false;
    let shouldRefresh = false;

    for (const item of queuedItems) {
      const dest = uploadDestination || path || "/";
      const dirUrl = new URL(
        dest.endsWith("/") ? dest : dest + "/",
        window.location.origin,
      ).toString();
      const targetUrl = new URL(encodeURIComponent(item.file.name), dirUrl).toString();

      updateItem(item.id, {
        status: "checking",
        progress: 0,
        message: overwriteExisting
          ? "Preparing upload..."
          : "Checking for an existing file...",
      });

      try {
        if (!overwriteExisting) {
          const exists = await checkResourceExists(targetUrl);
          if (exists) {
            hadFailure = true;
            updateItem(item.id, {
              status: "conflict",
              progress: 0,
              message:
                "A file with this name already exists. Enable overwrite to replace it.",
            });
            continue;
          }
        }

        updateItem(item.id, {
          status: "uploading",
          progress: 0,
          message: overwriteExisting
            ? "Uploading and replacing any existing file."
            : "Uploading...",
        });

        await uploadFile({
          file: item.file,
          targetUrl,
          authorization,
          onProgress: (progress) => {
            updateItem(item.id, {
              status: "uploading",
              progress,
              message: overwriteExisting
                ? "Uploading and replacing any existing file."
                : "Uploading...",
            });
          },
        });

        uploadedCount += 1;
        shouldRefresh = true;
        markWriteSuccess();

        updateItem(item.id, {
          status: "success",
          progress: 100,
          message: "Uploaded successfully.",
        });
      } catch (error) {
        hadFailure = true;

        const message =
          error instanceof Error ? error.message : "The upload failed.";
        const status = error instanceof WebDavError ? error.status : undefined;

        if (status != null) {
          handleWriteFailure(status);
        }

        updateItem(item.id, {
          status: "error",
          progress: 0,
          message,
        });

        if (status === 401) {
          break;
        }
      }
    }

    if (shouldRefresh) {
      try {
        const refreshed = await refreshAutoindexListing();
        setEntries(refreshed.entries);
        setPath(refreshed.path);
      } catch (error) {
        hadFailure = true;
        setUploadMessage(
          error instanceof Error
            ? error.message
            : "The page could not be refreshed after uploading.",
        );
      }
    }

  if (!uploadMessage) {
      setUploadMessage(formatUploadMessage(uploadedCount, hadFailure));
    }

    setUploading(false);
  };

  const getEntrySourceUrl = (entry: Entry) =>
    new URL(entry.href, window.location.origin).toString();

  const getEntryDestinationUrl = (
    name: string,
    type: Entry["type"],
    directoryUrl: string = getCurrentDirectoryUrl().toString(),
  ) =>
    new URL(
      `${encodeURIComponent(name)}${type === "directory" ? "/" : ""}`,
      directoryUrl,
    ).toString();

  const handleRename = async (entry: Entry, newName: string) => {
    if (!authorization) return;

    setRenameStatus("loading");
    setRenameError(null);

    try {
      const sourceUrl = getEntrySourceUrl(entry);
      const destUrl = getEntryDestinationUrl(newName, entry.type);
      await moveResource(sourceUrl, destUrl, authorization);
      markWriteSuccess();

      const refreshed = await refreshAutoindexListing();
      setEntries(refreshed.entries);
      setPath(refreshed.path);

      setRenameTarget(null);
      setRenameStatus("idle");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The rename failed.";
      const status = error instanceof WebDavError ? error.status : undefined;

      if (status != null) {
        handleWriteFailure(status);
      }

      setRenameStatus("error");
      setRenameError(message);
    }
  };

  const handleMove = async (entry: Entry, destinationDir: string) => {
    if (!authorization) return;

    setMoveStatus("loading");
    setMoveError(null);

    try {
      const sourceUrl = getEntrySourceUrl(entry);
      const dirUrl = new URL(
        destinationDir.endsWith("/") ? destinationDir : destinationDir + "/",
        window.location.origin,
      ).toString();
      const destUrl = getEntryDestinationUrl(entry.name, entry.type, dirUrl);
      await moveResource(sourceUrl, destUrl, authorization);
      markWriteSuccess();

      const refreshed = await refreshAutoindexListing();
      setEntries(refreshed.entries);
      setPath(refreshed.path);

      setMoveTarget(null);
      setMoveStatus("idle");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The move operation failed.";
      const status = error instanceof WebDavError ? error.status : undefined;

      if (status != null) {
        handleWriteFailure(status);
      }

      setMoveStatus("error");
      setMoveError(message);
    }
  };

  const handleDelete = async (entry: Entry) => {
    if (!authorization) return;

    setDeleteStatus("loading");
    setDeleteError(null);

    try {
      const targetUrl = getEntrySourceUrl(entry);
      await deleteResource(targetUrl, authorization);
      markWriteSuccess();

      const refreshed = await refreshAutoindexListing();
      setEntries(refreshed.entries);
      setPath(refreshed.path);

      setDeleteTarget(null);
      setDeleteStatus("idle");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The delete operation failed.";
      const status = error instanceof WebDavError ? error.status : undefined;

      if (status != null) {
        handleWriteFailure(status);
      }

      setDeleteStatus("error");
      setDeleteError(message);
    }
  };

  const handleMoveToDirectory = async (sourceEntry: Entry, targetDir: Entry) => {
    if (!authorization) return;

    try {
      const sourceUrl = getEntrySourceUrl(sourceEntry);
      const targetDirUrl = new URL(
        encodeURIComponent(targetDir.name) + "/",
        new URL(window.location.href.endsWith("/")
          ? window.location.href
          : window.location.href + "/"),
      ).toString();
      const destUrl = getEntryDestinationUrl(
        sourceEntry.name,
        sourceEntry.type,
        targetDirUrl,
      );
      await moveResource(sourceUrl, destUrl, authorization);
      markWriteSuccess();

      const refreshed = await refreshAutoindexListing();
      setEntries(refreshed.entries);
      setPath(refreshed.path);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The move operation failed.";
      const status = error instanceof WebDavError ? error.status : undefined;

      if (status != null) {
        handleWriteFailure(status);
      }

      setUploadMessage(message);
    }
  };

  const handleGlobalDragEnter = (e: React.DragEvent) => {
    if (draggedEntry) return;
    if (!e.dataTransfer.types.includes("Files")) return;
    setOsDragCounter((c) => c + 1);
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    if (draggedEntry) return;
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleGlobalDragLeave = () => {
    if (draggedEntry) return;
    setOsDragCounter((c) => {
      const next = c - 1;
      return next < 0 ? 0 : next;
    });
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    if (draggedEntry) return;
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setOsDragCounter(0);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    handleFilesSelected(files);
  };

  const handleCreateFolder = async (name: string) => {
    if (!authorization) return;

    setCreateFolderStatus("loading");
    setCreateFolderError(null);

    try {
      const targetUrl = buildResourceUrl(name.endsWith("/") ? name : name + "/");
      await createDirectory(targetUrl, authorization);
      markWriteSuccess();

      const refreshed = await refreshAutoindexListing();
      setEntries(refreshed.entries);
      setPath(refreshed.path);

      setCreateFolderOpen(false);
      setCreateFolderStatus("idle");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The folder creation failed.";
      const status = error instanceof WebDavError ? error.status : undefined;

      if (status != null) {
        handleWriteFailure(status);
      }

      setCreateFolderStatus("error");
      setCreateFolderError(message);
    }
  };

  const handleCreateFile = async (name: string) => {
    if (!authorization) return;

    setCreateFileStatus("loading");
    setCreateFileError(null);

    try {
      const targetUrl = buildResourceUrl(name);
      await createEmptyFile(targetUrl, authorization);
      markWriteSuccess();

      const refreshed = await refreshAutoindexListing();
      setEntries(refreshed.entries);
      setPath(refreshed.path);

      setCreateFileOpen(false);
      setCreateFileStatus("idle");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The file creation failed.";
      const status = error instanceof WebDavError ? error.status : undefined;

      if (status != null) {
        handleWriteFailure(status);
      }

      setCreateFileStatus("error");
      setCreateFileError(message);
    }
  };

  const handleBatchMove = async (destinationDir: string) => {
    if (!authorization || selectedEntries.length === 0) return;

    setBatchMoveStatus("loading");
    setBatchMoveError(null);

    try {
      const dirUrl = new URL(
        destinationDir.endsWith("/") ? destinationDir : destinationDir + "/",
        window.location.origin,
      ).toString();

      for (const entry of selectedEntries) {
        const sourceUrl = getEntrySourceUrl(entry);
        const destUrl = getEntryDestinationUrl(entry.name, entry.type, dirUrl);
        await moveResource(sourceUrl, destUrl, authorization);
      }

      markWriteSuccess();

      const refreshed = await refreshAutoindexListing();
      setEntries(refreshed.entries);
      setPath(refreshed.path);

      clearSelection();
      setBatchMoveTarget(null);
      setBatchMoveStatus("idle");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The batch move failed.";
      const status = error instanceof WebDavError ? error.status : undefined;

      if (status != null) {
        handleWriteFailure(status);
      }

      setBatchMoveStatus("error");
      setBatchMoveError(message);
    }
  };

  const handleBatchDelete = async () => {
    if (!authorization || selectedEntries.length === 0) return;

    setBatchDeleteStatus("loading");
    setBatchDeleteError(null);

    try {
      for (const entry of selectedEntries) {
        const targetUrl = getEntrySourceUrl(entry);
        await deleteResource(targetUrl, authorization);
      }

      markWriteSuccess();

      const refreshed = await refreshAutoindexListing();
      setEntries(refreshed.entries);
      setPath(refreshed.path);

      clearSelection();
      setBatchDeleteOpen(false);
      setBatchDeleteStatus("idle");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The batch delete failed.";
      const status = error instanceof WebDavError ? error.status : undefined;

      if (status != null) {
        handleWriteFailure(status);
      }

      setBatchDeleteStatus("error");
      setBatchDeleteError(message);
    }
  };

  const handleBatchDownload = () => {
    for (const entry of selectedEntries) {
      if (entry.type === "file") {
        window.open(entry.href, "_blank");
      }
    }
  };

  return (
    <TooltipProvider>
      <div
        className="autoindex-app flex min-h-screen flex-col bg-background text-foreground"
        onDragEnter={handleGlobalDragEnter}
        onDragOver={handleGlobalDragOver}
        onDragLeave={handleGlobalDragLeave}
        onDrop={handleGlobalDrop}
      >
        <DropOverlay visible={osDragCounter > 0} />
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
          {isMobile ? (
            <>
              <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Server
                    className="size-4.5 shrink-0 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                    Sandrone
                  </span>
                </div>

                <Tooltip>
                  <TooltipTrigger
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "size-8 shrink-0",
                      hasActiveSearch && "bg-muted text-foreground",
                    )}
                    onClick={() => setMobileSearchOpen(true)}
                    aria-label="Open search"
                  >
                    <Search className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>Search</TooltipContent>
                </Tooltip>

                {headerAccountControl}
              </div>

              <div className="breadcrumb-scroll mx-auto max-w-7xl overflow-y-auto overflow-x-hidden pl-5 pr-4 pt-2 pb-3">
                <BreadcrumbNav
                  segments={segments}
                  isMobile
                  className="max-h-24"
                  onNavigate={navigateToDirectory}
                />
              </div>
            </>
          ) : (
            <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
              <div className="flex shrink-0 items-center gap-2">
                <Server
                  className="size-4.5 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  Sandrone
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <BreadcrumbNav segments={segments} onNavigate={navigateToDirectory} />
              </div>

              {renderSearchField("w-64 shrink-0")}
              {headerAccountControl}
            </div>
          )}
        </header>

        {hasSelection ? (
          <BulkActionBar
            selectedCount={effectiveHrefs.size}
            totalCount={sorted.length}
            allSelected={allSelected}
            onSelectAll={selectAll}
            onDeselectAll={clearSelection}
            onBatchMove={() => setBatchMoveTarget(selectedEntries[0] ?? null)}
            onBatchDelete={() => setBatchDeleteOpen(true)}
            onDownload={handleBatchDownload}
            isMobile={isMobile}
          />
        ) : (
        <div className="controls-bar border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-10 max-w-7xl items-center gap-2.5 px-4">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "gap-1.5 px-2 text-muted-foreground hover:text-foreground",
                )}
              >
                <ArrowUpDown className="size-3.5" />
                <span className="whitespace-nowrap">Sort: {sortLabel}</span>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuRadioGroup
                  value={sortKey}
                  onValueChange={(value) => {
                    const nextSortKey = value as SortKey;
                    if (nextSortKey !== sortKey) {
                      setSortKey(nextSortKey);
                      setSortDir("asc");
                    }
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "size-8 shrink-0",
                )}
                onClick={() =>
                  setSortDir((currentDir) =>
                    currentDir === "asc" ? "desc" : "asc",
                  )
                }
                aria-label={`Switch to ${sortDir === "asc" ? "descending" : "ascending"} order`}
              >
                {sortDir === "asc" ? (
                  <SortAsc className="size-4" />
                ) : (
                  <SortDesc className="size-4" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {sortDir === "asc" ? "Ascending order" : "Descending order"}
              </TooltipContent>
            </Tooltip>

            <div className="flex-1" />

            {isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                className={cn("shrink-0", isMobile ? "px-2.5" : undefined)}
                onClick={() => setCreateFolderOpen(true)}
                disabled={!canUseUpload}
                aria-label="New Folder"
              >
                <FolderPlus className="size-4" />
                {!isMobile && "New Folder"}
              </Button>
            )}

            {isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                className={cn("shrink-0", isMobile ? "px-2.5" : undefined)}
                onClick={() => setCreateFileOpen(true)}
                disabled={!canUseUpload}
                aria-label="New File"
              >
                <FilePlus className="size-4" />
                {!isMobile && "New File"}
              </Button>
            )}

            {uploadButton}

            {isMobile && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {sorted.length} item{sorted.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        )}

        <main className={cn("mx-auto flex-1 w-full max-w-7xl px-4 py-4 autoindex-content", navigating && "navigating")}>
          {visibleNotice && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{visibleNotice}</span>
            </div>
          )}

          {upHref && (
            <a
              href={upHref}
              className={cn(
                "mb-1 flex items-center gap-3 rounded-md px-4 text-sm transition-colors hover:bg-muted/60 no-underline",
                isMobile ? "py-3" : "py-2.5",
              )}
              onClick={(e) => {
                e.preventDefault();
                navigateToDirectory(upHref);
              }}
            >
              <FolderOpen
                className={cn(
                  "shrink-0 text-yellow-400/90",
                  isMobile ? "size-5" : "size-4.5",
                )}
                strokeWidth={1.5}
              />
              <span className="text-muted-foreground">..</span>
            </a>
          )}

          {shouldShowWebDavUi &&
            isAuthenticated &&
            uploadItems.length > 0 &&
            uploadItems.some(
              (item) =>
                item.status === "pending" ||
                item.status === "conflict" ||
                item.status === "error" ||
                item.status === "checking" ||
                item.status === "uploading",
            ) &&
            !uploadSheetOpen && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Upload queue ready
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {uploadItems.length} file
                    {uploadItems.length === 1 ? "" : "s"} selected for{" "}
                    {path || "/"}.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadSheetOpen(true)}
                  disabled={uploadButtonDisabled}
                >
                  <Upload className="size-4" />
                  Open queue
                </Button>
              </div>
            )}

          {!isMobile && view === "list" && sorted.length > 0 && (
            <div className="mb-0.5 flex items-center gap-3 px-4 py-1.5">
              <span className="w-4.5 shrink-0" />

              <SortButton
                label="Name"
                sortKey="name"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="flex-1"
              />

              <SortButton
                label="Modified"
                sortKey="mtime"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="w-44 justify-end"
              />

              <SortButton
                label="Size"
                sortKey="size"
                current={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="w-20 justify-end"
              />
            </div>
          )}

          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
              <FolderOpen className="size-10 opacity-30" strokeWidth={1} />
              <p className="text-sm">
                {search
                  ? `No files match "${search}"`
                  : "This directory is empty"}
              </p>
              {!search &&
                shouldShowWebDavUi &&
                isAuthenticated &&
                canUseUpload && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateFolderOpen(true)}
                    >
                      <FolderPlus className="size-4" />
                      New Folder
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateFileOpen(true)}
                    >
                      <FilePlus className="size-4" />
                      New File
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadSheetOpen(true)}
                    >
                      <Upload className="size-4" />
                      Upload first file
                    </Button>
                  </div>
                )}
              {search && (
                <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
                  Clear filter
                </Button>
              )}
            </div>
          )}

          {view === "list" ? (
            <div className="flex flex-col gap-px">
              {sorted.map((entry) => (
                <FileRow key={entry.href} entry={entry} isMobile={isMobile} isAuthenticated={isAuthenticated} onRename={(e) => setRenameTarget(e)} onMove={(e) => setMoveTarget(e)} onDelete={(e) => setDeleteTarget(e)} onDragStart={setDraggedEntry} onDragEnd={() => setDraggedEntry(null)} onMoveToDirectory={handleMoveToDirectory} draggedEntry={draggedEntry} selected={effectiveHrefs.has(entry.href)} onToggleSelect={toggleSelect} onNavigate={navigateToDirectory} />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-2",
                isMobile
                  ? "grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8",
              )}
            >
              {sorted.map((entry) => (
                <FileCard key={entry.href} entry={entry} isMobile={isMobile} isAuthenticated={isAuthenticated} onRename={(e) => setRenameTarget(e)} onMove={(e) => setMoveTarget(e)} onDelete={(e) => setDeleteTarget(e)} onDragStart={setDraggedEntry} onDragEnd={() => setDraggedEntry(null)} onMoveToDirectory={handleMoveToDirectory} draggedEntry={draggedEntry} selected={effectiveHrefs.has(entry.href)} onToggleSelect={toggleSelect} onNavigate={navigateToDirectory} />
              ))}
            </div>
          )}
        </main>

        <footer className="border-t border-border bg-background/80 backdrop-blur">
          {isMobile ? (
            <div className="mx-auto flex min-h-9 max-w-7xl items-center justify-center px-4 py-2 text-xs text-muted-foreground">
              <span className="w-full text-center text-muted-foreground/50">
                {creditContent}
              </span>
            </div>
          ) : (
            <div className="relative mx-auto flex min-h-9 h-auto max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs text-muted-foreground">
              <span>
                {dirCount} folder{dirCount !== 1 ? "s" : ""}
              </span>
              <Separator orientation="vertical" className="h-3" />
              <span>
                {fileCount} file{fileCount !== 1 ? "s" : ""}
              </span>

              {totalBytes > 0 && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <span>{formatSizeBytes(totalBytes)} total</span>
                </>
              )}

              {search && filtered.length !== visibleEntries.length && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <span className="text-foreground/70">
                    {sorted.length} shown
                  </span>
                </>
              )}

              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-muted-foreground/50">
                {creditContent}
              </span>
            </div>
          )}
        </footer>
      </div>

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={theme}
        onThemeChange={setTheme}
        view={view}
        onViewChange={setView}
        palette={palette}
        onPaletteChange={setPalette}
        bgBrightness={bgBrightness}
        onBgBrightnessChange={setBgBrightness}
        bgBlur={bgBlur}
        onBgBlurChange={setBgBlur}
      />

      <MobileSearchSheet
        open={effectiveMobileSearchOpen}
        onOpenChange={setMobileSearchOpen}
        search={search}
        onSearchChange={setSearch}
      />

      <AuthSheet
        open={authSheetOpen && shouldShowWebDavUi}
        onOpenChange={setAuthSheetOpen}
        sessionStatus={sessionStatus}
        username={username}
        remember={remember}
        capability={capability}
        message={authMessage}
        error={authError}
        onSignIn={signIn}
        onSignOut={() => {
          signOut();
          setUploadMessage(null);
          clearAll();
        }}
      />

      <UploadSheet
        open={effectiveUploadSheetOpen && shouldShowWebDavUi}
        onOpenChange={(open) => {
          setUploadSheetOpen(open);
          if (!open) setUploadDestination("");
        }}
        currentPath={uploadDestination || path || "/"}
        actualPath={path || "/"}
        items={uploadItems}
        overwriteExisting={overwriteExisting}
        disabled={!canUseUpload || !authorization}
        busy={uploading}
        message={authMessage}
        currentEntries={visibleEntries}
        onOverwriteChange={(checked) => {
          setOverwriteExisting(checked);
          setUploadMessage(null);
        }}
        onFilesSelected={handleFilesSelected}
        onRemoveItem={removeItem}
        onRetryItem={(id) => {
          setUploadMessage(null);
          resetItem(id);
        }}
        onClearFinished={clearFinished}
        onUploadAll={handleUploadAll}
        onDestinationChange={setUploadDestination}
      />

      <RenameSheet
        key={`rename-${renameTarget?.name ?? "none"}`}
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null);
            setRenameStatus("idle");
            setRenameError(null);
          }
        }}
        entry={renameTarget}
        status={renameStatus}
        error={renameError}
        onRename={handleRename}
      />

      <MoveSheet
        key={`move-${moveTarget?.name ?? "none"}`}
        open={moveTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMoveTarget(null);
            setMoveStatus("idle");
            setMoveError(null);
          }
        }}
        entry={moveTarget}
        currentPath={path || "/"}
        actualPath={path || "/"}
        currentEntries={visibleEntries}
        status={moveStatus}
        error={moveError}
        onMove={handleMove}
      />

      <DeleteConfirmSheet
        key={`delete-${deleteTarget?.name ?? "none"}`}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteStatus("idle");
            setDeleteError(null);
          }
        }}
        entry={deleteTarget}
        status={deleteStatus}
        error={deleteError}
        onDelete={handleDelete}
      />

      <CreateFolderSheet
        open={createFolderOpen}
        onOpenChange={(open) => {
          setCreateFolderOpen(open);
          if (!open) {
            setCreateFolderStatus("idle");
            setCreateFolderError(null);
          }
        }}
        currentPath={path || "/"}
        status={createFolderStatus}
        error={createFolderError}
        onCreate={handleCreateFolder}
      />

      <CreateFileSheet
        open={createFileOpen}
        onOpenChange={(open) => {
          setCreateFileOpen(open);
          if (!open) {
            setCreateFileStatus("idle");
            setCreateFileError(null);
          }
        }}
        currentPath={path || "/"}
        status={createFileStatus}
        error={createFileError}
        onCreate={handleCreateFile}
      />

      {/* Batch Move */}
      <MoveSheet
        key={`batch-move-${batchMoveTarget?.name ?? "none"}`}
        open={batchMoveTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBatchMoveTarget(null);
            setBatchMoveStatus("idle");
            setBatchMoveError(null);
          }
        }}
        entry={batchMoveTarget}
        currentPath={path || "/"}
        actualPath={path || "/"}
        currentEntries={visibleEntries}
        status={batchMoveStatus}
        error={batchMoveError}
        onMove={(_, destinationDir) => handleBatchMove(destinationDir)}
      />

      {/* Batch Delete */}
      <DeleteConfirmSheet
        open={batchDeleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBatchDeleteOpen(false);
            setBatchDeleteStatus("idle");
            setBatchDeleteError(null);
          }
        }}
        entry={
          selectedEntries.length > 0
            ? {
                name: `${selectedEntries.length} item${selectedEntries.length === 1 ? "" : "s"}`,
                href: "",
                type: "file",
                mtime: "",
                size: null,
                rawSize: null,
              }
            : null
        }
        status={batchDeleteStatus}
        error={batchDeleteError}
        onDelete={() => handleBatchDelete()}
      />
    </TooltipProvider>
  );
}

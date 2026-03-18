import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronRight,
  CircleAlert,
  FolderOpen,
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
import { DeleteConfirmSheet } from "@/components/autoindex/DeleteConfirmSheet";
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
  buildUploadUrl,
  checkResourceExists,
  deleteResource,
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
}

function FileRow({ entry, isMobile, showSize = true, isAuthenticated, onRename, onMove, onDelete }: FileRowProps) {
  const isDirectory = entry.type === "directory";
  const sizeLabel = isDirectory
    ? null
    : entry.rawSize != null
      ? formatSizeBytes(entry.rawSize)
      : (entry.size ?? null);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 rounded-md hover:bg-muted/60 transition-colors text-sm",
        isMobile ? "py-3" : "py-2.5",
      )}
    >
      <a
        href={entry.href}
        className="flex flex-1 min-w-0 items-center gap-3 no-underline"
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
}

function FileCard({ entry, isMobile, isAuthenticated, onRename, onMove, onDelete }: FileCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col items-center gap-2 rounded-lg border border-border hover:border-ring/40 hover:bg-muted/40 transition-all text-center",
        isMobile ? "p-3" : "p-4",
      )}
    >
      {isAuthenticated && (
        <div className="absolute top-1 right-1">
          <EntryActions
            entry={entry}
            onRename={onRename}
            onMove={onMove}
            onDelete={onDelete}
          />
        </div>
      )}

      <a href={entry.href} className="flex flex-col items-center gap-2 no-underline">
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
}: {
  segments: BreadcrumbSegment[];
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
              window.location.assign(segment.href);
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
}

function BreadcrumbSegmentItem({
  segment,
  isLast,
  isMobile,
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
    >
      {segment.label}
    </a>
  );
}

function BreadcrumbNav({
  segments,
  isMobile = false,
  className,
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
              <BreadcrumbOverflowMenu segments={item.segments} />
            ) : (
              <BreadcrumbSegmentItem
                segment={item.segment}
                isLast={item.isLast}
                isMobile={isMobile}
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

  const preferredTheme = palette === "sandrone" ? "dark" : theme;
  const effectiveMobileSearchOpen = isMobile ? mobileSearchOpen : false;
  const effectiveUploadSheetOpen = isAuthenticated ? uploadSheetOpen : false;

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
      const targetUrl = buildUploadUrl(item.file.name);

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

  const handleRename = async (entry: Entry, newName: string) => {
    if (!authorization) return;

    setRenameStatus("loading");
    setRenameError(null);

    try {
      const sourceUrl = buildResourceUrl(entry.name);
      const destUrl = buildResourceUrl(newName);
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

  const handleMove = async (entry: Entry, destinationPath: string) => {
    if (!authorization) return;

    setMoveStatus("loading");
    setMoveError(null);

    try {
      const sourceUrl = buildResourceUrl(entry.name);
      const destUrl = new URL(destinationPath, window.location.origin).toString();
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
      const targetUrl = buildResourceUrl(entry.name);
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

  return (
    <TooltipProvider>
      <div className="autoindex-app flex min-h-screen flex-col bg-background text-foreground">
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
                <BreadcrumbNav segments={segments} />
              </div>

              {renderSearchField("w-64 shrink-0")}
              {headerAccountControl}
            </div>
          )}
        </header>

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

            {uploadButton}

            {isMobile && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {sorted.length} item{sorted.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-4">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadSheetOpen(true)}
                  >
                    <Upload className="size-4" />
                    Upload first file
                  </Button>
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
                <FileRow key={entry.href} entry={entry} isMobile={isMobile} isAuthenticated={isAuthenticated} onRename={(e) => setRenameTarget(e)} onMove={(e) => setMoveTarget(e)} onDelete={(e) => setDeleteTarget(e)} />
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
                <FileCard key={entry.href} entry={entry} isMobile={isMobile} isAuthenticated={isAuthenticated} onRename={(e) => setRenameTarget(e)} onMove={(e) => setMoveTarget(e)} onDelete={(e) => setDeleteTarget(e)} />
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
        onOpenChange={setUploadSheetOpen}
        currentPath={path || "/"}
        items={uploadItems}
        overwriteExisting={overwriteExisting}
        disabled={!canUseUpload || !authorization}
        busy={uploading}
        message={authMessage}
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
    </TooltipProvider>
  );
}

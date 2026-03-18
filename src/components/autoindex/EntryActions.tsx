import { FolderInput, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Entry } from "@/lib/parser";
import { cn } from "@/lib/utils";

interface EntryActionsProps {
  entry: Entry;
  onRename: (entry: Entry) => void;
  onMove: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  className?: string;
}

export function EntryActions({
  entry,
  onRename,
  onMove,
  onDelete,
  className,
}: EntryActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "size-7 text-muted-foreground hover:text-foreground",
          className,
        )}
        aria-label={`Actions for ${entry.name}`}
        onClick={(e) => e.preventDefault()}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onRename(entry)}>
          <Pencil className="size-4" />
          <span>Rename</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onMove(entry)}>
          <FolderInput className="size-4" />
          <span>Move</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={() => onDelete(entry)}>
          <Trash2 className="size-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

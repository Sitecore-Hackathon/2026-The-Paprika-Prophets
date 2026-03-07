"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SiteTree, type SelectedTreeItem } from "@/components/wizard/site-tree";
import { Icon } from "@/lib/icon";
import { mdiDotsHorizontal } from "@mdi/js";

const GUID_BARE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUID_BRACED = /^\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}$/i;

function isValidGuid(value: string): boolean {
  const v = value.trim();
  return GUID_BARE.test(v) || GUID_BRACED.test(v);
}

type ItemPickerInputProps = {
  id: string;
  label: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  value: string;
  selectedItem: SelectedTreeItem | null;
  onChange: (id: string) => void;
  onSelect: (item: SelectedTreeItem) => void;
  onBlur?: () => void;
};

export function ItemPickerInput({
  id,
  label,
  hint,
  placeholder = "{00000000-0000-0000-0000-000000000000}",
  required,
  error,
  value,
  selectedItem,
  onChange,
  onSelect,
  onBlur,
}: ItemPickerInputProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`font-mono text-xs${(value && !isValidGuid(value)) || error ? " border-destructive focus-visible:ring-destructive" : ""}`}
          aria-invalid={(value ? !isValidGuid(value) : undefined) || !!error}
          onBlur={onBlur}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" colorScheme="neutral" title="Browse tree">
              <Icon path={mdiDotsHorizontal} size={0.85} />
            </Button>
          </DialogTrigger>
          <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Browse Sitecore Tree</DialogTitle>
            </DialogHeader>
            <SiteTree
              selectedPath={selectedItem?.path ?? null}
              onSelect={(item) => {
                onSelect(item);
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      {value && !isValidGuid(value) && (
        <p className="text-xs text-destructive">Must be a valid GUID.</p>
      )}
      {(!value || isValidGuid(value)) && (
        selectedItem ? (
          <p className="text-xs text-muted-foreground flex items-baseline gap-1 min-w-0">
            <span className="font-medium text-foreground shrink-0">{selectedItem.name}</span>
            <span className="truncate opacity-70">{selectedItem.path}</span>
          </p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null
      )}
    </div>
  );
}

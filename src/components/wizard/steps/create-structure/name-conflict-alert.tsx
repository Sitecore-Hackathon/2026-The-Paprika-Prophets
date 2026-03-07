"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ConflictItem = { original: string; resolved: string };

type Props = {
  items: ConflictItem[];
};

export function NameConflictAlert({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <Alert variant="warning">
      <AlertTitle>Name conflict{items.length > 1 ? "s" : ""} detected</AlertTitle>
      <AlertDescription>
        {items.length > 1 && (
          <p className="mb-2">The following items already exist and will be created with a different name:</p>
        )}
        <ul className="space-y-1">
          {items.map(({ original, resolved }) => (
            <li key={original} className="text-sm flex items-center gap-2">
              <span className="line-through text-muted-foreground">{original}</span>
              <span>→</span>
              <span className="font-medium">{resolved}</span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export function FileDropZone({ onFilesSelected }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFilesSelected(Array.from(files));
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  return (
    <Card
      className="flex flex-col items-center justify-center gap-4 border-2 border-dashed p-12"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <p className="text-sm text-muted-foreground">
        Drag and drop CSV files here, or
      </p>
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        Browse
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
    </Card>
  );
}

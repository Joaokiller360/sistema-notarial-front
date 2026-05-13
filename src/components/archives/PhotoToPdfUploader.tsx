"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, FileOutput, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { archivesService } from "@/services";
import { useSystemSettings } from "@/hooks";

const ACCEPTED_TYPES = ["image/jpeg", "image/png"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

interface ImageItem {
  id: string;
  file: File;
  preview: string;
}

interface PhotoToPdfUploaderProps {
  archiveId: string;
}

export function PhotoToPdfUploader({ archiveId }: PhotoToPdfUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ImageItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const { config, fetchConfig } = useSystemSettings();
  useEffect(() => { fetchConfig(); }, [fetchConfig]);
  const maxImages = config?.maxPdfImages ?? 20;

  useEffect(() => {
    return () => { items.forEach((item) => URL.revokeObjectURL(item.preview)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const valid: ImageItem[] = [];

    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" no es una imagen válida (jpg, png).`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`"${file.name}" supera el límite de 10 MB.`);
        continue;
      }
      valid.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }

    if (valid.length > 0) {
      setItems((prev) => {
        const remaining = maxImages - prev.length;
        if (remaining <= 0) {
          toast.error(`Límite alcanzado: máximo ${maxImages} imágenes.`);
          return prev;
        }
        const toAdd = valid.slice(0, remaining);
        if (valid.length > remaining) {
          toast.warning(`Solo se agregaron ${remaining} de ${valid.length} imágenes (límite: ${maxImages}).`);
        }
        return [...prev, ...toAdd];
      });
    }
  }, [maxImages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  // ── Drag & Drop reordering ────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (index !== overIndex) setOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setOverIndex(null);
  };

  // ── Generate PDF ──────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (items.length === 0) return;
    setIsGenerating(true);
    try {
      await archivesService.generatePdf(archiveId, items.map((i) => i.file));
      toast.success("PDF generado correctamente.");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (status === 404) {
        toast.error("Archivo no encontrado.");
        router.push("/archives");
        return;
      }
      toast.error(msg ?? "No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const atLimit = items.length >= maxImages;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileOutput className="w-4 h-4 text-primary" />
          Generar PDF desde imágenes
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { if (!atLimit) e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); if (!atLimit && e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
          onClick={() => !atLimit && inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed transition-colors",
            atLimit
              ? "border-border opacity-50 cursor-not-allowed"
              : "border-border hover:border-primary/50 hover:bg-muted/20 cursor-pointer"
          )}
        >
          <ImagePlus className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {atLimit ? `Límite alcanzado (${maxImages} imágenes)` : "Arrastra imágenes aquí"}
          </p>
          {!atLimit && (
            <p className="text-xs text-muted-foreground">
              o haz clic para seleccionar · JPG, PNG · máx. 10 MB · máx. {maxImages} imágenes
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        {/* Image grid */}
        {items.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Arrastra para reordenar
              </p>
              <Badge
                variant="outline"
                className={cn("text-xs", atLimit && "border-destructive/40 text-destructive")}
              >
                {items.length} / {maxImages} imágenes
              </Badge>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                  className={cn(
                    "relative group rounded-lg border overflow-hidden transition-all select-none",
                    dragIndex === index
                      ? "opacity-40 border-primary/50"
                      : overIndex === index
                      ? "border-primary ring-1 ring-primary scale-[1.02]"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="absolute top-1 left-1 z-10">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-background/90 border border-border text-[10px] font-bold text-foreground leading-none">
                      {index + 1}
                    </span>
                  </div>
                  <div className="absolute top-1 right-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground/70" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                    className="absolute top-1 right-1 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-background/90 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="w-full aspect-[3/4] object-cover"
                    draggable={false}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-foreground truncate">{item.file.name}</p>
                  </div>
                </div>
              ))}

              {!atLimit && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1 aspect-[3/4] rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition-colors text-muted-foreground hover:text-primary"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[10px]">Añadir</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || items.length === 0}
                className="gap-1.5"
              >
                {isGenerating ? (
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileOutput className="w-3.5 h-3.5" />
                )}
                {isGenerating ? "Generando..." : "Generar PDF"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { items.forEach((i) => URL.revokeObjectURL(i.preview)); setItems([]); }}
                disabled={isGenerating}
                className="text-muted-foreground"
              >
                Limpiar todo
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

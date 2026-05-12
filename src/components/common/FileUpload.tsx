"use client";

import { useRef, useState } from "react";
import { Upload, X, FileText, AlertCircle, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FileUploadProps {
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
  /** Upload progress (0-100) driven by the parent while the file is being sent to S3 */
  uploadProgress?: number;
  className?: string;
}

const PDF_SIGNATURE = "%PDF-";

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validates a PDF file for authenticity and known malicious constructs.
 *
 * Checks performed (client-side):
 *  1. Extension must be .pdf
 *  2. Filename must not contain null bytes or path separators
 *  3. MIME type must be application/pdf
 *  4. File size bounds (min 67 B, max configured)
 *  5. Magic bytes: file must start with %PDF-
 *  6. PDF version byte must be a digit (versions 1.x / 2.x)
 *  7. %%EOF marker must be present near end of file (truncation / tampering check)
 *  8. Scan first 512 KB + last 64 KB for dangerous PDF dictionary keys:
 *       /JavaScript, /OpenAction, /Launch, /EmbeddedFile,
 *       /RichMedia, /XFA, /AA — all known exploit / dropper vectors
 *  9. Basic hex-obfuscated /JavaScript detection
 *
 * Limitation: compressed object streams (FlateDecode) are not decompressed here.
 * Server-side antivirus scanning is still recommended as a second layer.
 */
async function validatePDF(file: File, maxBytes: number): Promise<string | null> {
  // 1. Extension check (case-insensitive)
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "El archivo debe tener extensión .pdf.";
  }

  // 2. Filename security: no null bytes or path separators (traversal guard)
  if (/[\x00/\\]/.test(file.name)) {
    return "El nombre del archivo contiene caracteres no permitidos.";
  }

  // 3. MIME type check
  if (file.type && file.type !== "application/pdf") {
    return "El tipo de archivo no corresponde a un PDF (se esperaba application/pdf).";
  }

  // 4. Size bounds
  if (file.size < 67) {
    return "El archivo es demasiado pequeño para ser un PDF válido.";
  }
  if (file.size > maxBytes) {
    return `El archivo no puede superar ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  }

  // Read entire file (max 10 MB) — acceptable for browser context
  const buffer = await readAsArrayBuffer(file);
  const bytes = new Uint8Array(buffer);

  // 5. Magic bytes: first 5 bytes must be %PDF-
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]);
  if (magic !== PDF_SIGNATURE) {
    return "El archivo no es un PDF legítimo.";
  }

  // 6. PDF version byte must be a decimal digit (0x30–0x39)
  if (bytes[5] < 0x30 || bytes[5] > 0x39) {
    return "La versión del PDF no es reconocida o es inválida.";
  }

  // 7. %%EOF end-of-file marker must exist in the last 1024 bytes
  const tailBytes = bytes.slice(Math.max(0, bytes.length - 1024));
  const tail = new TextDecoder("latin1").decode(tailBytes);
  if (!tail.includes("%%EOF")) {
    return "El archivo PDF está incompleto, truncado o fue manipulado.";
  }

  // 8 & 9. Dangerous PDF construct scan
  // We scan the first 512 KB (where PDF header/catalog/info live uncompressed)
  // plus the last 64 KB (where the cross-reference table and trailer live).
  const headText = new TextDecoder("latin1").decode(
    bytes.slice(0, Math.min(bytes.length, 512 * 1024))
  );
  const tailText = new TextDecoder("latin1").decode(
    bytes.slice(Math.max(0, bytes.length - 64 * 1024))
  );
  const scanText = headText + tailText;

  // \b works correctly here because PDF name characters are \w-compatible
  // and name delimiters (space, <, >, [, /, etc.) are all \W.
  const DANGEROUS: Array<{ pattern: RegExp; label: string }> = [
    // JS execution
    { pattern: /\/JavaScript\b/i,         label: "JavaScript embebido" },
    // Auto-execute on open
    { pattern: /\/OpenAction\b/i,          label: "acción automática al abrir el documento" },
    // External process launch (most dangerous: can run .exe, shell commands)
    { pattern: /\/Launch\b/i,              label: "ejecución de procesos externos" },
    // Embedded file attachments (dropper vector)
    { pattern: /\/EmbeddedFile\b/i,        label: "archivos embebidos" },
    // Flash/multimedia embed (historical exploit surface)
    { pattern: /\/RichMedia\b/i,           label: "contenido multimedia embebido" },
    // XFA dynamic forms (scripted, can exfiltrate data)
    { pattern: /\/XFA\b/i,                 label: "formularios XFA dinámicos" },
    // Additional/automatic actions on events
    { pattern: /\/AA\b/i,                  label: "acciones automáticas adicionales" },
    // Hex-obfuscated /JavaScript — e.g. /Java#73cript where #73 = 's'
    { pattern: /\/Java#[0-9a-fA-F]{2}cript/i, label: "JavaScript ofuscado (hex)" },
    // URI actions that auto-execute (submit-form, go-to-URL on open)
    { pattern: /\/SubmitForm\b/i,          label: "envío automático de formulario" },
    // AcroForm with JS actions
    { pattern: /\/ResetForm\b/i,           label: "acción de reinicio de formulario automático" },
  ];

  for (const { pattern, label } of DANGEROUS) {
    if (pattern.test(scanText)) {
      return `Archivo rechazado por seguridad: contiene ${label}.`;
    }
  }

  return null;
}

export function FileUpload({
  value,
  onChange,
  accept = ".pdf",
  maxSizeMB = 10,
  uploadProgress = 0,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  // Tarea 6: confirmación antes de eliminar el archivo seleccionado
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const maxBytes = maxSizeMB * 1024 * 1024;

  const handleFile = async (file: File) => {
    setError(null);
    setIsValidating(true);
    try {
      const err = await validatePDF(file, maxBytes);
      if (err) {
        setError(err);
        return;
      }
      onChange(file);
    } catch {
      setError("No se pudo analizar el archivo. Intenta de nuevo.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-selected after removal
    e.target.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isUploading = !!value && uploadProgress > 0 && uploadProgress < 100;

  return (
    <>
      {/* Tarea 6: confirmación antes de eliminar el archivo seleccionado */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este archivo? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onChange(null); setError(null); setShowRemoveConfirm(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vista previa del archivo verificado */}
      {value ? (
        <div className={cn("rounded-lg border border-border p-4", className)}>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <FileText className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{value.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(value.size)}</p>
            </div>
            <div className="flex items-center gap-2">
              {isUploading ? (
                <span className="text-xs text-muted-foreground font-medium">
                  Subiendo a S3... {uploadProgress}%
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-1 text-xs text-[#1D2C49]/70 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verificado
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setShowRemoveConfirm(true)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          {isUploading && (
            <div className="mt-3">
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}
        </div>
      ) : (
        /* Zona de drop vacía */
        <div className={cn("space-y-2", className)}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isValidating && inputRef.current?.click()}
            className={cn(
              "relative flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed transition-all",
              isValidating
                ? "border-primary/50 bg-primary/5 cursor-wait"
                : isDragging
                ? "border-primary bg-primary/5 cursor-pointer"
                : "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
            )}
          >
            {isValidating ? (
              <>
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Verificando seguridad...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Analizando integridad y contenido del PDF
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Arrastra tu PDF aquí</p>
                  <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionar</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF · máx. {maxSizeMB} MB</p>
                </div>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1D2C49]/50" />
            Verificación automática de integridad y contenido malicioso
          </p>
        </div>
      )}
    </>
  );
}

/**
 * Convierte un archivo de imagen a un data URL JPEG reducido.
 * Se usa para anexar comprobantes al formulario UAFE: hay que achicar las fotos
 * antes de guardarlas en localStorage (cuota ~5 MB) y de meterlas al PDF.
 *
 * @param file     archivo de imagen (jpg/png)
 * @param maxDim   lado mayor máximo en px (default 1000)
 * @param quality  calidad JPEG 0-1 (default 0.7)
 */
export async function fileToCompressedDataUrl(
  file: File,
  maxDim = 1000,
  quality = 0.7
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const largest = Math.max(bitmap.width, bitmap.height) || 1;
    const scale = Math.min(1, maxDim / largest);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D");

    // Fondo blanco (los PNG con transparencia se verían negros en JPEG).
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close?.();
  }
}

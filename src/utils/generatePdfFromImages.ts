import { jsPDF } from "jspdf";

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 10;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function generatePdfFromImages(files: File[]): Promise<File> {
  const maxW = PAGE_W_MM - MARGIN_MM * 2;
  const maxH = PAGE_H_MM - MARGIN_MM * 2;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let i = 0; i < files.length; i++) {
    const dataUrl = await fileToDataUrl(files[i]);
    const { w, h } = await getImageDimensions(dataUrl);

    const ratio = Math.min(maxW / w, maxH / h);
    const imgW = w * ratio;
    const imgH = h * ratio;
    const x = (PAGE_W_MM - imgW) / 2;
    const y = (PAGE_H_MM - imgH) / 2;

    if (i > 0) doc.addPage("a4", "portrait");

    const fmt = files[i].type === "image/png" ? "PNG" : "JPEG";
    doc.addImage(dataUrl, fmt, x, y, imgW, imgH);
  }

  const blob = doc.output("blob");
  return new File([blob], "documento.pdf", { type: "application/pdf" });
}

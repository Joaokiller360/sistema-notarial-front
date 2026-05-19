function readExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  if (view.byteLength < 12) return 1;
  if (view.getUint16(0) !== 0xffd8) return 1; // not JPEG

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset);
    const segLen = view.getUint16(offset + 2);
    if (marker === 0xffe1) {
      if (
        offset + 10 < view.byteLength &&
        view.getUint32(offset + 4) === 0x45786966 && // 'Exif'
        view.getUint16(offset + 8) === 0x0000
      ) {
        const tiff = offset + 10;
        const le = view.getUint16(tiff) === 0x4949;
        const ifd0 = view.getUint32(tiff + 4, le);
        const count = view.getUint16(tiff + ifd0, le);
        for (let i = 0; i < count; i++) {
          const e = tiff + ifd0 + 2 + i * 12;
          if (e + 12 > view.byteLength) break;
          if (view.getUint16(e, le) === 0x0112) {
            return view.getUint16(e + 8, le);
          }
        }
      }
      break;
    }
    if ((marker & 0xff00) !== 0xff00) break;
    offset += 2 + segLen;
  }
  return 1;
}

// CW degrees needed to visually correct each EXIF orientation value
const EXIF_TO_ANGLE: Record<number, number> = {
  1: 0, 2: 0, 3: 180, 4: 0,
  5: 90, 6: 90, 7: 270, 8: 270,
};

export async function normalizeImageOrientation(file: File): Promise<File> {
  let exifOrientation = 1;
  if (file.type === "image/jpeg") {
    const buf = await file.arrayBuffer();
    exifOrientation = readExifOrientation(buf);
  }

  const exifAngle = EXIF_TO_ANGLE[exifOrientation] ?? 0;
  const exifSwapsDims = exifAngle === 90 || exifAngle === 270;

  const bitmap = await createImageBitmap(file);
  const { width: W, height: H } = bitmap;

  // Dimensions after EXIF correction
  const correctedW = exifSwapsDims ? H : W;
  const correctedH = exifSwapsDims ? W : H;

  // If still landscape after EXIF correction, rotate 90° CW to force portrait
  const extraAngle = correctedW > correctedH ? 90 : 0;
  const totalAngle = (exifAngle + extraAngle) % 360;

  if (totalAngle === 0) {
    bitmap.close?.();
    return file;
  }

  const swapFinal = totalAngle === 90 || totalAngle === 270;
  const canvasW = swapFinal ? H : W;
  const canvasH = swapFinal ? W : H;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.rotate((totalAngle * Math.PI) / 180);
  ctx.drawImage(bitmap, -W / 2, -H / 2);
  ctx.restore();
  bitmap.close?.();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("canvas.toBlob failed")); return; }
        resolve(new File([blob], file.name, { type: file.type }));
      },
      file.type,
    );
  });
}

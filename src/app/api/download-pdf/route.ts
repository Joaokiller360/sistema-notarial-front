import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key requerido" }, { status: 400 });
  }

  const auth = request.headers.get("authorization");

  const viewUrlRes = await fetch(
    `${API_URL}/files/view-url?key=${encodeURIComponent(key)}`,
    { headers: auth ? { Authorization: auth } : {} }
  );

  if (!viewUrlRes.ok) {
    return NextResponse.json(
      { error: "No se pudo obtener la URL del archivo" },
      { status: viewUrlRes.status }
    );
  }

  const body = await viewUrlRes.json();
  const url: string =
    body?.data?.viewUrl ?? body?.viewUrl ?? body?.data?.url ?? body?.url;

  if (!url) {
    return NextResponse.json(
      { error: "URL no disponible" },
      { status: 500 }
    );
  }

  const fileRes = await fetch(url);
  if (!fileRes.ok) {
    return NextResponse.json(
      { error: "No se pudo descargar el archivo" },
      { status: fileRes.status }
    );
  }

  const blob = await fileRes.arrayBuffer();
  const filename = key.split("/").pop() || "documento.pdf";

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

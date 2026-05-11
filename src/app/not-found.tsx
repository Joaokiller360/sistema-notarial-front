import { FileX2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-muted/40 border border-border flex items-center justify-center">
            <FileX2 className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-6xl font-bold text-primary/20 font-mono">404</p>
          <h1 className="text-xl font-semibold">No se encontró lo que buscabas</h1>
          <p className="text-sm text-muted-foreground">
            La página o recurso que intentas acceder no existe o fue eliminado.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <ButtonLink href="/dashboard">Ir al inicio</ButtonLink>
          <ButtonLink href="/archives" variant="outline">
            Ver archivos
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

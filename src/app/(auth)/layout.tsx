import { Building2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 flex-col items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="relative z-10 text-center max-w-md">
          <div className="flex items-center justify-center w-42 h-auto p-2.5 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-6">
            <img src="./logo-consejo-judicatura.png" alt="logo-consejo-judicatura" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Sistema de Gestión Notarial
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            Plataforma profesional para la gestión integral de archivos y
            documentos notariales.
          </p>

          {/*
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { label: "Archivos Seguros", desc: "Gestión centralizada y segura" },
              { label: "Control de Roles", desc: "Acceso basado en permisos" },
              { label: "Multi-usuario", desc: "Trabajo en equipo eficiente" },
              { label: "Trazabilidad", desc: "Historial completo de cambios" },
            ].map((feature) => (
              <div
                key={feature.label}
                className="p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <p className="text-sm font-semibold text-white">
                  {feature.label}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{feature.desc}</p>
              </div>
            ))}
          </div>
          */}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-sidebar">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

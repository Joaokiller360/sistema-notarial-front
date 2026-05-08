# Sistema de Gestión Notarial — Frontend

Plataforma web profesional para la gestión integral de archivos y documentos notariales. Interfaz moderna estilo Stripe / Linear / Vercel Dashboard.

---

## Stack Tecnológico

| Tecnología | Propósito |
|---|---|
| **Next.js 16** | Framework con App Router |
| **TypeScript** | Tipado estático |
| **TailwindCSS v4** | Estilos utilitarios |
| **Shadcn/ui v4** | Componentes UI (Base UI) |
| **Zustand** | Estado global |
| **React Hook Form + Zod** | Formularios y validación |
| **Axios** | Cliente HTTP con interceptors |
| **Sonner** | Toast notifications |

---

## Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local

# Desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Variables de Entorno

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_JWT_EXPIRES_IN=3600
NEXT_PUBLIC_APP_NAME="Sistema de Gestión Notarial"
```

---

## Rutas del Sistema

### Autenticación (públicas)
- `/login` — Inicio de sesión
- `/forgot-password` — Recuperar contraseña
- `/reset-password?token=xxx` — Restablecer contraseña

### Dashboard (protegidas)
- `/dashboard` — Panel principal
- `/archives` — Listado de archivos
- `/archives/new` — Crear archivo
- `/archives/:id` — Ver detalle
- `/archives/:id/edit` — Editar archivo
- `/users` — Gestión de usuarios *(SUPER_ADMIN, NOTARIO)*
- `/users/new` — Crear usuario
- `/users/:id/edit` — Editar usuario
- `/settings/profile` — Perfil
- `/settings/security` — Cambio de contraseña
- `/settings/system` — Config. del sistema *(SUPER_ADMIN)*

---

## Roles RBAC

| Rol | Nivel de acceso |
|---|---|
| `SUPER_ADMIN` | Acceso total |
| `NOTARIO` | Archivos + Usuarios |
| `MATRIZADOR` | Crear/editar archivos |
| `ARCHIVADOR` | Solo visualización |

---

## Arquitectura

```
src/
├── app/            # Páginas (App Router)
├── api/            # Cliente Axios
├── components/     # UI reutilizable
├── guards/         # Auth + Role guards
├── hooks/          # useAuth, useArchives, useUsers, usePermissions
├── middleware.ts   # Protección de rutas
├── providers/      # Providers globales
├── services/       # Llamadas al backend
├── store/          # Estado global (Zustand)
├── types/          # Interfaces TypeScript
└── utils/          # Utilidades
```

---

## Comandos

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# sistema-notarial-front

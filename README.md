# Sistema de Gestión Notarial — Frontend

Plataforma web para la gestión integral de archivos, clientes y usuarios notariales. Interfaz moderna construida con Next.js 16 y App Router.

---

## Stack Tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| **Next.js** | 16.2.6 | Framework con App Router |
| **React** | 19.2.4 | UI |
| **TypeScript** | ^5 | Tipado estático |
| **TailwindCSS** | v4 | Estilos utilitarios |
| **Shadcn/ui** | v4 (Base UI) | Componentes UI |
| **Zustand** | ^5 | Estado global |
| **React Hook Form** | ^7 | Formularios |
| **Zod** | ^4 | Validación de esquemas |
| **Axios** | ^1 | Cliente HTTP con interceptors |
| **Sonner** | ^2 | Toast notifications |

---

## Instalación

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Variables de Entorno

```env
NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
```

---

## Rutas del Sistema

### Autenticación (públicas)
| Ruta | Descripción |
|---|---|
| `/login` | Inicio de sesión |
| `/forgot-password` | Recuperar contraseña |
| `/reset-password?token=xxx` | Restablecer contraseña |

### Dashboard (protegidas — requieren JWT)
| Ruta | Descripción | Roles |
|---|---|---|
| `/dashboard` | Panel principal con métricas | Todos |
| `/archives` | Listado de archivos | Todos |
| `/archives/new` | Crear archivo + subir PDF | SUPER_ADMIN, NOTARIO, ARCHIVADOR |
| `/archives/:id` | Ver detalle del archivo | Todos |
| `/archives/:id/edit` | Editar archivo + reemplazar PDF | SUPER_ADMIN, NOTARIO, ARCHIVADOR |
| `/clients` | Listado de clientes | Todos |
| `/clients/:id` | Ver detalle del cliente | Todos |
| `/users` | Gestión de usuarios | SUPER_ADMIN, NOTARIO |
| `/users/new` | Crear usuario | SUPER_ADMIN, NOTARIO |
| `/users/:id/edit` | Editar usuario | SUPER_ADMIN, NOTARIO |
| `/settings/profile` | Editar perfil personal | Todos |
| `/settings/security` | Cambio de contraseña | Todos |
| `/settings/system` | Configuración del sistema | SUPER_ADMIN |

---

## Roles RBAC

| Rol | Permisos |
|---|---|
| `SUPER_ADMIN` | Acceso total, configuración del sistema |
| `NOTARIO` | Archivos + gestión de usuarios |
| `ARCHIVADOR` | Crear y editar archivos |
| `MATRIZADOR` | Solo visualización de archivos |

---

## Arquitectura

```
src/
├── app/
│   ├── (auth)/           # Login, forgot-password, reset-password
│   └── (dashboard)/      # Páginas protegidas
│       ├── archives/
│       ├── clients/
│       ├── users/
│       ├── dashboard/
│       └── settings/
├── api/
│   └── axios.client.ts   # Cliente Axios con refresh token automático
├── components/
│   ├── common/           # FileUpload, GrantorForm, ClientSearchInput, etc.
│   ├── layout/           # Navbar, Sidebar
│   └── ui/               # Shadcn components
├── guards/               # RoleGuard, AuthGuard
├── hooks/
│   ├── useAuth.ts
│   ├── useArchives.ts
│   ├── useUsers.ts
│   ├── usePermissions.ts
│   ├── useSystemSettings.ts
│   └── useTokenRefresh.ts
├── middleware.ts          # Protección de rutas por JWT
├── providers/            # Providers globales (Auth, Toast)
├── services/             # Llamadas al backend
│   ├── archives.service.ts
│   ├── auth.service.ts
│   ├── clients.service.ts
│   ├── logs.service.ts
│   ├── roles.service.ts
│   ├── system.service.ts
│   └── users.service.ts
├── store/
│   ├── auth.store.ts     # Estado de autenticación (Zustand + persist)
│   └── ui.store.ts
├── types/                # Interfaces TypeScript
└── utils/                # tokenUtils, etc.
```

---

## Funcionalidades Principales

### Archivos
- CRUD completo con tipos: Arrendamiento, Certificación, Diligencia, Protocolo, Otro
- Subida y reemplazo de PDF con validación de seguridad (firma, integridad, malware)
- Tamaño máximo de PDF configurable desde la sección de sistema
- Otorgantes y beneficiarios con **autocompletado** desde la base de clientes

### Clientes
- Búsqueda por nombre o cédula/RUC
- Historial de archivos como otorgante o beneficiario

### Configuración del Sistema *(SUPER_ADMIN)*
- Tamaño máximo de PDF (1–500 MB) guardado en backend (`GET/PATCH /system/config`)

### Seguridad
- JWT con refresh token automático (interceptor Axios)
- Guards de autenticación y rol en cada ruta
- Validación de PDF en cliente: extensión, MIME, firma `%PDF-`, `%%EOF`, y escaneo de construcciones peligrosas (JavaScript, OpenAction, Launch, XFA, etc.)

---

## Comandos

```bash
npm run dev      # Desarrollo
npm run build    # Build de producción
npm run start    # Producción local
npm run lint     # ESLint
```

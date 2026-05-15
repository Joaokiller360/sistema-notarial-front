---
name: project-backend-notary
description: Backend NestJS tiene módulo Notaries completo con Prisma — endpoints disponibles en /notaries
metadata:
  type: project
---

El backend tiene el módulo Notaries implementado (NestJS + Prisma).

**Why:** Se creó para soportar el formulario de registro de notaría en el frontend.

**How to apply:** El frontend usa `POST /notaries` via `notaryService.create()`. Los campos son `notaryName`, `notaryNumber`, `notaryOfficerName`. Si el backend tira error de "Prisma Client no tiene modelo Notary", se necesita correr `prisma generate` localmente — en el contenedor se regenera en build.

Archivos backend creados:
- `prisma/schema.prisma` — modelo Notary
- `prisma/migrations/20260514100000_add_notaries_table/migration.sql`
- `src/modules/notaries/dto/create-notary.dto.ts`
- `src/modules/notaries/dto/update-notary.dto.ts`
- `src/modules/notaries/notaries.service.ts`
- `src/modules/notaries/notaries.controller.ts`
- `src/modules/notaries/notaries.module.ts`
- `src/app.module.ts` — NotariesModule registrado
- `src/common/utils/validators.util.ts` — sanitizeInput helper

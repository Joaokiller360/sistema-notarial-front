# Bloqueo de login por intentos fallidos + Sesión única por dispositivo

> Backend NestJS + Prisma. Implementado 2026-09-08.
> Migración: `20260908120000_add_login_lockout_and_session_epoch` (aplicada a la DB).
> Solo agrega columnas con DEFAULT — no borra ni altera datos existentes.

---

## 1. Bloqueo de cuenta por intentos fallidos

### Comportamiento

- Cada login fallido con **email existente y cuenta activa** incrementa
  `users.failed_login_attempts`.
- Al llegar a `LOGIN_MAX_ATTEMPTS` (default **5**) la cuenta se **bloquea**:
  se setea `users.locked_at = now()`.
- Con la cuenta bloqueada, **todo** intento de login (aunque la contraseña sea
  correcta) responde:

  ```
  HTTP 403 Forbidden
  "Cuenta bloqueada por múltiples intentos fallidos. Contacta a un administrador
   o notario para desbloquearla."
  ```

- El bloqueo es **indefinido**: solo se levanta manualmente (no expira solo).
- Un login correcto (cuenta no bloqueada) resetea `failed_login_attempts` a 0.
- Sigue vigente además el rate-limit por IP existente: `@Throttle login 5/min`.
  Son capas distintas — el throttle protege por IP, el lockout por cuenta.

### Desbloqueo — `POST /auth/unlock-account`

| | |
|---|---|
| Auth | JWT + rol **SUPER_ADMIN** o **NOTARIO** (`RolesGuard` + `@RequireRoles`) |
| Body | `{ "userId": "<uuid>" }` |
| 200 | `{ "success": true, "message": "Cuenta desbloqueada correctamente" }` |
| 403 | rol insuficiente |
| 404 | usuario no existe |

Efecto: `failed_login_attempts = 0`, `locked_at = null`. Audit `ACCOUNT_UNLOCKED`
+ evento de seguridad `AUTH_ACCOUNT_UNLOCKED`.

### Config

| Env | Default | |
|---|---|---|
| `LOGIN_MAX_ATTEMPTS` | `5` | intentos fallidos consecutivos antes de bloquear |

### Campos nuevos expuestos en el módulo Users

`GET /users` y `GET /users/:id` ahora incluyen por usuario:

- `failedLoginAttempts: number`
- `lockedAt: string | null`  ← si no es null, la cuenta está bloqueada

### Auditoría / seguridad

| Acción (tabla `logs`) | Evento SIEM (`SECURITY` logger) |
|---|---|
| `LOGIN_BLOCKED_LOCKED` | `AUTH_ACCOUNT_LOCKED` (al intentar entrar ya bloqueado) |
| `ACCOUNT_LOCKED` | `AUTH_ACCOUNT_LOCKED` (al alcanzar el umbral) |
| `ACCOUNT_UNLOCKED` | `AUTH_ACCOUNT_UNLOCKED` |

---

## 2. Sesión única por dispositivo (corte inmediato)

Un usuario solo puede tener **una sesión activa**. Al iniciar sesión en un
dispositivo nuevo, el anterior queda cortado **al instante**.

### Mecanismo

- Nueva columna `users.session_epoch` (int, default 0). Se incrementa en **cada
  login correcto** y en cada **cambio/reset de contraseña**.
- El **access token JWT** lleva el valor como claim `epoch`.
- `JwtStrategy.validate` compara `payload.epoch` (los tokens viejos sin claim
  cuentan como `0`) contra `users.session_epoch`. Si no coinciden →

  ```
  HTTP 401  "Sesión iniciada en otro dispositivo"
  ```

- En el login además se **revocan todos los refresh tokens** previos del usuario.
- `refresh_tokens.session_epoch` guarda la época en que se emitió cada refresh.
  En `POST /auth/refresh`, si la época del token no coincide con la del usuario →

  ```
  HTTP 401  "Sesión iniciada en otro dispositivo. Inicia sesión nuevamente."
  ```

  Esto **no** se trata como "replay attack" (no escala, no dispara alerta
  CRITICAL) — es el corte normal por sesión única. Audit `SESSION_SUPERSEDED`
  + evento `AUTH_SESSION_SUPERSEDED` (severidad LOW).

- Se eliminó el límite anterior de "máx 5 sesiones activas por usuario"
  (lo reemplaza la revocación total en cada login).

### Ventana de corte

- Refresh token del dispositivo viejo: **inmediato** (revocado en el login nuevo).
- Access token del dispositivo viejo: **inmediato** (falla el chequeo de `epoch`
  en el siguiente request).

---

## 3. Handoff Frontend (repo `sistema-notarial-front`)

1. **Login** — manejar `403` con el mensaje de cuenta bloqueada (mostrar aviso:
   "contacta a un administrador o notario"). Distinguirlo del `401` de
   credenciales inválidas y del `429` de rate-limit.

2. **Lista de usuarios** — mostrar badge "Bloqueada" cuando `lockedAt != null`.
   Añadir acción **"Desbloquear"** visible solo para SUPER_ADMIN / NOTARIO →
   `POST /auth/unlock-account { userId }`. Refrescar la lista tras éxito.

3. **Sesión única** — el interceptor de Axios debe detectar `401` con
   `"Sesión iniciada en otro dispositivo"` y **no** entrar al loop de refresh:
   limpiar tokens/cookie y redirigir a `/login` con un aviso
   ("Tu sesión se cerró porque iniciaste sesión en otro dispositivo").
   Aplica tanto a respuestas de endpoints normales como a `/auth/refresh`.

4. Tras deploy, las sesiones activas actuales siguen funcionando hasta el
   próximo login (los tokens sin claim `epoch` se tratan como época 0, que
   coincide con el default de la BD). El primer login nuevo de cada usuario
   activa el corte de sesión única.

---

## 4. Archivos tocados (backend)

- `prisma/schema.prisma` — `User.failedLoginAttempts`, `User.lockedAt`,
  `User.sessionEpoch`, `RefreshToken.sessionEpoch`
- `prisma/migrations/20260908120000_add_login_lockout_and_session_epoch/`
- `src/config/app.config.ts`, `src/config/env.validation.ts` — `LOGIN_MAX_ATTEMPTS`
- `src/common/decorators/current-user.decorator.ts` — `JwtPayload.epoch`
- `src/common/security/security-logger.service.ts` — `accountLocked`,
  `accountUnlocked`, `sessionSuperseded`
- `src/modules/auth/auth.service.ts` — lockout en `login`, revocación total +
  `sessionEpoch` en `login`/`changePassword`/`resetPassword`, chequeo de época
  en `refreshTokens`, nuevo `unlockAccount`
- `src/modules/auth/auth.controller.ts` — `POST /auth/unlock-account`
- `src/modules/auth/dto/unlock-account.dto.ts` — nuevo
- `src/modules/auth/strategies/jwt.strategy.ts` — gate por `epoch`
- `src/modules/users/users.service.ts` — `USER_SELECT` expone los campos nuevos

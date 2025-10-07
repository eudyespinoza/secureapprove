# SecureApprove — Requerimiento **WebApp** (Backoffice + API)

**Marca/URL:** SecureApprove  
**Producción Web:** https://secureapprove.com  
**API:** https://api.secureapprove.com  
**WS/SSE:** wss://api.secureapprove.com  
**WebAuthn:** rpId=secureapprove.com · rpOrigin=https://secureapprove.com

**Paleta:** Primario `#1F3A5F` · Acento `#2ECC71` · Advertencia `#F39C12` · Error `#E74C3C` · Neutros `#111827/#374151/#D1D5DB/#F9FAFB`  
**Tipografías:** Inter (UI) · Poppins (títulos)  
**Logo:** Escudo + ✔️ legible a **40×40 px** (positivo/negativo/mono)

---

## 1) Objetivo & Alcance
Portal para gestionar usuarios, políticas y solicitudes (pago/documento) y **backend API** que orquesta autenticación **WebAuthn**, aprobaciones firmadas, notificaciones y auditoría.

**Incluye:** Front Next.js, API Node/NestJS, MongoDB (ReplicaSet), Redis, Traefik (TLS), Realtime (WS/SSE + Change Streams), emisión de push (FCM/APNs/WebPush), CI/CD en Ubuntu + Docker/Compose.  
**No incluye (MVP):** verificación de identidad avanzada (KYC/liveness server‑side), PSP propietario (se integra con gateway externo).

---

## 2) FRONTEND (moderno, compacto, intuitivo)
**Stack:** Next.js (App Router) + React + TypeScript · Tailwind + shadcn/ui · lucide-react · React Hook Form + Zod · TanStack Query · Zustand · Framer Motion · Recharts.

**Diseño / UX:**
- Densidad compacta (espaciados 4–16px), `rounded-2xl`, sombras suaves.
- **Dark/Light** completos; contraste AA.
- **Toasts unificados** abajo‑izquierda; no intrusivos; variantes éxito/alerta/error.
- Botón **Cerrar (X) rojo** con *hit area* ≥ 40×40; modales con header/footer angostos.
- Tablas/listas a **ancho completo**; filtros guardables; export CSV.
- Montos altos: acción de **“mantener 2s”** (o deslizar) para confirmar.

**Navegación (rutas Next):**
- `/login`, `/enroll` (passkeys)  
- `/dashboard` (métricas + últimos eventos)  
- `/requests`, `/requests/new`, `/requests/[id]` (detalle + timeline + aprobar)  
- `/policies`, `/users`, `/audit`, `/settings`

**Realtime:**
- Suscripción por `user:{id}` y `request:{id}` via WS/SSE; optimistic UI; reconexión con backoff.

**Rendimiento & Accesibilidad:**
- LCP < 2.5s; TTI < 3s; code‑splitting por ruta; `next/image`; skeletons.
- WCAG 2.1 AA, foco visible, labels y mensajes de error claros.

**Tokens (Tailwind – extracto):**
```ts
// tailwind.config.ts (extracto)
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1F3A5F',
          success: '#2ECC71',
          warn: '#F39C12',
          danger: '#E74C3C',
          ink: { 900:'#111827',700:'#374151',300:'#D1D5DB',50:'#F9FAFB' }
        }
      },
      borderRadius: { '2xl': '1rem' }
    }
  }
}
```

---

## 3) BACKEND / API
**Stack & Servicios:**
- Node.js 20 + **NestJS** (REST; GraphQL opcional).
- MongoDB 7 **ReplicaSet `rs0`** (Change Streams).
- Redis 7 (cache/colas/rate‑limit; BullMQ).
- Workers: `notifier` (APNs/FCM/WebPush), `worker` (tareas).
- Realtime: Change Streams → Pub/Sub (Redis) → Gateway **WS/SSE**.
- JWT con rotación (JWKS).

**Colecciones Mongo (Mongoose):**
- `users { email, name, roles[admin|authorizer|requester|auditor], status }`
- `credentials { userId, type[webauthn|totp|pin], credentialId, publicKey|pinHash, transports[], deviceInfo, revokedAt }`
- `requests { requesterId, type[payment|document], amount, currency, subject, recipients[], payloadHash, policy{ quorum, approvers[], ttlSeconds, sensitivity }, status[pending|authorized|denied|expired], expiresAt }`
- `approvals { requestId, authorizerId, decision[approve|deny], signature, reason, signedAt, deviceInfo }`
- `audit { actorId, action, objectType, objectId, metadata, at }`

**Índices:** `requests(status, createdAt)`, `approvals(requestId)`, `credentials(userId)`, `audit(actorId, at)`.

**Endpoints (resumen):**
- `POST /auth/login` (email+otp/SSO opcional)
- WebAuthn: `POST /webauthn/attestation/options|result`, `POST /webauthn/assertion/options|result`
- Requests: `POST /requests`, `GET /requests`, `GET /requests/:id`, `POST /requests/:id/decision`, `POST /requests/:id/notify`
- Gestión: `GET/POST /users`, `GET/POST /policies`, `GET /audit`, `GET /reports/summary`

**Contratos clave (ejemplos):**
```json
// Crear solicitud
{
  "type": "payment",
  "amount": 123.45,
  "currency": "ARS",
  "subject": "Pago proveedor",
  "recipients": ["CBU/CVU o email"],
  "payloadHash": "base64url(sha256(canonical_payload))",
  "policy": { "quorum": 2, "approvers": ["<userId>"], "ttlSeconds": 900, "sensitivity": "high" }
}
```
```json
// Decisión con WebAuthn
{
  "decision": "approve",
  "webauthnAssertion": {
    "id": "...",
    "rawId": "...",
    "response": { "clientDataJSON": "...", "authenticatorData": "...", "signature": "...", "userHandle": "..." },
    "type": "public-key"
  }
}
```

**Seguridad:**
- **Nunca** almacenar biometría cruda; usar **WebAuthn** (claves públicas).
- TLS 1.2+, **JWT** con `aud/iss/exp` + `jti`; rotación JWKS.
- `challenge` único y con TTL corto; firmar **hash canonizado** + `RequestID` + `origin`.
- mTLS entre servicios internos; CSP estricta; HSTS; CORS: `secureapprove.com` ↔ `api.secureapprove.com`.
- Rate‑limit IP/usuario/dispositivo; protección *push‑fatigue*.

**Privacidad & Cumplimiento (AR – Ley 25.326):**
- Consentimiento explícito, finalidad limitada, minimización, derechos ARCO, registro de base, políticas de retención/eliminación.

**Observabilidad:**
- Logs JSON con `trace_id`; OpenTelemetry; Prometheus (latencias p50/p95, error rate, colas, push delivery).
- Alertas: `p95>600ms (5m)`, `error_rate>2% (5m)`, `push_delivery<90% (15m)`, `expiradas>10%`.

---

## 4) Infraestructura (Ubuntu + Docker/Compose)
**Host:** Ubuntu 22.04 LTS · Docker Engine 27+ · Compose v2.

**Servicios en Compose:** `reverse-proxy` (Traefik v3), `web` (Next), `api` (Nest), `notifier`, `worker`, `mongo` (ReplicaSet), `redis`.

**Traefik (labels clave):**
- Web → `Host(\`secureapprove.com\`)`  
- API/WS → `Host(\`api.secureapprove.com\`)`  
- Certresolver `le` (ACME/Let’s Encrypt)

**Variables `.env`:** `MONGO_URL, REDIS_URL, JWT_SECRET, RP_ID=secureapprove.com, RP_ORIGIN=https://secureapprove.com, ACME_EMAIL, WEB_HOST, API_HOST`.

**Backups:** `mongodump` diario + snapshots de volúmenes; prueba de restauración mensual.

**CI/CD:** GitHub Actions (lint, test, build, `docker buildx`, push a registry, deploy remoto `compose up -d`).

---

## 5) Criterios de Aceptación (WebApp)
- Enrolamiento **passkey** y login *passwordless* funcionando.
- Creación → aprobación → **realtime < 1s** reflejado en UI.
- Push emitido con entrega ≥ **90%** en 15 min; reintentos visibles.
- Auditoría exportable (CSV/JSON) por rango con filtros.

---

## 6) Entregables del Agente (WebApp)
- Código (front/api), `docker-compose.yml` productivo, **OpenAPI.yaml**, colección Postman, dashboards básicos, suite de tests mínima, README y `.env.example`.

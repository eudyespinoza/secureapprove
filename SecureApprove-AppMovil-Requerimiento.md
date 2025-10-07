# SecureApprove — Requerimiento **App Móvil** (Autorizante)

**Marca/URL:** SecureApprove  
**Producción Web:** https://secureapprove.com (para deep links universales)  
**Esquema Deep Link:** secureapprove://request/:id  
**WebAuthn:** passkeys del dispositivo (Face ID/Touch ID/Android Biometrics/Windows Hello via PWA nativa si aplica)

**Paleta:** Primario `#1F3A5F` · Acento `#2ECC71` · Advertencia `#F39C12` · Error `#E74C3C` · Neutros `#111827/#374151/#D1D5DB/#F9FAFB`  
**Tipografías:** Inter (UI) · Poppins (títulos)  
**Logo:** Escudo + ✔️ legible a **40×40 px** (positivo/negativo/mono)

---

## 1) Objetivo & Alcance
Recibir solicitudes y **aprobar/denegar** mediante biometría del dispositivo (WebAuthn/passkeys) o **PIN** de respaldo; notificaciones push; actualización en tiempo real; modo **offline**.

**Plataformas:** iOS 15+ (APNs) · Android 9+ (FCM).  
**No incluye (MVP):** firma electrónica calificada server‑side; KYC avanzado.

---

## 2) FRONTEND MÓVIL (UI/UX moderno, compacto, intuitivo)
**Stack:** React Native + TypeScript · NativeWind (Tailwind RN) o React Native Paper · React Navigation (Stack+Tabs) · Reanimated (gestos/animaciones) · TanStack Query · Zustand · **MMKV/Secure Storage**.

**Diseño / Componentes clave:**
- **Cards de solicitud** densas: monto grande, receptor, **badge** de estado, countdown.
- **Detalle**: hash del documento, hora de expiración, timeline corto.
- Botones **Aprobar/Rechazar** fijos en el pie; confirmación **“mantener 2s”** (o deslizar) para montos altos.
- **Toasts/Snackbar** bajos, no intrusivos; feedback inmediato.

**Pantallas:**
1. **Onboarding/Login** (OTP/SSO) + permisos de notificación.  
2. **Enrolamiento** (passkey/WebAuthn).  
3. **Bandeja** (tabs: pendientes/aprobadas/denegadas/expiradas + filtros/búsqueda).  
4. **Detalle de solicitud**.  
5. **Decisión** (biometría o PIN fallback).  
6. **Ajustes** (dispositivos, tema, notificaciones, cerrar sesión).

**Rendimiento & Accesibilidad:**
- 60 fps en transiciones; **cold start < 2.5s** en gama media; skeletons en listas.
- Áreas táctiles ≥ 44×44; soporte screen readers; hápticos sutiles.

**Dark/Light & Branding:**
- Mismos tokens que Web; icono adaptable; contraste AA.

**Microcopy (ejemplos):** “Revisá y aprobá en 1 toque.” · “Tu identidad, tu firma.” · “Solicitud expira en 12:34”.

---

## 3) BACK (Integración/Soporte App)
**Integraciones API:**
- `GET /requests` (bandeja) · `GET /requests/:id` (detalle).
- WebAuthn: `POST /webauthn/assertion/options` → `POST /webauthn/assertion/result`.
- Push: `POST /push/register` · `POST /push/unregister` (alta/baja de `pushToken`).

**Realtime & Offline:**
- Canal **WS/SSE** autenticado con **JWT** (refresh silencioso); reconexión con backoff y *heartbeat*.
- **Cola offline** de decisiones firmadas; al reconectar, **revalidar challenge** y enviar; anti‑duplicados.

**Seguridad:**
- Claves/secretos en **Keychain/Keystore**; **app attestation** si disponible.
- No enviar PII en notifs; logout revoca `pushToken` y borra cache segura.
- PIN local con Argon2id + lockout progresivo; rate‑limit.

**Manejo de errores:**
- Retries exponenciales; estados “en cola”; distinción clara entre **rechazo del usuario** y **error técnico** (mensajes y logging).

---

## 4) Push & Deep Links
- **APNs/FCM**; payload mínimo (`requestId`, tipo de evento); contexto completo se carga al abrir.
- Deep link `secureapprove://request/:id` y/o Universal Link `https://secureapprove.com/requests/:id`.
- Acciones rápidas (opcional): abrir app y confirmar con biometría.

---

## 5) Criterios de Aceptación (App)
- Recepción de push en foreground/background; apertura correcta al **detalle**.
- Aprobación con biometría en **< 4 s** desde el tap; estado reflejado en **Web < 1 s**.
- Modo **offline** funcional (cola + reintento) **sin duplicados**.
- UI compacta, dark/light, accesibilidad AA en todos los flujos críticos.

---

## 6) Entregables del Agente (App)
- Proyecto RN (o nativos) con README y archivos de entorno (dev/stage/prod).
- Implementación **WebAuthn** + **PIN** fallback.
- Registro de push y **deep links**; cliente **WS/SSE** con reconexión.
- Tests mínimos (unit/integración de flujos críticos) y pipeline CI.
- Íconos/adaptativos y tema dark/light siguiendo el branding.

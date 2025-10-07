# SecureApprove - Production Deployment Checklist

## 📁 Estructura de Archivos para Producción

### ✅ Archivos OBLIGATORIOS para subir:

```
SecureApprove/
├── 📄 package.json                    # Dependencias del monorepo
├── 📄 turbo.json                      # Configuración Turbo
├── 📄 .env.example                    # Template de variables
├── 📄 docker-compose.prod.yml         # Infraestructura de producción
├── 📄 README.md                       # Documentación completa
├── 📄 SECURITY.md                     # Políticas de seguridad
├── 
├── 📁 apps/
│   ├── 📁 api/                        # Backend NestJS
│   │   ├── 📄 package.json
│   │   ├── 📄 Dockerfile.prod
│   │   └── 📁 src/
│   │       ├── 📁 auth/
│   │       ├── 📁 webauthn/
│   │       ├── 📁 users/
│   │       ├── 📁 requests/
│   │       ├── 📁 approvals/
│   │       ├── 📁 notifications/
│   │       ├── 📁 policies/
│   │       ├── 📁 security/
│   │       ├── 📁 monitoring/
│   │       ├── 📁 backup/
│   │       └── 📄 main.ts
│   │
│   ├── 📁 web/                        # Frontend Next.js
│   │   ├── 📄 package.json
│   │   ├── 📄 Dockerfile.prod
│   │   ├── 📄 next.config.js
│   │   └── 📁 src/
│   │       ├── 📁 app/
│   │       ├── 📁 components/
│   │       └── 📁 lib/
│   │
│   └── 📁 mobile/                     # React Native
│       ├── 📄 package.json
│       └── 📁 src/
│
├── 📁 packages/
│   ├── 📁 shared/                     # Tipos compartidos
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   └── 📁 src/
│   └── 📁 ui/                         # Componentes UI
│
├── 📁 infra/
│   ├── 📄 docker-compose.prod.yml     # Producción
│   ├── 📁 mongodb/
│   ├── 📁 redis/
│   └── 📁 backup/
│
├── 📁 .github/
│   └── 📁 workflows/
│       ├── 📄 production.yml          # CI/CD Pipeline
│       └── 📄 security.yml
│
└── 📁 tests/
    ├── 📁 e2e/
    └── 📄 playwright.config.ts
```

### ❌ Archivos que NO debes subir:

```
❌ .env                                # Variables locales
❌ node_modules/                       # Dependencias (se instalan)
❌ dist/                              # Compilados (se generan)
❌ build/                             # Builds (se generan)
❌ .next/                             # Cache Next.js
❌ coverage/                          # Reportes de tests
❌ logs/                              # Logs locales
❌ *.log                              # Archivos de log
❌ .DS_Store                          # Archivos macOS
❌ Thumbs.db                          # Archivos Windows
❌ test-*.js                          # Scripts de prueba local
```
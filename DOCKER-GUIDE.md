# 🐳 SecureApprove Docker Commands Guide

## 📋 Comandos Básicos

### Desarrollo (Simple - Solo BD)
```bash
# Levantar servicios básicos (MongoDB + Redis)
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f

# Parar servicios
docker-compose -f docker-compose.dev.yml down

# Ver estado
docker-compose -f docker-compose.dev.yml ps
```

### Producción (Completo)
```bash
# ⚠️ REQUIERE configurar .env primero!
# Copiar template de producción
cp .env.production .env

# Editar variables (OBLIGATORIO)
# - DOMAIN=tu-dominio.com
# - Contraseñas seguras
# - Claves JWT
# - Configuración externa

# Levantar TODOS los servicios
docker-compose -f infra/docker-compose.prod.yml up -d

# Ver logs de todos los servicios
docker-compose -f infra/docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker-compose -f infra/docker-compose.prod.yml logs -f mongodb-primary

# Parar todos los servicios
docker-compose -f infra/docker-compose.prod.yml down

# Actualizar servicios
docker-compose -f infra/docker-compose.prod.yml pull
docker-compose -f infra/docker-compose.prod.yml up -d --build
```

## 🔍 Comandos de Diagnóstico

### Estado de Contenedores
```bash
# Ver todos los contenedores corriendo
docker ps

# Ver contenedores de SecureApprove solamente
docker ps --filter "name=secureapprove"

# Ver uso de recursos
docker stats

# Ver redes Docker
docker network ls
```

### Logs y Debugging
```bash
# Ver logs de un contenedor específico
docker logs secureapprove-mongodb-dev
docker logs secureapprove-redis-dev

# Entrar a un contenedor
docker exec -it secureapprove-mongodb-dev bash
docker exec -it secureapprove-redis-dev sh

# Probar conexión a MongoDB
docker exec -it secureapprove-mongodb-dev mongosh

# Probar conexión a Redis
docker exec -it secureapprove-redis-dev redis-cli ping
```

## 🛠️ Comandos de Mantenimiento

### Limpieza
```bash
# Limpiar contenedores parados
docker container prune

# Limpiar imágenes sin usar
docker image prune

# Limpiar volúmenes sin usar
docker volume prune

# Limpiar todo (⚠️ CUIDADO)
docker system prune -a
```

### Backups
```bash
# Backup de MongoDB
docker exec secureapprove-mongodb-dev mongodump --out /tmp/backup

# Backup de Redis
docker exec secureapprove-redis-dev redis-cli BGSAVE
```

## 🎯 Escenarios de Uso

### Desarrollo Local
```bash
# 1. Solo base de datos para desarrollo
docker-compose -f docker-compose.dev.yml up -d

# 2. Desarrollar API/Web por separado con Node.js
npm install
npm run dev  # En otra terminal
```

### Testing Completo
```bash
# 1. Configurar entorno mínimo
cp .env.example .env
# Editar variables básicas

# 2. Levantar servicios de producción
docker-compose -f infra/docker-compose.prod.yml up -d

# 3. Verificar salud
curl http://localhost:3001/health  # API
curl http://localhost:3000/health  # Web
```

### Producción Real
```bash
# 1. Configurar entorno completo
cp .env.production .env
# ⚠️ CAMBIAR TODAS LAS CONTRASEÑAS Y CLAVES

# 2. Configurar dominio real
# - DNS apuntando al servidor
# - DOMAIN=mi-dominio.com en .env

# 3. Desplegar
docker-compose -f infra/docker-compose.prod.yml up -d

# 4. Verificar
curl https://mi-dominio.com/health
```

## 📊 Servicios Disponibles

### Desarrollo (docker-compose.dev.yml)
- ✅ MongoDB (puerto 27017)
- ✅ Redis (puerto 6379)

### Producción (infra/docker-compose.prod.yml)
- ✅ Traefik (puertos 80, 443, 8080)
- ✅ MongoDB ReplicaSet (3 instancias)
- ✅ Redis Sentinel (alta disponibilidad)
- ✅ API NestJS (2 instancias)
- ✅ Web Next.js
- ✅ Prometheus (monitoring)
- ✅ Grafana (dashboards)
- ✅ Backup service

## 🚨 Troubleshooting

### Problema: Servicios no inician
```bash
# Ver logs detallados
docker-compose -f infra/docker-compose.prod.yml logs

# Verificar variables de entorno
docker-compose -f infra/docker-compose.prod.yml config
```

### Problema: Puertos ocupados
```bash
# Ver qué usa el puerto
netstat -ano | findstr :27017
netstat -ano | findstr :6379

# Cambiar puertos en docker-compose si es necesario
```

### Problema: Falta memoria
```bash
# Ver uso de recursos
docker stats

# Limpiar contenedores antiguos
docker system prune
```
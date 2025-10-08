# 🔧 SecureApprove - Configuración de Puertos

## Puerto de MongoDB Cambiado

⚠️ **IMPORTANTE**: El puerto de MongoDB ha sido cambiado de `27017` a `27018` para evitar conflictos con otras aplicaciones.

## Configuración Actual de Puertos

### 🔍 Servicios Principales
- **Web App**: `3000`
- **API Test**: `3001` 
- **Grafana**: `3002`

### 🗄️ Bases de Datos
- **MongoDB**: `27018` ⬅️ **CAMBIO: era 27017**
- **Redis**: `6379`

### 🌐 Proxy y Monitoreo
- **Traefik Dashboard**: `8080`
- **Prometheus**: `9090`
- **HTTP**: `80`
- **HTTPS**: `443`

## 📝 Archivos Actualizados

Los siguientes archivos han sido modificados para usar el puerto `27018`:

1. ✅ `infra/docker-compose.simple.yml`
2. ✅ `infra/docker-compose.prod.yml`
3. ✅ `.env.server`

## 🔄 Cómo Aplicar los Cambios

### Si ya tienes servicios corriendo:

```bash
# Detener servicios actuales
docker compose -f infra/docker-compose.simple.yml down

# Copiar nueva configuración
cp .env.server .env

# Reiniciar con nuevo puerto
./deploy-simple.sh
```

### Para nuevas instalaciones:
```bash
# La configuración ya incluye el puerto correcto
./deploy-simple.sh
```

## 🔍 Verificar que el Puerto está Libre

Antes de desplegar, puedes verificar que el puerto 27018 esté disponible:

```bash
# Linux/Mac
netstat -tulpn | grep 27018

# Windows
netstat -an | findstr 27018

# Docker (verificar que no haya conflictos)
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep 27018
```

Si no hay salida, el puerto está libre y listo para usar.

## 📊 Conexión a MongoDB desde Aplicaciones

Si tienes aplicaciones que se conectan directamente a MongoDB, actualiza las conexiones:

### Antes:
```
mongodb://localhost:27017/secureapprove
```

### Ahora:
```
mongodb://localhost:27018/secureapprove
```

### Con credenciales:
```
mongodb://secureapprove:SecureApp123!@localhost:27018/secureapprove
```

## 🚀 Conexión desde Docker Compose

Dentro de Docker Compose, los servicios seguirán usando el puerto interno `27017`, solo el puerto externo cambió:

```yaml
# Esto sigue igual (puerto interno)
MONGODB_URI: mongodb://secureapprove:password@mongodb-primary:27017/secureapprove

# Solo el puerto externo cambió (para acceso desde el host)
ports:
  - "27018:27017"  # host:container
```

¡Los cambios están listos! El sistema ahora usará el puerto `27018` para evitar conflictos con tu MongoDB existente.
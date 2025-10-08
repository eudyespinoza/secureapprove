# 🚀 SecureApprove con Nginx Existente

## 🔄 **Problema: Conflicto de Puertos con Nginx**

Si ya tienes Nginx corriendo en los puertos 80 y 443, SecureApprove se ha configurado automáticamente para usar puertos alternativos.

## 📊 **Nueva Configuración de Puertos**

### ⚡ **Puertos Actualizados:**
- **HTTP**: `8081` (era 80)
- **HTTPS**: `8443` (era 443) 
- **Traefik Dashboard**: `8080`

### 🌐 **URLs de Acceso:**
- **Web App**: `http://tu-servidor:3000` o `http://tu-servidor:8081`
- **API Test**: `http://tu-servidor:3001`
- **Traefik Dashboard**: `http://tu-servidor:8080`
- **Prometheus**: `http://tu-servidor:9090`
- **Grafana**: `http://tu-servidor:3002`

## 🔧 **Opción 1: Usar Puertos Alternativos (Actual)**

Esta es la configuración que acabamos de aplicar. SecureApprove funciona independientemente:

```bash
# Desplegar normalmente
./deploy-simple.sh

# Acceder a SecureApprove
curl http://localhost:3000  # Web directa
curl http://localhost:8081  # A través de Traefik
```

## 🔧 **Opción 2: Integrar con tu Nginx Existente**

Si prefieres que tu Nginx existente maneje el tráfico, podemos configurarlo como proxy:

### 2a. Configuración Nginx como Proxy

Añade esto a tu configuración de Nginx:

```nginx
# /etc/nginx/sites-available/secureapprove
server {
    listen 80;
    server_name secureapprove.tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /traefik/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# SSL version
server {
    listen 443 ssl;
    server_name secureapprove.tu-dominio.com;
    
    ssl_certificate /path/to/your/ssl/cert.pem;
    ssl_certificate_key /path/to/your/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### 2b. Activar la configuración:

```bash
# Crear link simbólico
sudo ln -s /etc/nginx/sites-available/secureapprove /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

## 🔧 **Opción 3: Usar Solo los Servicios (Sin Traefik)**

Si prefieres manejar todo con tu Nginx, podemos crear una versión sin Traefik:

```yaml
# docker-compose-nginx.yml - Solo servicios backend
version: '3.9'
services:
  mongodb-primary:
    # ... configuración MongoDB
  redis-master:  
    # ... configuración Redis
  api-test:
    # ... sin labels de Traefik
  web-test:
    # ... sin labels de Traefik
  # Sin servicio Traefik
```

## 🚀 **Recomendación: Opción 1 (Puertos Alternativos)**

Para la máxima simplicidad, usa la configuración actual:

### ✅ **Ventajas:**
- No requiere modificar tu Nginx existente
- Instalación inmediata sin configuración adicional
- SecureApprove funciona independientemente
- Fácil troubleshooting y mantenimiento

### 📋 **Comandos para Desplegar:**

```bash
# Actualizar y desplegar con nuevos puertos
cd /opt/secureapprove/secureapprove
git pull origin develop
cp .env.server .env
./deploy-simple.sh

# Verificar servicios
curl http://localhost:3000  # Web directa
curl http://localhost:8081  # A través de Traefik (puerto alternativo)
curl http://localhost:3001/health  # API
```

## 🔍 **Verificar Puertos Libres:**

```bash
# Verificar que los nuevos puertos estén libres
netstat -tulpn | grep -E "(8081|8443|8080)"

# Si no hay salida, los puertos están libres ✅
```

## 🌐 **Firewall Update:**

Si tienes firewall, añade los nuevos puertos:

```bash
# UFW
sudo ufw allow 8081
sudo ufw allow 8443

# iptables
sudo iptables -A INPUT -p tcp --dport 8081 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8443 -j ACCEPT
```

¡Con esta configuración SecureApprove funcionará perfectamente junto a tu Nginx existente! 🎉
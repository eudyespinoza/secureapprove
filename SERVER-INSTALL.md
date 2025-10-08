# 🚀 SecureApprove - Guía Completa de Instalación

## 📋 Para Servidores Nuevos (VPS/Cloud)

### Opción 1: Instalación Automática Completa

```bash
# Descargar y ejecutar script de instalación completa
wget https://raw.githubusercontent.com/eudyespinoza/secureapprove/develop/server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

Este script hará **TODA LA INSTALACIÓN AUTOMÁTICAMENTE**:
- ✅ Instala Docker y dependencias
- ✅ Configura firewall
- ✅ Clona el repositorio desde GitHub
- ✅ Configura variables de entorno
- ✅ Despliega todos los servicios
- ✅ Configura permisos y directorios

### Opción 2: Instalación Manual (si ya tienes Git y Docker)

```bash
# 1. Crear directorio e instalar
sudo mkdir -p /opt/secureapprove
cd /opt/secureapprove
sudo git clone https://github.com/eudyespinoza/secureapprove.git secureapprove
cd secureapprove

# 2. Configurar permisos
sudo chown -R $USER:$USER /opt/secureapprove
chmod +x deploy-simple.sh server-setup.sh

# 3. Configurar variables
cp .env.server .env
nano .env  # Editar con tu dominio y contraseñas

# 4. Desplegar
./deploy-simple.sh
```

## 🔧 Para Servidores Existentes (Ya con el código)

Si ya tienes el código pero no funciona Git:

```bash
# Ir al directorio donde está el código
cd /ruta/donde/está/secureapprove

# Reinicializar Git y conectar
git init
git remote add origin https://github.com/eudyespinoza/secureapprove.git
git fetch origin
git checkout develop

# Configurar y desplegar
cp .env.server .env
chmod +x deploy-simple.sh
./deploy-simple.sh
```

## 🚀 Comandos de Una Línea

### Para instalación completa nueva:
```bash
wget -qO- https://raw.githubusercontent.com/eudyespinoza/secureapprove/develop/server-setup.sh | sudo bash
```

### Para servidor con código existente:
```bash
cd /opt/secureapprove/secureapprove && cp .env.server .env && chmod +x deploy-simple.sh && ./deploy-simple.sh
```

## 🌐 URLs de Acceso

Después de la instalación, accede a:

- **Web Principal**: `http://TU-IP:3000`
- **API de Prueba**: `http://TU-IP:3001/health`
- **Dashboard Traefik**: `http://TU-IP:8080`
- **Prometheus**: `http://TU-IP:9090`
- **Grafana**: `http://TU-IP:3002` (admin/admin123)
- **MongoDB**: `TU-IP:27018` (puerto cambiado para evitar conflictos)

## ⚙️ Configuración Post-Instalación

### 1. Configurar Dominio Real
```bash
cd /opt/secureapprove/secureapprove
sudo nano .env

# Cambiar:
DOMAIN=tu-dominio.com
ACME_EMAIL=tu@email.com
```

### 2. Cambiar Contraseñas de Producción
```bash
# Generar contraseñas seguras
openssl rand -base64 32  # Para JWT_SECRET
openssl rand -base64 24  # Para passwords

# Editar .env con las nuevas contraseñas
nano .env
```

### 3. Configurar SSL Automático
```bash
# SSL se configura automáticamente con Traefik
# Solo necesitas apuntar tu dominio al servidor
```

### 4. Reiniciar con Nueva Configuración
```bash
cd /opt/secureapprove/secureapprove
docker compose -f infra/docker-compose.simple.yml down
./deploy-simple.sh
```

## 🔍 Resolución de Problemas

### Error: "No such file or directory .git"
```bash
cd /directorio/del/proyecto
git init
git remote add origin https://github.com/eudyespinoza/secureapprove.git
git fetch origin
git checkout develop
```

### Error: "Permission denied"
```bash
sudo chown -R $USER:$USER /opt/secureapprove
chmod +x *.sh
```

### Error: Variables de entorno faltantes
```bash
cp .env.server .env
# O crear manualmente:
nano .env
```

### Error: Puerto ocupado
```bash
# Ver qué usa el puerto
sudo netstat -tulpn | grep :3000

# Detener servicios conflictivos
docker compose -f infra/docker-compose.simple.yml down
```

### Servicios no responden
```bash
# Ver logs
docker compose -f infra/docker-compose.simple.yml logs -f

# Verificar estado
docker ps

# Reiniciar servicios
docker compose -f infra/docker-compose.simple.yml restart
```

## 📊 Monitoreo y Mantenimiento

### Ver Estado del Sistema
```bash
cd /opt/secureapprove/secureapprove
docker ps
docker compose -f infra/docker-compose.simple.yml ps
```

### Ver Logs en Tiempo Real
```bash
docker compose -f infra/docker-compose.simple.yml logs -f
# O por servicio específico:
docker logs secureapprove-mongodb -f
```

### Backup de Base de Datos
```bash
docker exec secureapprove-mongodb mongodump --db secureapprove --out /backup
```

### Actualizar el Sistema
```bash
cd /opt/secureapprove/secureapprove
git pull origin develop
./deploy-simple.sh
```

## ✅ Checklist de Producción

- [ ] Dominio configurado y apuntando al servidor
- [ ] Contraseñas cambiadas en `.env`
- [ ] Firewall configurado (puertos 80, 443, 22)
- [ ] SSL/TLS funcionando
- [ ] Backup configurado
- [ ] Monitoreo activo (Grafana)
- [ ] Logs configurados
- [ ] Actualizaciones de seguridad aplicadas

¡SecureApprove estará funcionando en menos de 5 minutos! 🎉
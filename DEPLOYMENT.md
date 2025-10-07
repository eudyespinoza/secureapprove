# 🚀 SecureApprove - Despliegue en Producción

## ✅ ¡Sistema Subido a GitHub!

**Repositorio:** https://github.com/eudyespinoza/secureapprove.git

---

## 📋 Pasos para Desplegar en tu Servidor

### 1. **Preparar Servidor**

```bash
# En tu servidor de producción (Ubuntu/CentOS)

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. **Clonar y Configurar**

```bash
# Clonar el repositorio
git clone https://github.com/eudyespinoza/secureapprove.git
cd secureapprove

# Copiar configuración de producción
cp .env.production .env

# ¡IMPORTANTE! Editar variables de entorno
nano .env
```

### 3. **Variables Críticas a Cambiar**

```bash
# En el archivo .env, cambiar OBLIGATORIAMENTE:

DOMAIN=tu-dominio.com
ACME_EMAIL=tu-email@dominio.com

# Generar contraseñas seguras
MONGODB_ROOT_PASSWORD=CAMBIAR_POR_PASSWORD_SEGURO
MONGODB_PASSWORD=CAMBIAR_POR_PASSWORD_SEGURO
REDIS_PASSWORD=CAMBIAR_POR_PASSWORD_SEGURO

# Generar secrets JWT (mínimo 32 caracteres)
JWT_SECRET=CAMBIAR_POR_SECRET_SUPER_SEGURO_32_CHARS
NEXTAUTH_SECRET=CAMBIAR_POR_SECRET_SUPER_SEGURO_32_CHARS

# Configurar servicios externos
FCM_SERVER_KEY=tu-clave-fcm
AWS_ACCESS_KEY_ID=tu-aws-key
AWS_SECRET_ACCESS_KEY=tu-aws-secret
SENTRY_DSN=tu-sentry-dsn
```

### 4. **Desplegar Automáticamente**

```bash
# Hacer ejecutable el script
chmod +x deploy.sh

# Desplegar (¡un solo comando!)
./deploy.sh
```

### 5. **Verificar Despliegue**

```bash
# Verificar estado
./maintenance.sh status

# Ver logs
./maintenance.sh logs

# Health check
curl http://tu-dominio.com/health
curl http://api.tu-dominio.com/health
```

---

## 🔧 Comandos de Mantenimiento

```bash
# Ver estado de todos los servicios
./maintenance.sh status

# Ver logs en tiempo real
./maintenance.sh logs

# Reiniciar servicios
./maintenance.sh restart

# Actualizar sistema
./maintenance.sh update

# Crear backup
./maintenance.sh backup

# Detener todo
./maintenance.sh stop
```

---

## 🌐 URLs después del despliegue

- **Web App:** https://tu-dominio.com
- **API:** https://api.tu-dominio.com
- **API Docs:** https://api.tu-dominio.com/docs
- **Grafana:** https://grafana.tu-dominio.com
- **Traefik:** https://traefik.tu-dominio.com

---

## 🔒 Checklist Post-Despliegue

- [ ] Cambiar todas las contraseñas por defecto
- [ ] Configurar certificados SSL (automático con Let's Encrypt)
- [ ] Configurar DNS para tu dominio
- [ ] Configurar Firebase para notificaciones push
- [ ] Configurar AWS S3 para backups
- [ ] Configurar Sentry para monitoring
- [ ] Probar funcionalidades críticas
- [ ] Configurar alertas de monitoreo

---

## 🆘 Troubleshooting

### Problema: Servicios no inician
```bash
# Verificar logs
docker-compose -f infra/docker-compose.prod.yml logs

# Verificar recursos
docker stats
```

### Problema: No se conecta a la base de datos
```bash
# Verificar MongoDB
docker exec -it secureapprove-mongodb-primary mongosh

# Verificar Redis
docker exec -it secureapprove-redis-master redis-cli ping
```

### Problema: SSL no funciona
```bash
# Verificar configuración Traefik
docker logs secureapprove-traefik

# Verificar DNS
nslookup tu-dominio.com
```

---

## 📱 Testing del Sistema

```bash
# Crear usuario de prueba
curl -X POST https://api.tu-dominio.com/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'

# Crear solicitud de prueba
curl -X POST https://api.tu-dominio.com/api/requests \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Request","priority":"high"}'

# Probar WebAuthn
curl -X POST https://api.tu-dominio.com/api/webauthn/register/begin \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","email":"test@example.com"}'
```

---

## 🎯 Próximos Pasos

1. **Configurar dominio y DNS**
2. **Ejecutar `./deploy.sh`**
3. **Probar todas las funcionalidades**
4. **Configurar monitoreo y alertas**
5. **¡Lanzar en producción!** 🚀

---

**¿Necesitas ayuda?**
- 📧 Contacto: dev@secureapprove.com
- 📚 Documentación: README.md
- 🐛 Issues: GitHub Issues

¡SecureApprove está listo para producción! 🎉
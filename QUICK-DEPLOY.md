# 🚀 SecureApprove - Guía de Despliegue Rápido

## Pa- **Web Principal**: `http://tu-servidor:3000`
- **API de Prueba**: `http://tu-servidor:3001`
- **Dashboard Traefik**: `http://tu-servidor:8080`
- **Prometheus**: `http://tu-servidor:9090`
- **Grafana**: `http://tu-servidor:3002` (admin/admin123)
- **MongoDB**: `tu-servidor:27019` (puerto cambiado para evitar conflictos)ara Desplegar en Tu Servidor

### 1. En tu servidor VPS (donde tienes el error):

```bash
# 1. Ir al directorio del proyecto
cd /opt/secureapprove/secureapprove

# 2. Copiar las variables de entorno
cp .env.server .env

# 3. Editar el dominio real (opcional)
nano .env
# Cambiar DOMAIN=localhost por tu dominio real

# 4. Dar permisos al script
chmod +x deploy-simple.sh

# 5. Ejecutar despliegue simplificado
./deploy-simple.sh
```

### 2. Si tienes problemas, usa los comandos manuales:

```bash
# Usar la configuración simplificada
docker compose -f infra/docker-compose.simple.yml down
docker compose -f infra/docker-compose.simple.yml up -d

# Ver los logs
docker compose -f infra/docker-compose.simple.yml logs -f
```

### 3. Verificar que todo funciona:

```bash
# API de prueba
curl http://localhost:3001/health

# Web básica
curl http://localhost:3000

# Estado de contenedores
docker ps

# Ver logs específicos
docker logs secureapprove-mongodb
docker logs secureapprove-redis
docker logs secureapprove-traefik
```

### 4. Acceder a los servicios:

- **Web Principal**: http://tu-servidor:3000
- **API de Prueba**: http://tu-servidor:3001
- **Dashboard Traefik**: http://tu-servidor:8080
- **Prometheus**: http://tu-servidor:9090
- **Grafana**: http://tu-servidor:3002 (admin/admin123)

### 5. Para producción real, cambiar:

```bash
# Editar .env con datos reales
nano .env
```

Cambiar estas variables importantes:
- `DOMAIN=tu-dominio.com`
- `MONGODB_ROOT_PASSWORD=password-seguro`
- `MONGODB_PASSWORD=password-seguro`
- `REDIS_PASSWORD=password-seguro`
- `JWT_SECRET=clave-super-secreta-minimo-32-caracteres`
- `GRAFANA_ADMIN_PASSWORD=password-seguro`

## ⚡ Script de Una Línea

Para desplegar todo rápidamente:

```bash
cd /opt/secureapprove/secureapprove && cp .env.server .env && chmod +x deploy-simple.sh && ./deploy-simple.sh
```

## 🔧 Troubleshooting

### Si hay errores de variables:
```bash
# Verificar que existe .env
ls -la .env

# Ver el contenido
cat .env
```

### Si hay problemas con Docker:
```bash
# Limpiar contenedores
docker system prune -f

# Reiniciar Docker (si es necesario)
sudo systemctl restart docker
```

### Si no responden los servicios:
```bash
# Esperar más tiempo
sleep 30

# Ver logs detallados
docker compose -f infra/docker-compose.simple.yml logs api-test
docker compose -f infra/docker-compose.simple.yml logs web-server
```

## 📝 Próximos Pasos

1. **Configurar DNS**: Apuntar tu dominio al servidor
2. **SSL/TLS**: Configurar certificados (Traefik lo hace automático)
3. **Firewall**: Abrir puertos necesarios (80, 443, 3000-3002, 8080, 9090)
4. **Monitoring**: Configurar alertas en Grafana
5. **Backup**: Configurar backup automático de MongoDB

¡El sistema está listo para producción! 🎉
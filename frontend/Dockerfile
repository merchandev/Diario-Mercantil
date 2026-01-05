FROM node:18-alpine

WORKDIR /app

# Instalar dependencias del sistema si son necesarias
RUN apk add --no-cache \
    curl \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Crear usuario node (ya existe) y dar permisos
RUN mkdir -p /app \
    && chown -R node:node /app

# Cambiar a usuario no-root
USER node

# Copiar archivos de dependencias
COPY --chown=node:node package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY --chown=node:node . .

# Exponer puerto
EXPOSE 5173

# Comando por defecto (será sobrescrito por docker-compose)
CMD ["npm", "run", "dev"]
# ─────────────────────────────────────────────────────────────────────────────
# Étape 1 : build de l'application React (Vite)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Installer les dépendances en couche séparée (cache Docker tant que les
# lockfiles ne changent pas).
# .npmrc porte legacy-peer-deps=true (conflit react-leaflet@5 vs react@18).
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# Copier le reste du code et builder.
COPY . .

# L'URL du backend est figée au moment du build (Vite remplace import.meta.env.*).
# On la passe en build-arg -> variable d'env consommée par `npm run build`.
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Étape 2 : servir le build statique avec nginx
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

# Config nginx adaptée à une SPA (fallback index.html pour le routing client).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier uniquement le résultat du build.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

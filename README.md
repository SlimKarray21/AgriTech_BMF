# AgriTech — Admin Web

Interface web d'administration (Admin & Partenaires) du projet AgriTech.
Application React + TypeScript construite avec Vite, consommant le backend Kotlin/Ktor.

## Stack

- **React 18** + **TypeScript**
- **Vite** (build & dev server)
- **Tailwind CSS** + **shadcn/ui** (composants)
- **React Router** (routing)
- **TanStack Query** (data fetching)

## Prérequis

- Node.js 20+
- Le backend AgriTech accessible (par défaut `http://localhost:8080`)

## Développement local

```bash
npm install
npm run dev
```

L'app démarre sur http://localhost:8080 (voir `vite.config.ts`).

### Variables d'environnement

Les variables Vite (`VITE_*`) sont lues depuis un fichier `.env` à la racine de `Admin/` :

| Variable | Description | Défaut |
|---|---|---|
| `VITE_API_BASE_URL` | URL de base du backend Ktor | `http://localhost:8080` |

> Ces variables sont **figées au moment du build** (Vite les remplace dans le bundle).

## Build de production

```bash
npm run build      # génère dist/
npm run preview    # sert le build localement
```

## Docker

L'app est dockerisée (build multi-stage Node → nginx) et intégrée au
`docker-compose.yml` de `AgriTech/` sous le service `admin`.

```bash
cd ../AgriTech
docker compose up -d --build admin
```

L'app est alors servie sur http://localhost:8082 (port configurable via `ADMIN_PORT`).

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualisation du build |
| `npm run lint` | Linter ESLint |
| `npm run test` | Tests (Vitest) |

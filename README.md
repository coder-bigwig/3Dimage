# Mobile Medical 3D Viewer

Mobile-first shared-link medical 3D viewer with a React/Three.js frontend and a Java Spring Boot backend.

## Prerequisites

- Java 17
- Maven 3.9+
- Node.js 24+
- pnpm 10+
- Docker Desktop

## Applications

- `front/`: React, TypeScript, Three.js and Vite.
- `backend/`: Java 17, Spring Boot 4.0.8 and MyBatis 4.0.1.
- `scripts/model-pipeline/`: model validation and conversion orchestration.
- `deploy/`: Docker Compose and Nginx configuration.

## Local development

Copy `front/.env.example` and `backend/.env.example` to local environment files without committing secrets.

```powershell
pnpm --dir front install
pnpm --dir front dev
mvn -f backend/pom.xml spring-boot:run
```

When the frontend dev server is used without Nginx, set `VITE_API_BASE_URL=http://localhost:8080/api/v1`. The synthetic demo viewer route is:

```text
http://localhost:5173/share/demo-valid-token-00000000000000000000
```

## Containers

```powershell
docker compose --env-file deploy/compose/.env.example -f deploy/compose/docker-compose.yml up -d --build
```

After all services become healthy, open `http://localhost:8088/share/demo-valid-token-00000000000000000000`. The expired-state fixture is `http://localhost:8088/share/demo-expired-token-000000000000000000`.

## Security

Never commit patient data, share tokens, database passwords, object-storage credentials, private keys, or signed object URLs. Demo data must be synthetic and non-identifying.

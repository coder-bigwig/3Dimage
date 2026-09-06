FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY front/package.json front/pnpm-lock.yaml front/pnpm-workspace.yaml front/.npmrc ./
# pnpm 12 blocks lifecycle scripts by default; msw is explicitly required by
# the frontend test/runtime dependency graph and needs its generated artifacts.
RUN pnpm config set dangerouslyAllowAllBuilds true && pnpm install --frozen-lockfile
COPY front/ ./
ENV VITE_API_BASE_URL=/api/v1
RUN pnpm build

FROM nginx:1.29-alpine
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

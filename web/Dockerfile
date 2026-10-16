# Senbud landing page (senbud.com): the Next.js static export of web/, served by nginx.
# Dokploy: Build Type Dockerfile, Dockerfile Path web/Dockerfile,
# Docker Context Path . (repo root, for the npm workspace and @senbud/core), container port 80.
# NEXT_PUBLIC_* values are baked in at build time; override them as build args.

FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY web/package.json web/
COPY mobile/package.json mobile/
COPY packages/core/package.json packages/core/
RUN npm ci -w web
COPY packages/core packages/core
COPY web web
ARG NEXT_PUBLIC_SITE_URL=https://senbud.com
ARG NEXT_PUBLIC_API_URL=https://api.senbud.com
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN
RUN cd web && npx next build

FROM nginx:1.27-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/web/out /usr/share/nginx/html

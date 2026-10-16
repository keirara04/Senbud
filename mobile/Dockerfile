# Senbud web app: the Expo web export of mobile/, served by nginx.
# Dokploy: Build Type Dockerfile, Dockerfile Path mobile/Dockerfile,
# Docker Context Path . (repo root, for the npm workspace), container port 80.
# Set EXPO_PUBLIC_API_URL as a build arg; it is baked into the bundle.

FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY mobile/package.json mobile/
COPY web/package.json web/
COPY packages/core/package.json packages/core/
RUN npm ci -w mobile
COPY packages/core packages/core
COPY mobile mobile
ARG EXPO_PUBLIC_API_URL
RUN cd mobile && npx expo export -p web

FROM nginx:1.27-alpine
COPY mobile/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/mobile/dist /usr/share/nginx/html

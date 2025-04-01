## Build for local dev
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS development
WORKDIR /usr/share/app
COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
USER node

## Build for prod
ARG NODE_VERSION
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /usr/share/app
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=development /usr/share/app/node_modules ./node_modules
COPY --chown=node:node . .
RUN npm run build
ENV NODE_ENV production
RUN npm ci --only=production && npm cache clean --force
USER node

## Prod
ARG NODE_VERSION
FROM node:${NODE_VERSION}-alpine AS production
WORKDIR /usr/share/app
COPY --chown=node:node --from=build /usr/share/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/share/app/dist ./dist
CMD [ "node", "dist/main.js" ]

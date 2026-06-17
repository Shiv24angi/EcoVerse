# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

ARG MONGODB_URI
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

# Build-time environment placeholders to prevent pre-rendering crashes
ENV MONGODB_URI=mongodb://localhost:27017/build_placeholder
ENV NEXT_PUBLIC_FIREBASE_API_KEY="mock-api-key-for-build-purposes"
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="mock-auth-domain.firebaseapp.com"
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID="mock-project-id"
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="mock-storage-bucket.appspot.com"
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
ENV NEXT_PUBLIC_FIREBASE_APP_ID="1:1234567890:web:abcdef123456"
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-MOCK123456"

# Build the Next.js app
RUN npm run build

# Stage 3: Production Server
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# These lines copy directly from your local Stage 2 (builder)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
# MyBizz Platform

A production-ready, secure, open-source, free-to-host, responsive Progressive Web App (PWA) for managing multiple independent businesses from one platform.

## Architecture

- **Frontend:** React + TypeScript + Vite + Tailwind CSS (PWA)
- **Backend & Database:** Supabase (PostgreSQL)

## Features

- **Multi-Tenant Security:** Platform Admin has full access to manage all businesses, while Business Owners can only access data relevant to their own specific business.
- **Progressive Web App (PWA):** Installable on any device, with offline fallback.
- **Responsive POS:** High-speed POS interface optimized for mobile and desktop.
- **Inventory & Sales:** Real-time stock tracking and inventory allocation.

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## Production Build

```bash
npm run build
```

## Database

See `DATABASE.md` for information on the multi-tenant PostgreSQL schema.
See `DEPLOYMENT.md` for information on hosting.

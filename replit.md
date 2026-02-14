# KitchenOS - Inventory Management System

## Overview

KitchenOS (재고 관리 시스템) is a Korean-language kitchen/restaurant inventory management system. It tracks ingredients (식자재), their stock levels, and inventory transactions (입고/출고 — stock in/out). The app features a dashboard with analytics charts, ingredient management with low-stock alerts, and a full transaction history. The interface is primarily in Korean.

Key features:
- **Dashboard** with summary stats, stock level charts (recharts), and recent activity
- **Ingredient management** — CRUD operations with brand, unit, and minimum stock level tracking
- **Transaction tracking** — Immutable IN/OUT transactions that automatically adjust stock levels
- **Low stock alerts** — Ingredients at or below their minimum stock level are flagged

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Management**: TanStack React Query for server state, with custom hooks in `client/src/hooks/use-inventory.ts`
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives, styled with Tailwind CSS
- **Charts**: Recharts for dashboard visualizations
- **Forms**: React Hook Form with Zod resolvers for validation
- **Build**: Vite with React plugin
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

The frontend follows a page-based structure with a persistent sidebar layout:
- `Dashboard` — overview stats and charts
- `Inventory` — ingredient list with search, create, edit, delete
- `IngredientDetail` — single ingredient view with transaction history
- `TransactionsList` — full transaction log

### Backend
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript, executed via tsx
- **API Design**: RESTful JSON API under `/api/` prefix. Route definitions are in `shared/routes.ts` using Zod schemas for type-safe request/response contracts
- **Storage Layer**: `server/storage.ts` implements `IStorage` interface using `DatabaseStorage` class — this abstraction allows for potential alternative storage implementations
- **Database seeding**: The server seeds initial data (sample ingredients and transactions) if the database is empty on startup

### Shared Code (`shared/`)
- **`schema.ts`**: Drizzle ORM table definitions and Zod validation schemas. This is the single source of truth for both database structure and API validation
- **`routes.ts`**: API route definitions with method, path, input schemas, and response schemas. Used by both client (for type-safe fetching) and server (for validation)

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (connection via `DATABASE_URL` environment variable)
- **Schema push**: `npm run db:push` (uses drizzle-kit)
- **Tables**:
  - `ingredients` — id, name, brand, unit, currentStock, minStockLevel, lastUpdated
  - `inventory_transactions` — id, ingredientId, type (IN/OUT), quantity, unitPrice, destination, createdAt

Stock levels (`currentStock`) are managed through transactions — when a transaction is created, the ingredient's stock is automatically adjusted (incremented for IN, decremented for OUT).

### Build Process
- **Development**: `npm run dev` — runs tsx with Vite dev server middleware for HMR
- **Production build**: `npm run build` — Vite builds the client to `dist/public`, esbuild bundles the server to `dist/index.cjs`
- **Production start**: `npm start` — runs the bundled server which serves static files

### Key Design Decisions
1. **Shared schema between client and server**: The `shared/` directory contains both Drizzle table definitions and Zod schemas, ensuring type safety across the full stack
2. **Immutable transactions**: Transactions are append-only (create only, no update/delete), providing an audit trail
3. **Stock managed by transactions**: `currentStock` is updated automatically when transactions are created, not edited directly
4. **Interface-based storage**: The `IStorage` interface in `server/storage.ts` abstracts database access, though currently only `DatabaseStorage` (PostgreSQL) is implemented

## External Dependencies

### Database
- **PostgreSQL** — Required. Connection string must be provided via `DATABASE_URL` environment variable
- **Drizzle ORM** — Schema management and queries
- **connect-pg-simple** — PostgreSQL session store (available but sessions not currently used for auth)

### Frontend Libraries
- **shadcn/ui + Radix UI** — Complete UI component library
- **Tailwind CSS** — Utility-first styling
- **Recharts** — Dashboard chart components
- **React Hook Form + Zod** — Form handling and validation
- **date-fns** — Date formatting
- **Lucide React** — Icon library
- **Wouter** — Client-side routing

### Dev/Build Tools
- **Vite** — Frontend bundler with HMR
- **esbuild** — Server bundler for production
- **tsx** — TypeScript execution for development
- **drizzle-kit** — Database migration/push tool

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal` — Error overlay in development
- `@replit/vite-plugin-cartographer` — Development tooling (dev only)
- `@replit/vite-plugin-dev-banner` — Development banner (dev only)
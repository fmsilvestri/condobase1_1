# CONDOBASE1 - Condominium Management System

## Overview

CONDOBASE1 is a comprehensive condominium management web application designed for building administrators (síndicos) and residents (condôminos). The system provides a centralized dashboard for managing all aspects of condominium operations including maintenance requests, utility monitoring (water, gas, energy), pool management, document storage, supplier contacts, and resident communications.

The application follows a Material Design approach with mobile-first responsive design, emphasizing information clarity and predictable interaction patterns for both admin and resident user roles.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Context for UI state (theme)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens, supporting light/dark themes
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization (area charts, pie charts, gauges)
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ES modules)
- **API Pattern**: RESTful JSON API with `/api` prefix
- **Storage**: Supabase client for all data operations (equipment, maintenance, documents, suppliers, announcements)
- **Schema Validation**: Zod schemas shared between frontend and backend
- **Build**: esbuild for production server bundling

### Data Layer
- **Primary Database**: Supabase (PostgreSQL) - system of record for all application data
- **Storage Implementation**: `server/supabase-storage.ts` uses Supabase client for CRUD operations
- **Schema Location**: `shared/schema.ts` - contains all table definitions and Zod insert schemas
- **ORM**: Drizzle ORM available for local PostgreSQL operations (secondary)
- **Case Conversion**: `toSnakeCase`/`toCamelCase` helpers convert between JS camelCase and DB snake_case
- **Migrations**: Schema managed in Supabase dashboard or via Drizzle Kit

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components (custom + shadcn/ui)
│   ├── pages/           # Route components
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities (queryClient, theme, utils)
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API route definitions
│   └── storage.ts       # Data access layer interface
├── shared/              # Shared code between client/server
│   └── schema.ts        # Drizzle schemas and types
└── migrations/          # Database migrations
```

### Key Modules
The application consists of these main feature modules:
- **Dashboard**: Overview cards with status indicators for all modules
- **Ativos & Manutenções**: Equipment management and maintenance requests
- **Manutenção Preventiva**: Preventive maintenance module with asset registry, automated maintenance plans, digital checklists, alerts for overdue/upcoming maintenance, technical history timeline, and management reports
- **Piscina & Qualidade**: Pool chemical readings (pH, chlorine, alkalinity)
- **Água & Reservatórios**: Water tank levels and consumption tracking
- **Gás**: Gas level monitoring with consumption estimates
- **Energia**: Power status and outage event logging
- **Resíduos**: Waste collection schedule and recycling guidelines
- **Ocupação**: Unit occupancy tracking and population estimates
- **Documentos**: Document storage with expiration tracking
- **Fornecedores**: Supplier contact management by category
- **Comunicados**: Announcements and resident communications
- **Equipe e Gestão de Processos**: Team member management (roles, schedules, contacts, CPF, WhatsApp) and operational process tracking (categories, frequencies, assignments, executions). Supports work routines by block/floor, equipment assignment, execution scripts, checklists, PDF generation, and WhatsApp sharing
- **Gestão Locações**: Rental management for Airbnb and temporary stays. Features include guest registration, check-in/check-out tracking, vehicle information, automated WhatsApp welcome messages via Twilio, platform tracking (Airbnb, Booking, direct), and booking code management. Includes configuration settings for condominium-specific welcome message templates.
- **Encomendas**: Parcel tracking system for incoming deliveries. Features include parcel registration (type, carrier, tracking code), recipient notification, pickup confirmation with signature, and status tracking (aguardando, notificado, retirado, devolvido). Supports filtering by unit and search functionality.

### Multi-Tenant Architecture
- **Data Isolation**: Each condominium has isolated data; users only see data for their selected condominium
- **Condominium Context**: `server/condominium-context.ts` middleware resolves active condominium and user role from request headers
- **Headers**: Frontend sends `x-condominium-id` and `x-user-id` headers via `client/src/lib/queryClient.ts`
- **Storage Layer**: All storage methods accept optional `condominiumId` parameter for data filtering
- **Condominium Selector**: Dropdown in sidebar allows switching between condominiums
- **Query Invalidation**: Switching condominiums invalidates cached queries to refresh data

### User Roles
- **Admin (Platform)**: Super administrator with full system access across all condominiums
- **Síndico**: Building administrator with full CRUD access for their assigned condominiums
- **Condômino (Resident)**: Access controlled by síndico via module permissions (read-only for most modules except maintenance requests)
- **Prestador (Service Provider)**: Service providers with limited access to specific modules

### Module Permissions System
- **Location**: `server/routes.ts` (API), `client/src/pages/feature-access.tsx` (UI), `client/src/hooks/use-module-permissions.tsx` (state)
- **Table**: `module_permissions` with moduleKey, moduleLabel, moduleIcon, isEnabled, updatedAt, updatedBy
- **Modules**: manutenções, piscina, água, gás, energia, resíduos, ocupação, documentos, fornecedores, comunicados
- **Access Control**: Síndico/admin can toggle module visibility for condômino users via /controle-acesso page
- **Sidebar Filtering**: `useModulePermissions` hook provides `canAccessModule()` function integrated with sidebar
- **Security**: Frontend guard on FeatureAccess page + backend role verification on PATCH endpoint

### Authentication
- **Supabase Auth**: Email/password and Google OAuth authentication
- **User Model**: email, name, role, unit, isActive, timestamps
- **Admin Panel**: Accessible only to admin and síndico roles via sidebar navigation
- **Session Management**: JWT-based sessions via Supabase
- **Default Síndico**: fmsilvestri39@gmail.com (Hey123!)
- **RLS**: Temporarily disabled for development - re-enable with proper policies for production
- **Per-Condominium Roles**: User roles within condominiums are stored in `user_condominiums` table with `role` column, checked by `requireSindicoOrAdmin` middleware

### API Security
- **JWT Middleware**: `server/auth-middleware.ts` provides `optionalJWT`, `authenticateJWT`, and `requireAuth` middlewares
- **Authentication**: All /api routes (except public) require authentication via `requireAuth`
- **User Identity**: In production, userId comes from JWT only; in development, x-user-id header is accepted for convenience
- **Condominium Access**: Context middleware validates that user is a member of the requested condominium via `user_condominiums` table
- **Tenant Isolation**: All tenant-scoped routes require valid condominium context via `requireCondominium`
- **Route Categories**:
  - Public (no auth): /api/supabase-config, /api/supabase-status
  - User-scoped (auth only): /api/condominiums, /api/users, /api/user-condominiums
  - Tenant-scoped (auth + condominium): All other /api routes
- **Listing Filters**: 
  - /api/condominiums returns only condos user belongs to (admins see all)
  - /api/users restricted to platform admins only
- **FK Constraints**: All tenant tables have foreign key to condominiums.id (NOT NULL)
- **Known Limitation**: Resource-level authorization (checking resource.condominiumId on individual reads/updates by ID) is not yet implemented. Future enhancement needed.

### Real-Time Notifications
- **WebSocket Server**: `server/websocket.ts` - handles WebSocket connections with JWT authentication
- **Authentication Flow**: Client connects to `/ws`, sends auth message with token/userId, server verifies via Supabase auth
- **Notification Types**: `announcement_new`, `announcement_updated`, `maintenance_update`
- **Triggers**: Notifications created when announcements are posted/updated, or maintenance request status changes
- **Frontend Component**: `client/src/components/notification-bell.tsx` - bell icon with unread count badge, dropdown with notification list
- **Security**: Token transmitted via message body (not URL) to avoid logging, verified server-side with Supabase getUser()

## External Dependencies

### Database
- **PostgreSQL**: Primary data store (requires DATABASE_URL environment variable)
- **Drizzle ORM**: Database queries and schema management
- **connect-pg-simple**: Session storage (configured but not yet implemented)

### Frontend Libraries
- **@tanstack/react-query**: Async state management and caching
- **@radix-ui/***: Accessible UI primitives (dialogs, dropdowns, tabs, etc.)
- **recharts**: Chart library for data visualization
- **date-fns**: Date formatting and manipulation
- **react-hook-form**: Form state management
- **zod**: Runtime type validation
- **wouter**: Client-side routing
- **lucide-react**: Icon library
- **embla-carousel-react**: Carousel component
- **vaul**: Drawer component

### Build & Development
- **Vite**: Development server and frontend bundling
- **esbuild**: Production server bundling
- **TypeScript**: Type checking across the codebase
- **Tailwind CSS**: Utility-first styling
- **PostCSS/Autoprefixer**: CSS processing

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development banner
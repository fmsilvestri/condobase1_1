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
- **Storage**: Abstracted storage interface (currently in-memory, designed for PostgreSQL)
- **Schema Validation**: Zod schemas shared between frontend and backend
- **Build**: esbuild for production server bundling

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` - contains all table definitions and Zod insert schemas
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **Migrations**: Drizzle Kit for schema management (`db:push` command)

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
- **Piscina & Qualidade**: Pool chemical readings (pH, chlorine, alkalinity)
- **Água & Reservatórios**: Water tank levels and consumption tracking
- **Gás**: Gas level monitoring with consumption estimates
- **Energia**: Power status and outage event logging
- **Resíduos**: Waste collection schedule and recycling guidelines
- **Ocupação**: Unit occupancy tracking and population estimates
- **Documentos**: Document storage with expiration tracking
- **Fornecedores**: Supplier contact management by category
- **Comunicados**: Announcements and resident communications

### User Roles
- **Admin**: Super administrator with full system access, can manage all users and settings
- **Síndico**: Building administrator with full CRUD access to all modules, report generation, user management
- **Condômino (Resident)**: Read-only access, can open maintenance requests and view supplier contacts

### Authentication
- **Supabase Auth**: Email/password and Google OAuth authentication
- **User Model**: email, name, role, unit, isActive, timestamps
- **Admin Panel**: Accessible only to admin and síndico roles via sidebar navigation
- **Session Management**: JWT-based sessions via Supabase
- **Default Síndico**: fmsilvestri39@gmail.com (Hey123!)
- **RLS**: Temporarily disabled for development - re-enable with proper policies for production

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
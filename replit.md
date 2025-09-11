# GreenGrid - AI-Powered Renewable Energy Management Platform

## Overview

GreenGrid is a full-stack web application that helps households and communities optimize their renewable energy usage through AI-powered forecasting and smart device scheduling recommendations. The platform predicts solar energy generation using weather data, provides intelligent appliance scheduling suggestions, and tracks cost savings and environmental impact. It features community leaderboards to gamify energy efficiency and includes comprehensive analytics dashboards for monitoring renewable energy adoption.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS custom properties for theming and dark mode support
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Charts**: Recharts for data visualization (energy consumption, forecasting)

### Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API server
- **Database ORM**: Drizzle ORM for type-safe database operations and migrations
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **Validation**: Zod schemas shared between frontend and backend for consistent validation
- **Development**: Hot module replacement with Vite middleware integration
- **Build**: ESBuild for production bundling with platform-specific configurations

### Database Design
- **Primary Database**: PostgreSQL (configured for Neon serverless with connection pooling)
- **Schema Structure**:
  - User management (users, authentication)
  - Household setup (location, solar panel specifications, tariff rates)
  - Device management (appliances, consumption patterns, scheduling preferences)
  - Weather and solar forecasting data (hourly weather, PV generation forecasts)
  - Energy tracking (meter readings, consumption history)
  - Recommendations engine (device scheduling suggestions)
  - Community features (leaderboards, member management)

### Service Layer Architecture
- **Weather Service**: Integrates with Open-Meteo API for weather forecasting with fallback to multiple weather providers
- **Solar Service**: PV output calculation using simplified solar modeling (similar to pvlib)
- **Recommendation Engine**: AI-powered device scheduling based on solar generation forecasts and user preferences
- **Authentication Service**: JWT token management and user session handling
- **Scheduler Service**: Background jobs for hourly weather updates and daily recommendation generation

### API Design
- RESTful endpoints following conventional HTTP methods and status codes
- Consistent JSON response format with proper error handling
- JWT Bearer token authentication for protected routes
- Request/response validation using shared Zod schemas
- Structured error responses with meaningful error messages

## External Dependencies

### Core Infrastructure
- **Database**: PostgreSQL via DATABASE_URL (supports Neon serverless and other PostgreSQL providers)
- **Environment Configuration**: Environment variables for all sensitive configurations

### Weather Data Providers
- **Primary**: Open-Meteo API (no API key required, reliable free tier)
- **Secondary**: OpenWeatherMap, Tomorrow.io, WeatherAPI (optional, configurable via API keys)

### Optional Integrations
- **Solar Modeling**: NREL PVWatts API for advanced solar calculations (NREL_API_KEY)
- **Carbon Footprint**: Climatiq or Carbon Interface APIs for enhanced CO2 tracking
- **Notifications**: Telegram Bot API for daily recommendations and alerts (TELEGRAM_BOT_TOKEN)

### Development Tools
- **Type Safety**: Comprehensive TypeScript configuration across client, server, and shared modules
- **Code Quality**: ESLint and Prettier integration for consistent code formatting
- **Build Tools**: Vite for frontend, ESBuild for backend, with development hot reload support
- **Database Management**: Drizzle Kit for schema migrations and database operations

### UI and Styling Dependencies
- **Component System**: Radix UI primitives for accessible, unstyled components
- **Styling Framework**: Tailwind CSS with custom design tokens and theming support
- **Icons**: Lucide React for consistent iconography
- **Data Visualization**: Recharts for energy charts, forecasting graphs, and analytics dashboards
- **Form Handling**: React Hook Form with Hookform Resolvers for Zod integration
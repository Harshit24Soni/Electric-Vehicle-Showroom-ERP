# EV Showroom ERP - Frontend

A modern, responsive React frontend for the Electric Vehicle Showroom ERP system.

## Features

- ✅ Module-based architecture for easy maintenance
- ✅ Role-based access control (Admin, Dealer, Staff)
- ✅ Responsive design (Desktop & Mobile)
- ✅ Complete integration with all backend APIs
- ✅ Modern UI with Tailwind CSS
- ✅ Type-safe with TypeScript
- ✅ State management with Zustand
- ✅ Data fetching with TanStack Query

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable components
│   │   └── layout/          # Layout components (Sidebar, Header, etc.)
│   ├── lib/                 # Utilities and API client
│   ├── modules/             # Feature modules
│   │   ├── auth/           # Authentication
│   │   ├── dashboard/      # Dashboard
│   │   ├── master/         # Master data (Customers, Vehicles, etc.)
│   │   ├── sales/          # Sales management
│   │   ├── inventory/      # Inventory management
│   │   ├── billing/        # Billing & Invoices
│   │   ├── service/        # Service management
│   │   ├── warranty/       # Warranty claims
│   │   ├── crm/           # CRM & Leads
│   │   ├── insurance/     # Insurance policies
│   │   ├── reports/       # Reports
│   │   ├── admin/         # Admin (Staff management)
│   │   └── staff/         # Staff profile
│   ├── store/             # State management
│   └── App.tsx            # Main app component
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8000/api
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Module-Based Architecture

Each module is self-contained with:
- `api/` - API functions
- `pages/` - Page components
- `components/` - Module-specific components

This makes it easy to:
- Add new modules by creating a new folder
- Remove modules by deleting the folder
- Maintain modules independently

## Role-Based Access

- **ADMIN**: Full access to all features including staff management
- **DEALER**: Access to all business features except technical/admin settings
- **STAFF**: Access to operational features (sales, service, CRM)

## Responsive Design

The frontend is fully responsive and works on:
- Desktop (1920px+)
- Tablet (768px - 1920px)
- Mobile (< 768px)

## API Integration

All modules are integrated with the backend APIs:
- Authentication: `/auth/*`
- Master Data: `/master/*`
- Sales: `/sales/*`
- Inventory: `/inventory/*`
- Billing: `/billing/*`
- Service: `/service/*`
- Warranty: `/warranty/*`
- CRM: `/crm/*`
- Insurance: `/insurance/*`
- Reports: `/reports/*`
- Admin: `/admin/*`
- Staff: `/staff/*`

## Development Notes

- All API calls use the centralized `api` client
- Authentication tokens are automatically included in requests
- Error handling is centralized in the API client
- Forms use React Hook Form with Zod validation
- Data fetching uses TanStack Query for caching and state management

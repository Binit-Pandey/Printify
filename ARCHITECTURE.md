# Prime Printify - System Architecture

This document describes the technical architecture of Prime Printify, the printing press billing and management system.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Prime Printify System                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │   Frontend   │ ◄────► │   Backend    │                │
│  │   (React)    │         │  (Node/Exp)  │                │
│  └──────────────┘         └──────────────┘                │
│         │                         │                        │
│         └────────────┬────────────┘                        │
│                      │                                     │
│              ┌───────▼────────┐                           │
│              │  PostgreSQL    │                           │
│              │   Database     │                           │
│              └────────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack

```
React 19.2                  - UI Framework
├── TypeScript             - Type Safety
├── React Router v7        - Routing
├── Zustand                - State Management
├── Tailwind CSS 4         - Styling
├── React Hook Form        - Form Handling
├── Recharts               - Data Visualization
├── Framer Motion          - Animations
├── jsPDF + html2canvas    - PDF Generation
└── Lucide React           - Icons
```

### Component Architecture

```
src/
├── components/
│   ├── Layout Components
│   │   ├── Sidebar.tsx        - Navigation sidebar
│   │   ├── Navbar.tsx         - Top navigation
│   │   └── DashboardLayout.tsx - Main layout wrapper
│   │
│   ├── UI Components
│   │   └── ui/
│   │       ├── Card.tsx       - Reusable card component
│   │       └── (other UI elements)
│   │
│   └── Feature Components
│       ├── BillForm.tsx
│       ├── CustomerCard.tsx
│       └── (feature-specific components)
│
├── pages/
│   ├── Login.tsx           - Authentication page
│   ├── Dashboard.tsx       - Main dashboard
│   ├── Billing.tsx         - Bill creation
│   ├── Bills.tsx           - Bills list
│   ├── Customers.tsx       - Customer management
│   ├── Inventory.tsx       - Inventory (Phase 2)
│   ├── Vendors.tsx         - Vendor mgmt (Phase 2)
│   ├── Expenses.tsx        - Expenses (Phase 2)
│   ├── Reports.tsx         - Reports (Phase 3)
│   └── Settings.tsx        - Settings
│
├── contexts/
│   ├── AuthContext.tsx     - Authentication state
│   └── store.ts            - Global state (Zustand)
│
├── hooks/
│   ├── useFilter.ts        - Filtering logic
│   └── (custom hooks)
│
├── services/
│   └── api.ts              - API client
│
├── layouts/
│   └── DashboardLayout.tsx - Main layout
│
├── mock-data/
│   └── index.ts            - Development data
│
└── index.css               - Global styles
```

### State Management (Zustand)

```typescript
// Global Store Structure
interface Store {
  // Data
  customers: Customer[]
  inventory: InventoryItem[]
  vendors: Vendor[]
  expenses: Expense[]
  bills: Bill[]
  settings: Settings
  
  // State
  isInitialized: boolean
  loading: boolean
  error: string | null
  
  // Actions
  initialize(): Promise<void>
  addBill(bill: Bill): void
  addCustomer(customer: Customer): void
  // ... other actions
}
```

### Routing Structure

```
/
├── /login                    - Login page
├── /                         - Redirect to dashboard
└── /dashboard               - Protected routes
    ├── /dashboard          - Dashboard
    ├── /billing            - Bill creation
    ├── /bills              - Bills list
    ├── /customers          - Customer management
    ├── /inventory          - Inventory (Phase 2)
    ├── /vendors            - Vendor management
    ├── /expenses           - Expense tracking
    ├── /reports            - Reports (Phase 3)
    └── /settings           - Settings
```

### Data Flow

```
User Interaction
      ↓
React Component Event Handler
      ↓
State Update (Zustand)
      ↓
API Call (async)
      ↓
Server Response
      ↓
State Update
      ↓
Component Re-render
      ↓
UI Update
```

## Backend Architecture (To be implemented)

### Technology Stack

```
Node.js                    - Runtime
├── Express.js            - Web Server
├── TypeScript            - Type Safety
├── PostgreSQL            - Database
├── JWT                   - Authentication
├── Joi/Zod              - Validation
└── Winston              - Logging
```

### API Structure

```
/api/v1/
├── /auth
│   ├── POST /login
│   ├── POST /logout
│   └── POST /refresh
│
├── /customers
│   ├── GET /
│   ├── GET /:id
│   ├── POST /
│   ├── PUT /:id
│   └── DELETE /:id
│
├── /bills
│   ├── GET /
│   ├── GET /:id
│   ├── POST /
│   ├── PUT /:id
│   └── DELETE /:id
│
├── /inventory
│   ├── GET /
│   ├── POST /
│   └── PUT /:id
│
├── /vendors
│   ├── GET /
│   ├── POST /
│   └── PUT /:id
│
├── /expenses
│   ├── GET /
│   ├── POST /
│   └── GET /report
│
└── /reports
    ├── GET /sales
    ├── GET /expense
    ├── GET /inventory
    └── GET /profit
```

### Authentication Flow

```
1. User enters credentials
         ↓
2. Frontend sends POST /api/v1/auth/login
         ↓
3. Backend validates credentials
         ↓
4. Backend generates JWT token
         ↓
5. Frontend stores token in localStorage/SessionStorage
         ↓
6. Subsequent requests include token in Authorization header
         ↓
7. Backend validates token middleware
         ↓
8. Request proceeds if valid
```

### Database Schema (PostgreSQL)

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'staff',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Customers Table
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  address TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Bills Table
CREATE TABLE bills (
  id UUID PRIMARY KEY,
  bill_number VARCHAR UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(10, 2),
  tax_amount DECIMAL(10, 2),
  status VARCHAR (Paid/Pending),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Bill Items Table
CREATE TABLE bill_items (
  id UUID PRIMARY KEY,
  bill_id UUID REFERENCES bills(id),
  service_name VARCHAR NOT NULL,
  quantity INT,
  unit_price DECIMAL(10, 2),
  total DECIMAL(10, 2)
);

-- Inventory Table
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  quantity INT,
  unit_cost DECIMAL(10, 2),
  reorder_level INT,
  created_at TIMESTAMP
);

-- Vendors Table
CREATE TABLE vendors (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  contact_email VARCHAR,
  phone VARCHAR,
  address TEXT,
  payment_terms VARCHAR,
  created_at TIMESTAMP
);

-- Expenses Table
CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  category VARCHAR NOT NULL,
  amount DECIMAL(10, 2),
  description TEXT,
  date DATE,
  created_at TIMESTAMP
);
```

## Data Security

### Authentication
- JWT tokens for stateless authentication
- Secure password hashing (bcrypt)
- Token expiration (24 hours)
- Refresh token mechanism

### Authorization
- Role-based access control (RBAC)
- User roles: Admin, Manager, Staff
- Permission checks on all endpoints

### Data Protection
- Encrypted passwords (never stored in plain text)
- HTTPS only (SSL/TLS)
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- CSRF protection

### Audit
- Log all user actions (Phase 4)
- Track data modifications
- Store audit trail for compliance

## Performance Optimization

### Frontend

1. **Code Splitting**
   - Lazy load routes
   - Dynamic imports for components
   - Separate vendor chunks

2. **Caching**
   - Browser caching (Cache-Control headers)
   - LocalStorage for frequently used data
   - Service Worker caching (Phase 4)

3. **Optimization**
   - Image optimization
   - CSS minification
   - Tree shaking
   - Bundle size monitoring

### Backend

1. **Database Optimization**
   - Proper indexing
   - Query optimization
   - Connection pooling
   - Caching layer (Redis)

2. **API Optimization**
   - Pagination for large datasets
   - Field selection (GraphQL or selective endpoints)
   - Response compression (gzip)

3. **Scaling**
   - Load balancing
   - Horizontal scaling
   - CDN for static assets
   - Message queue for async tasks

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         CDN (Cloudflare/AWS)           │
│    (Static assets, caching)             │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    Load Balancer (NGINX)               │
│    (Route traffic, SSL termination)     │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼─────┐          ┌────▼────┐
│Server 1  │          │Server 2  │
│(Node.js) │          │(Node.js) │
└───┬─────┘          └────┬────┘
    │                     │
    └──────────┬──────────┘
               │
        ┌──────▼──────────┐
        │  PostgreSQL DB  │
        │  (Primary)      │
        └─────────────────┘
               │
        ┌──────▼──────────┐
        │  PostgreSQL DB  │
        │  (Replica)      │
        └─────────────────┘
```

## Monitoring & Logging

### Frontend Monitoring
- Error tracking (Sentry)
- Performance monitoring (Web Vitals)
- User session tracking
- Error boundary implementation

### Backend Monitoring
- Application logging (Winston)
- Request logging
- Error tracking
- Performance metrics
- Database query monitoring

### Alerts
- Server down alerts
- High error rate alerts
- Performance degradation alerts
- Backup failure alerts (Phase 4)

## Development Workflow

```
Feature Branch
      ↓
Local Development
      ↓
Code Review (PR)
      ↓
Automated Tests
      ↓
Staging Deployment
      ↓
QA Testing
      ↓
Production Deployment
      ↓
Monitoring & Alerts
```

## Integration Points

### Third-Party Services
- **Email**: SendGrid/AWS SES (for reports)
- **Payments**: Stripe (future expansion)
- **Cloud Storage**: AWS S3 (backup files)
- **Analytics**: Google Analytics

### Future Integrations
- Mobile app API
- Third-party accounting software
- E-commerce platform integration
- POS system integration

## Scalability Considerations

### Horizontal Scaling
- Stateless API servers
- Load balancing
- Database replication

### Vertical Scaling
- Database optimization
- Cache layer (Redis)
- CDN for static content

### Data Volume Handling
- Archiving old records
- Data partitioning
- Incremental backups

## Disaster Recovery

### Backup Strategy
- Daily automated backups
- Backup retention: 30 days
- Off-site backup storage
- Backup testing schedule

### Recovery Objectives
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 15 minutes
- Failover time: < 5 minutes

### Business Continuity
- Redundant systems
- Failover automation
- Regular disaster recovery drills

---

## Document Version
- **Version**: 1.0.0
- **Last Updated**: 2024
- **Status**: Phase 1 Complete

For architectural questions or updates, contact the engineering team.

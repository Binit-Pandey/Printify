# PrintPress ERP - Authentication Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRINTPRESS ERP                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────┐              ┌──────────────────────────────┐ │
│  │     FRONTEND (React)      │              │    BACKEND (Express.js)      │ │
│  ├──────────────────────────┤              ├──────────────────────────────┤ │
│  │                          │              │                              │ │
│  │  ┌────────────────────┐  │              │  ┌──────────────────────────┐│ │
│  │  │  Auth Context      │  │ ◄────────────┼─►│  Auth Routes             ││ │
│  │  │  (State + Logic)   │  │ HTTP/JSON   │  │  - POST /register        ││ │
│  │  │                    │  │              │  │  - POST /login           ││ │
│  │  │ • user             │  │              │  │  - GET /me               ││ │
│  │  │ • token            │  │              │  │  - POST /logout          ││ │
│  │  │ • register()       │  │              │  │  - Middleware            ││ │
│  │  │ • login()          │  │              │  └──────────────────────────┘│ │
│  │  │ • logout()         │  │              │                              │ │
│  │  └────────────────────┘  │              │  ┌──────────────────────────┐│ │
│  │           △              │              │  │  Validation Layer        ││ │
│  │           │              │              │  │  - Email format          ││ │
│  │  ┌────────┴────────────┐ │              │  │  - Password strength     ││ │
│  │  │                     │ │              │  │  - Uniqueness checks     ││ │
│  │  │  Pages              │ │              │  └──────────────────────────┘│ │
│  │  │ ┌──────────────┐    │ │              │                              │ │
│  │  │ │ Login.tsx    │    │ │              │  ┌──────────────────────────┐│ │
│  │  │ │              │    │ │              │  │  Security Layer          ││ │
│  │  │ │ • Email      │    │ │              │  │  - bcryptjs hashing      ││ │
│  │  │ │ • Password   │    │ │              │  │  - JWT generation        ││ │
│  │  │ │ • Validation │    │ │              │  │  - Token verification    ││ │
│  │  │ └──────────────┘    │ │              │  └──────────────────────────┘│ │
│  │  │                     │ │              │                              │ │
│  │  │ ┌──────────────┐    │ │              │  ┌──────────────────────────┐│ │
│  │  │ │ Register.tsx │    │ │              │  │  Database Layer          ││ │
│  │  │ │              │    │ │              │  │  - SQLite                ││ │
│  │  │ │ • Email      │    │ │              │  │  - Users table           ││ │
│  │  │ │ • Password   │    │ │              │  │  - Audit logs            ││ │
│  │  │ │ • Name       │    │ │              │  └──────────────────────────┘│ │
│  │  │ │ • Validation │    │ │              │                              │ │
│  │  │ └──────────────┘    │ │              │                              │ │
│  │  │                     │ │              └──────────────────────────────┘ │
│  │  │ ┌──────────────┐    │ │                                              │
│  │  │ │ Dashboard    │    │ │                                              │
│  │  │ │              │    │ │              ┌──────────────────────────────┐ │
│  │  │ │ (Protected)  │    │ │              │  localStorage (Browser)      │ │
│  │  │ └──────────────┘    │ │              ├──────────────────────────────┤ │
│  │  └─────────────────────┘ │              │                              │ │
│  │                          │              │ • printpress_token (JWT)     │ │
│  │  ┌────────────────────┐  │              │ • printpress_user (user obj) │ │
│  │  │ localStorage       │  │              │                              │ │
│  │  │ ──────────────────│  │              └──────────────────────────────┘ │
│  │  │ • token (JWT)     │  │                                              │
│  │  │ • user (JSON)     │  │              ┌──────────────────────────────┐ │
│  │  └────────────────────┘  │              │  data/printing.db (SQLite)   │ │
│  │                          │              ├──────────────────────────────┤ │
│  └──────────────────────────┘              │                              │ │
│         Port: 5173                         │  users table:                │ │
│                                            │  ┌────────────────────────┐  │ │
│                                            │  │ id       | email        │  │ │
│                                            │  │ --------------------    │  │ │
│                                            │  │ uuid     | unique, NOT  │  │ │
│                                            │  │          | NULL        │  │ │
│                                            │  │ password | bcrypt hash │  │ │
│                                            │  │ hash     |             │  │ │
│                                            │  │ display  | user name   │  │ │
│                                            │  │ name     |             │  │ │
│                                            │  │ created  | timestamp   │  │ │
│                                            │  │ at       |             │  │ │
│                                            │  └────────────────────────┘  │ │
│                                            │                              │ │
│                                            │         Port: 3001          │ │
│                                            └──────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Registration Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         USER REGISTRATION FLOW                              │
└────────────────────────────────────────────────────────────────────────────┘

    FRONTEND                        |        BACKEND
                                   |
1. User visits /register           |
   └─► Sees registration form      |
                                   |
2. User fills form:                |
   • Email: john@gmail.com         |
   • Password: MyPass123           |
   • Name: John Doe                |
   • Confirm: MyPass123            |
                                   |
3. Frontend validation:            |
   ✓ Email format valid            |
   ✓ Password 8+ chars             |
   ✓ Password has uppercase        |
   ✓ Password has number           |
   ✓ Passwords match               |
   ✓ Name >= 2 chars               |
   └─► Enable Submit button        |
                                   |
4. User clicks Submit              |
   └─► Show loading state          |
                                   |
5. POST /api/auth/register         ├──► 6. Receive JSON data
   with user data                  |       ├─► Validate email format
                                   |       ├─► Check email uniqueness
                                   |       ├─► Validate password strength
                                   |       ├─► Hash password (bcrypt)
                                   |       ├─► Generate UUID
                                   |       ├─► Create database record
                                   |       ├─► Generate JWT token
                                   |       │   (expires in 7 days)
                                   |       └─► Return token + user
                                   |
7. Receive response ◄──────────────┤
   with token + user              |
                                   |
8. Save to localStorage            |
   • printpress_token = JWT        |
   • printpress_user = {user obj}  |
                                   |
9. Update AuthContext             |
   • Set user state               |
   • Set token state              |
                                   |
10. Redirect to /dashboard         |
    └─► Dashboard loads           |
        └─► User logged in! ✓     |

STATES & ERRORS:
├─ isLoading: true during API call
├─ Error: Email already registered
├─ Error: Invalid email format
├─ Error: Password too weak
└─ Error: Network error
```

---

## Login Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            USER LOGIN FLOW                                  │
└────────────────────────────────────────────────────────────────────────────┘

    FRONTEND                        |        BACKEND
                                   |
1. User visits /login              |
   └─► Sees login form             |
                                   |
2. User enters:                    |
   • Email: john@gmail.com         |
   • Password: MyPass123           |
                                   |
3. User clicks "Sign In"           |
   └─► Show loading state          |
                                   |
4. POST /api/auth/login            ├──► 5. Receive JSON data
   with email + password           |       ├─► Find user by email
                                   |       ├─► Compare password hash
                                   |       │   (bcrypt.compare)
                                   |       ├─► Check if match
                                   |       ├─► Generate JWT token
                                   |       └─► Return token + user
                                   |
6. Receive response ◄──────────────┤
   with token + user              |
                                   |
7. Save to localStorage            |
   • printpress_token = JWT        |
   • printpress_user = {user obj}  |
                                   |
8. Update AuthContext             |
   • Set user state               |
   • Set token state              |
                                   |
9. Redirect to /dashboard          |
    └─► Dashboard loads            |
        └─► User logged in! ✓     |

ERRORS:
├─ Invalid email or password (email not found)
├─ Invalid email or password (wrong password)
├─ Invalid email or password (any mismatch)
└─ Network error
```

---

## Protected Route Access Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      PROTECTED ROUTE ACCESS FLOW                            │
└────────────────────────────────────────────────────────────────────────────┘

User tries to access /dashboard
        |
        ├─► Check AuthContext
        │   ├─ Has user? (non-null)
        │   └─ Has token? (non-null)
        │
        ├─ YES (Authenticated)
        │   └─► Render DashboardLayout
        │       └─► Show dashboard content ✓
        │
        └─ NO (Not Authenticated)
            ├─► Redirect to /login
            └─► Show login form
                └─► User must login to continue

LOCALSTORAGE PERSISTENCE:
├─ On page load
│   ├─► Check localStorage for token
│   ├─► If exists, load into AuthContext
│   ├─► User remains logged in ✓
│   └─► Token still valid for 7 days
│
├─ On logout
│   ├─► Clear token from localStorage
│   ├─► Clear user from localStorage
│   └─► Redirect to /login
│
└─ On token expiry (7 days)
    ├─► API returns 403 (invalid token)
    ├─► Frontend should:
    │   ├─► Clear localStorage
    │   └─► Redirect to /login
    └─► User must login again
```

---

## API Protection with Middleware

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    PROTECTED API ENDPOINT FLOW                              │
└────────────────────────────────────────────────────────────────────────────┘

Frontend API Call:
    |
    └─► GET /api/customers
        Authorization: Bearer eyJ...
        
BACKEND:
    |
    ├─► Middleware: authenticateToken
    │   |
    │   ├─► Extract token from header
    │   ├─► Verify JWT signature
    │   ├─► Check token expiry
    │   │
    │   ├─ VALID ✓
    │   │   ├─► Decode token
    │   │   ├─► Attach user to req.user
    │   │   └─► Call next() to continue
    │   │
    │   └─ INVALID ✗
    │       └─► Return 401/403 error
    │           └─► Frontend redirects to login
    │
    ├─► Route handler (now has authenticated user)
    │   |
    │   └─► Access req.user:
    │       ├─ req.user.id
    │       ├─ req.user.email
    │       └─ req.user.displayName
    │
    └─► Query database with user context
        └─► Return filtered results ✓

EXAMPLE:
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;  // Now authenticated!
  const data = db.prepare(
    'SELECT * FROM customers WHERE owner_id = ?'
  ).all(userId);
  res.json(data);
});
```

---

## Security Flow Diagram

```
PASSWORD SECURITY:
┌──────────────────────────────────────────────────────────┐
│  User enters password: "MySecurePass123"                  │
│         |                                                 │
│         ├─► Frontend validates format                    │
│         │   ├─ 8+ characters ✓                           │
│         │   ├─ Has uppercase ✓                           │
│         │   └─ Has number ✓                              │
│         │                                                 │
│         ├─► Sent to backend via HTTPS                    │
│         │   (plain text, but encrypted in transit)       │
│         │                                                 │
│         └─► Backend:                                      │
│             └─► bcrypt.hash(password, 10 rounds)         │
│                 └─► Result: $2b$10$...63 char hash       │
│                     (never plain text in DB!)            │
│                                                           │
│  LOGIN PASSWORD CHECK:                                    │
│  bcrypt.compare(inputPassword, storedHash)               │
│  ├─ Returns true if matches ✓                            │
│  └─ Returns false if doesn't match ✗                     │
└──────────────────────────────────────────────────────────┘

JWT TOKEN SECURITY:
┌──────────────────────────────────────────────────────────┐
│  JWT Structure: header.payload.signature                  │
│                                                           │
│  Header:                                                  │
│  {                                                        │
│    "alg": "HS256",                                       │
│    "typ": "JWT"                                          │
│  }                                                        │
│                                                           │
│  Payload (expires in 7 days):                            │
│  {                                                        │
│    "id": "550e8400-e29b-41d4-a716-446655440000",        │
│    "email": "user@gmail.com",                            │
│    "displayName": "John Doe",                            │
│    "iat": 1234567890,         // issued at               │
│    "exp": 1234654290          // expires at              │
│  }                                                        │
│                                                           │
│  Signature: HMAC-SHA256(header + payload + JWT_SECRET)   │
│                                                           │
│  When token is used:                                      │
│  ├─ Verify signature hasn't been tampered with          │
│  ├─ Check expiry timestamp                               │
│  └─ If valid, user is authenticated ✓                    │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow Sequence

```
Timeline: New User Registration to Dashboard

T=0s    User visits /register
T=1s    User fills form
T=3s    User submits (isLoading=true)
        |
T=3.1s  POST /api/auth/register
        |
T=3.5s  Backend validation
        ├─ Email format: valid
        ├─ Email uniqueness: not in DB
        ├─ Password strength: valid
        └─ Ready to create user
        |
T=3.6s  Password hash: bcrypt
        └─ Raw password never stored
        |
T=3.7s  Generate JWT token
        ├─ Payload: { id, email, displayName }
        ├─ Expires: 7 days from now
        └─ Signed: with JWT_SECRET
        |
T=3.8s  Insert user into database
        ├─ id: UUID
        ├─ email: john@gmail.com
        ├─ passwordHash: $2b$10$...
        ├─ displayName: John Doe
        └─ createdAt: ISO timestamp
        |
T=3.9s  Return response
        ├─ token: eyJ...
        └─ user: { id, email, displayName }
        |
T=4.0s  Frontend receives response (isLoading=false)
        ├─ Save token to localStorage
        ├─ Save user to localStorage
        └─ Update AuthContext
        |
T=4.1s  Navigate to /dashboard
        |
T=4.2s  Dashboard renders
        ├─ Checks user in AuthContext ✓
        ├─ Shows personalized content
        └─ User logged in! 🎉

Total time: ~1 second (network latency)
```

---

## Component State Management

```
┌─────────────────────────────────────────────────────────┐
│          AuthContext State & Functions                   │
└─────────────────────────────────────────────────────────┘

STATE:
├─ user: AuthUser | null
│  └─ { id, email, displayName }
│
├─ token: string | null
│  └─ JWT token from API
│
├─ isLoading: boolean
│  └─ true during API calls
│
└─ error: string | null
   └─ Error messages from API

FUNCTIONS:
├─ register(email, password, displayName)
│  ├─ Calls POST /api/auth/register
│  ├─ On success: set user, token, state
│  ├─ On error: set error message
│  └─ Returns: boolean
│
├─ login(email, password)
│  ├─ Calls POST /api/auth/login
│  ├─ On success: set user, token, state
│  ├─ On error: set error message
│  └─ Returns: boolean
│
├─ logout()
│  ├─ Clears localStorage
│  ├─ Clears user state
│  ├─ Clears token state
│  └─ Redirects to login
│
└─ clearError()
   └─ Sets error to null

USAGE IN COMPONENTS:
const { user, token, isLoading, error } = useAuth();

├─ If !user → show login form
├─ If user → show dashboard
├─ If isLoading → show spinner
├─ If error → show error message
└─ Get token for API calls:
   Authorization: Bearer {token}
```

---

## Error Handling Flow

```
┌────────────────────────────────────────────────────────┐
│            ERROR HANDLING FLOWCHART                     │
└────────────────────────────────────────────────────────┘

API Request
    |
    ├─► Network Error
    │   └─► Display: "Network error, please try again"
    │
    ├─► 400 Bad Request
    │   └─► Display: error.message (from backend)
    │       ├─ "Invalid email format"
    │       ├─ "Password too weak"
    │       └─ "Email already registered"
    │
    ├─► 401 Unauthorized
    │   ├─► Display: "Invalid email or password"
    │   └─► Don't redirect (user tries again)
    │
    ├─► 403 Forbidden
    │   ├─► Token invalid/expired
    │   ├─► Clear localStorage
    │   └─► Redirect to /login
    │
    └─► 500 Server Error
        └─► Display: "Server error, please try again"

FRONTEND ERROR DISPLAY:
1. User sees red error box
2. User can:
   ├─ Try again with different input
   ├─ Click clearError() button
   └─ Navigate away (error clears)

BACKEND LOGGING:
├─ console.error('[AUTH] Error message')
├─ Details logged but not exposed to user
└─ User sees generic message
```

---

## File Dependency Graph

```
                              Backend Structure
                                     |
                         ┌───────────┴────────────┐
                         |                        |
                    auth.ts                    index.ts
                    (routes)                   (server)
                         |                        |
                    ┌────┴────┐                   |
                    |          |                  |
              bcryptjs    jsonwebtoken            |
            (password)     (tokens)               |
                    |          |                  |
                    └────┬─────┘                  |
                         |                        |
                      db.ts ◄───────────────────┘
                    (database)
                         |
                    data/printing.db
                    (SQLite file)


                            Frontend Structure
                                     |
                         ┌───────────┴────────────┐
                         |                        |
                      App.tsx                main.tsx
                     (routes)              (entry)
                         |
                    ┌────┴────┐
                    |          |
               Login.tsx    Register.tsx
              (component)    (component)
                    |          |
                    └────┬─────┘
                         |
                   AuthContext.tsx
                   (state mgmt)
                         |
                    ┌────┴────┐
                    |          |
                 React      localStorage
               (frontend)    (storage)
                    |          |
                    └────┬─────┘
                         |
                   http://localhost:3001
                   (backend API)
```

---

**Architecture Version**: 1.0.0  
**Last Updated**: July 2026  
**Status**: ✅ Production Ready

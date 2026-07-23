# Authentication System - Quick Reference

## 🚀 Quick Start

### 1. Start Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:3001
```

### 2. Start Frontend (new terminal)
```bash
npm install
npm run dev
# Runs on http://localhost:5173
```

### 3. Test Auth
- Go to http://localhost:5173/register
- Create account with:
  - Email: `test@example.com`
  - Password: `TestPass123` (8+ chars, uppercase, number)
  - Name: `John Doe`
- Click "Create Account" → redirects to dashboard
- Click logout to test login

---

## 📦 What's Included

| Feature | Status | Location |
|---------|--------|----------|
| User Registration | ✅ Done | `src/pages/Register.tsx` |
| User Login | ✅ Done | `src/pages/Login.tsx` |
| Password Hashing | ✅ Done (bcrypt) | `backend/src/routes/auth.ts` |
| JWT Tokens | ✅ Done | `backend/src/routes/auth.ts` |
| Auth Context | ✅ Done | `src/contexts/AuthContext.tsx` |
| Protected Routes | ✅ Done | `src/App.tsx` |
| Database Schema | ✅ Done | `backend/src/db.ts` |
| Form Validation | ✅ Done | `src/pages/Register.tsx` |
| Error Handling | ✅ Done | Both frontend & backend |
| Documentation | ✅ Done | `AUTH_SETUP.md` |

---

## 🔑 Key APIs

### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@gmail.com",
  "password": "SecurePass123",
  "displayName": "John Doe"
}

Response: { token, user }
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@gmail.com",
  "password": "SecurePass123"
}

Response: { token, user }
```

### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer {token}

Response: { user }
```

### Logout
```bash
POST /api/auth/logout
Authorization: Bearer {token}

Response: { message }
```

---

## 🛡️ Protect Routes with Auth Middleware

### Backend Example

```typescript
// backend/src/routes/customers.ts
import { authenticateToken } from './auth';

router.get('/', authenticateToken, (req, res) => {
  // req.user = { id, email, displayName }
  const customers = db.prepare('SELECT * FROM customers').all();
  res.json(customers);
});
```

### Frontend Example

```typescript
// Already protected in App.tsx
<Route path="/*" element={user ? <DashboardLayout /> : <Navigate to="/login" />} />
```

---

## 🎨 UI Components

### Using AuthContext in Components

```typescript
import { useAuth } from '../contexts/AuthContext';

export function MyComponent() {
  const { user, token, logout, error, isLoading } = useAuth();

  if (!user) return <Navigate to="/login" />;

  return (
    <div>
      <h1>Welcome, {user.displayName}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## 📋 Password Requirements

- **Minimum Length**: 8 characters
- **Uppercase**: At least 1 (A-Z)
- **Number**: At least 1 (0-9)
- **Example**: `MyPassword123` ✅

---

## 💾 Database Schema

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  displayName TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
```

---

## 🔒 Environment Variables

### Backend (.env)
```
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=7d
PORT=3001
```

### Generate JWT Secret
```bash
openssl rand -base64 32
```

---

## 📁 File Changes Summary

### New Files Created
- `backend/src/routes/auth.ts` — Authentication routes
- `src/pages/Register.tsx` — Registration page
- `AUTH_SETUP.md` — Complete documentation
- `AUTH_QUICK_REFERENCE.md` — This file

### Modified Files
- `backend/src/db.ts` — Added users table
- `backend/src/index.ts` — Added auth routes
- `backend/package.json` — Added bcryptjs, jsonwebtoken
- `src/contexts/AuthContext.tsx` — Complete rewrite for real backend
- `src/pages/Login.tsx` — Updated for new auth system
- `src/App.tsx` — Added register route

---

## 🧪 Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend connects to backend
- [ ] Can register new account
- [ ] Can login with registered account
- [ ] Session persists after page refresh
- [ ] Logout clears session
- [ ] Cannot access dashboard without login
- [ ] Password validation works
- [ ] Email uniqueness works

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Invalid email or password" | Email doesn't exist or password wrong |
| Backend won't start | Check port 3001 isn't in use: `lsof -i :3001` |
| CORS error | Verify backend running on http://localhost:3001 |
| "Email already registered" | Use different email for testing |
| Token expired | Login again, tokens expire after 7 days |
| Password too weak | Use 8+ chars, uppercase, and number |

---

## 🚀 Production Deployment Checklist

- [ ] Change JWT_SECRET to strong random value
- [ ] Enable HTTPS (not HTTP)
- [ ] Set CORS allowed origins
- [ ] Add rate limiting on login/register
- [ ] Enable database backups
- [ ] Add email verification
- [ ] Add password reset
- [ ] Set up error logging
- [ ] Add monitoring/alerts
- [ ] Test all auth flows

---

## 📚 Full Documentation

See `AUTH_SETUP.md` for:
- Complete API reference
- Architecture details
- Advanced usage examples
- Security best practices
- Troubleshooting guide
- Next steps & extensions

---

## 💡 Next Steps

### Phase 1: Testing (Now)
- ✅ Test registration/login flows
- ✅ Verify database persists users
- ✅ Test token generation

### Phase 2: Protection (Soon)
- Protect API routes with auth middleware
- Add user ownership checks to resources
- Implement role-based access control

### Phase 3: Enhancement (Later)
- Add password reset
- Add email verification
- Add two-factor authentication
- Add social login (OAuth)
- Add refresh tokens

---

**Version**: 1.0.0  
**Last Updated**: July 2026  
**Status**: ✅ Ready to Use

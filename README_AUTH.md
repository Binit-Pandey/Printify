# 🔐 PrintPress ERP - Authentication System

A **production-ready, secure authentication system** with email + password registration/login, bcryptjs password hashing, JWT sessions, and protected routes.

## ⚡ Quick Start (3 Steps)

### 1. Install & Start Backend
```bash
cd backend
npm install
npm run dev
# Output: 🚀 Backend running on http://localhost:3001
```

### 2. Start Frontend (new terminal)
```bash
npm install
npm run dev
# Output: ➜ Local: http://localhost:5173/
```

### 3. Register & Login
- Go to **http://localhost:5173/register**
- Create account with your email
- Automatically logged in to dashboard ✅

---

## 📚 Documentation

| Document | Content |
|----------|---------|
| **AUTH_SETUP.md** | Complete reference (660 lines) |
| **AUTH_QUICK_REFERENCE.md** | Quick reference & checklists (278 lines) |
| **AUTHENTICATION_IMPLEMENTATION.md** | What was built & how to use (610 lines) |
| **AUTH_ARCHITECTURE.md** | System diagrams & flows (561 lines) |
| **README_AUTH.md** | This file - overview & quick links |

---

## ✨ Features

- ✅ **User Registration** - Email + password with validation
- ✅ **User Login** - Secure authentication with JWT tokens
- ✅ **Password Security** - Bcryptjs hashing (never plain text)
- ✅ **Session Management** - 7-day JWT tokens with localStorage
- ✅ **Form Validation** - Real-time feedback on registration
- ✅ **Protected Routes** - Dashboard only for authenticated users
- ✅ **Error Handling** - User-friendly error messages
- ✅ **API Protection** - Middleware for protecting routes

---

## 🎯 Password Requirements

For security, passwords must have:
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 number (0-9)

**Example valid passwords:**
- `MySecurePass123` ✅
- `Password2024` ✅
- `Test@Pass99` ✅

**Example invalid passwords:**
- `password123` ❌ (no uppercase)
- `Password` ❌ (no number)
- `Pass1` ❌ (too short)

---

## 🔌 API Endpoints

### Register a New User
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

### Login Existing User
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

## 🛡️ Security Implementation

### ✅ What's Secure
- Password hashed with bcryptjs (10 salt rounds)
- Email uniqueness enforced in database
- Password strength validated on registration
- JWT tokens with 7-day expiry
- Tokens signed and verified
- Error messages don't leak sensitive info
- CORS enabled for frontend

### ⚠️ Production Recommendations
- Enable HTTPS only (not HTTP)
- Add rate limiting on login/register
- Implement email verification
- Add password reset functionality
- Use HttpOnly cookies instead of localStorage
- Add two-factor authentication
- Enable audit logging

---

## 📁 File Structure

```
PrintPress/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts              ← 🔑 Authentication routes
│   │   │   └── ... (other routes)
│   │   ├── db.ts                    ← 🗄️ Database (includes users table)
│   │   └── index.ts                 ← 🚀 Express server
│   ├── package.json
│   └── .env.example                 ← 📋 Environment template
│
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx          ← 🔐 Auth state management
│   ├── pages/
│   │   ├── Login.tsx                ← 📝 Login page
│   │   ├── Register.tsx             ← ✍️ Registration page
│   │   └── Dashboard.tsx            ← 🎯 Protected route
│   ├── App.tsx                      ← 🗺️ Routes definition
│   └── main.tsx
│
├── AUTH_SETUP.md                    ← 📖 Complete guide
├── AUTH_QUICK_REFERENCE.md          ← ⚡ Quick reference
├── AUTH_ARCHITECTURE.md             ← 🏗️ Architecture diagrams
├── AUTHENTICATION_IMPLEMENTATION.md ← 📋 Implementation details
└── README_AUTH.md                   ← 👈 This file
```

---

## 🧪 Testing Checklist

### Registration Flow
- [ ] Can open registration page
- [ ] Form validates in real-time
- [ ] Can register with valid credentials
- [ ] Gets JWT token on success
- [ ] Redirects to dashboard
- [ ] Cannot register duplicate email
- [ ] Shows error for weak password

### Login Flow
- [ ] Can open login page
- [ ] Can login with registered account
- [ ] Gets JWT token on success
- [ ] Redirects to dashboard
- [ ] Shows error for invalid credentials
- [ ] Error message doesn't leak info

### Session Management
- [ ] Refresh page while logged in → stays logged in
- [ ] Token stored in localStorage
- [ ] Can logout successfully
- [ ] Logout clears localStorage
- [ ] Redirect to login on logout
- [ ] Cannot access dashboard without token

### Error Handling
- [ ] Network errors display message
- [ ] Invalid email shows error
- [ ] Weak password shows requirements
- [ ] Password mismatch shows error
- [ ] Server errors handled gracefully

---

## 🚀 Using Auth in Components

### Check if User is Logged In
```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  
  return <div>Welcome, {user.displayName}!</div>;
}
```

### Get Auth State
```typescript
const { user, token, isLoading, error } = useAuth();

// user: { id, email, displayName } or null
// token: JWT string or null
// isLoading: boolean
// error: error message or null
```

### Perform Auth Actions
```typescript
const { register, login, logout } = useAuth();

// Register
const success = await register(email, password, displayName);

// Login
const success = await login(email, password);

// Logout
logout();
```

---

## 🔒 Protecting API Routes

### Backend Example
```typescript
// backend/src/routes/customers.ts
import { authenticateToken } from './auth';

router.get('/', authenticateToken, (req, res) => {
  // req.user = { id, email, displayName }
  const userId = req.user.id;
  
  const customers = db
    .prepare('SELECT * FROM customers WHERE owner_id = ?')
    .all(userId);
    
  res.json(customers);
});
```

### Frontend Example (already done)
```typescript
// src/App.tsx
<Route
  path="/dashboard"
  element={user ? <Dashboard /> : <Navigate to="/login" />}
/>
```

---

## 🐛 Troubleshooting

### "Backend won't start on port 3001"
```bash
# Check if port is in use
lsof -i :3001

# Kill the process
kill -9 <PID>

# Try again
npm run dev
```

### "CORS error when connecting"
- Verify backend running on http://localhost:3001
- Check browser console (F12) for exact error
- CORS should be enabled by default

### "Invalid email or password"
- User might not exist (register first)
- Check email spelling
- Remember passwords are case-sensitive

### "Token expired"
- Tokens expire after 7 days
- User needs to login again
- Or implement refresh tokens (see AUTH_SETUP.md)

---

## 📊 Database Schema

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

**Example user record:**
```
id:            | 550e8400-e29b-41d4-a716-446655440000
email:         | john@example.com
passwordHash:  | $2b$10$abcd...xyz (never plain text!)
displayName:   | John Doe
createdAt:     | 2026-07-23T10:30:00.000Z
updatedAt:     | 2026-07-23T10:30:00.000Z
```

---

## 🌐 Environment Variables

### Backend `.env` (optional - defaults provided)
```bash
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
PORT=3001
DATABASE_PATH=data/printing.db
```

### Generate JWT Secret
```bash
openssl rand -base64 32
```

---

## 🔗 Integration with Printify

After authentication is working, you can:

1. **Store Printify API key per user**
   ```sql
   ALTER TABLE users ADD COLUMN printifyApiKey TEXT;
   ```

2. **Make authenticated Printify requests**
   ```typescript
   router.get('/api/printify/products', authenticateToken, async (req, res) => {
     const user = req.user;
     const apiKey = db.prepare(
       'SELECT printifyApiKey FROM users WHERE id = ?'
     ).get(user.id).printifyApiKey;
     
     // Use apiKey to call Printify API
   });
   ```

3. **Per-user data isolation**
   - Each user has their own Printify account
   - Dashboard shows their products
   - Orders belong to authenticated user

See `AUTH_SETUP.md` for more integration examples.

---

## 📞 Support & Documentation

### Quick References
- **AUTH_QUICK_REFERENCE.md** - Commands & checklist (read this first!)
- **AUTH_ARCHITECTURE.md** - System diagrams & flows

### Complete Guides
- **AUTH_SETUP.md** - API reference, best practices, extensions
- **AUTHENTICATION_IMPLEMENTATION.md** - What was built & how to extend

### Testing
- Use cURL to test API endpoints (examples in AUTH_SETUP.md)
- Use browser DevTools (F12) to inspect requests
- Check backend console for auth logs

---

## 🎓 Learning Path

### Beginner (30 min)
1. Read this README_AUTH.md
2. Run quick start (3 steps)
3. Test registration & login

### Intermediate (1 hour)
1. Read AUTH_QUICK_REFERENCE.md
2. Explore code: `backend/src/routes/auth.ts`
3. Explore code: `src/contexts/AuthContext.tsx`
4. Protect a new API route

### Advanced (2 hours)
1. Read AUTH_SETUP.md completely
2. Read AUTH_ARCHITECTURE.md for flows
3. Implement email verification
4. Implement password reset

### Expert (Half day)
1. Implement refresh tokens
2. Add two-factor authentication
3. Add OAuth social login
4. Deploy to production

---

## ✅ Production Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to strong random value
- [ ] Enable HTTPS (force SSL)
- [ ] Set CORS allowed origins (not localhost)
- [ ] Add rate limiting (prevent brute force)
- [ ] Enable database backups
- [ ] Test all auth flows thoroughly
- [ ] Set up error logging/monitoring
- [ ] Review security best practices
- [ ] Test on staging environment
- [ ] Deploy to production

---

## 📈 Next Features to Add

### Phase 1: Enhance (This Week)
- [ ] Protect existing API routes
- [ ] Add user profile page
- [ ] Add change password

### Phase 2: Scale (This Month)
- [ ] Email verification
- [ ] Password reset
- [ ] User roles/permissions

### Phase 3: Security (This Quarter)
- [ ] Two-factor authentication
- [ ] Refresh token rotation
- [ ] Audit logging
- [ ] Account lockout

### Phase 4: Social (Next Quarter)
- [ ] OAuth integration
- [ ] Social login (Google, GitHub)
- [ ] Team/organization support

---

## 🤝 Contributing

To extend the authentication system:

1. Follow existing code patterns
2. Add TypeScript types
3. Write clear comments
4. Update documentation
5. Test thoroughly
6. Follow security best practices

---

## 📝 Changelog

### v1.0.0 (July 2026)
- ✅ User registration with validation
- ✅ User login with JWT tokens
- ✅ Password hashing with bcryptjs
- ✅ Protected routes
- ✅ Auth middleware
- ✅ Complete documentation

---

## 📄 License

Part of PrintPress ERP project.

---

## 🎉 Summary

You now have a **production-ready authentication system** with:
- ✅ Email + password registration
- ✅ Secure login & JWT sessions
- ✅ Protected routes & API endpoints
- ✅ Real-time form validation
- ✅ Comprehensive documentation

**Next step:** Read `AUTH_QUICK_REFERENCE.md` for testing & deployment info.

**Questions?** Check `AUTH_SETUP.md` for detailed answers.

**Happy coding! 🚀**

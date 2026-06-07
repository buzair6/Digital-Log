# Checklist App

A full-stack checklist management application built with Next.js, Prisma, and TypeScript. Features role-based authentication with Admin and General User accounts.

## Features

✅ **User Authentication**
- Sign up with email and password
- Login with secure password verification
- Role-based access control (Admin/User)

✅ **General User Dashboard**
- Create, read, update, and delete checklist items
- Mark items as complete/incomplete
- Personal checklist management

✅ **Admin Dashboard**
- View statistics (total users, total items, completed items)
- Monitor all checklist items across users
- View user information for each item
- System-wide analytics

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: Email/Password with bcryptjs
- **UI Components**: Lucide React Icons

## Project Structure

```
checklist-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/route.ts           # Auth endpoints (login/signup)
│   │   │   ├── todos/route.ts          # Todo CRUD endpoints
│   │   │   ├── todos/[id]/route.ts     # Individual todo operations
│   │   │   └── admin/stats/route.ts    # Admin statistics
│   │   ├── login/page.tsx              # Login page
│   │   ├── signup/page.tsx             # Signup page
│   │   ├── dashboard/page.tsx          # User dashboard
│   │   ├── admin/dashboard/page.tsx    # Admin dashboard
│   │   └── page.tsx                    # Home (redirects to dashboard)
│   ├── lib/
│   │   └── auth.ts                     # Auth utilities
│   └── app/globals.css                 # Global styles
├── prisma/
│   ├── schema.prisma                   # Database schema
│   └── dev.db                          # SQLite database
└── package.json
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
```bash
npx prisma migrate dev --name init
```

This creates the SQLite database and applies the schema.

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Creating Accounts

**General User Account:**
1. Go to `/signup`
2. Fill in the form with your details
3. Select "General User" as the account type
4. Click "Sign Up"

**Admin Account:**
1. Go to `/signup`
2. Fill in the form with your details
3. Select "Admin" as the account type
4. Click "Sign Up"

### Login
1. Go to `/login`
2. Enter your email and password
3. Click "Sign In"
4. Users are redirected to `/dashboard`
5. Admins are redirected to `/admin/dashboard`

### Managing Checklists (General Users)
- Add new items with the input field
- Click the checkbox to mark items as complete
- Click the trash icon to delete items

### Admin Dashboard
- View system-wide statistics
- See all checklist items from all users
- Track which user created each item
- Monitor completion status

## Database Schema

### User Model
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String
  role      String   @default("user")  // "admin" or "user"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  todos     Todo[]
}
```

### Todo Model
```prisma
model Todo {
  id        String   @id @default(cuid())
  title     String
  completed Boolean  @default(false)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## API Endpoints

### Authentication
- `POST /api/auth` - Login or Signup (body: `{email, password, isSignup, name?, role?}`)

### Todos
- `GET /api/todos?userId=<id>` - Get user's todos
- `POST /api/todos` - Create a new todo (body: `{title, userId}`)
- `PATCH /api/todos/[id]` - Update todo (body: `{completed}`)
- `DELETE /api/todos/[id]` - Delete todo

### Admin
- `GET /api/admin/stats` - Get admin statistics

## Security Features

- ✅ Passwords hashed with bcryptjs
- ✅ Role-based access control
- ✅ Session storage in localStorage
- ✅ Protected routes with redirect logic
- ✅ Input validation on server

## Building for Production

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file:
```
DATABASE_URL="file:./prisma/dev.db"
```

## Future Enhancements

- Add NextAuth.js for more robust session management
- Implement JWT tokens
- Add email verification
- Add password reset functionality
- Create shared checklists between users
- Add due dates and priorities
- Implement real-time notifications
- Add team/project organization

## Troubleshooting

### Database not found
Run: `npx prisma migrate dev --name init`

### Port 3000 already in use
```bash
npm run dev -- -p 3001
```

### Prisma types not generated
```bash
npx prisma generate
```

## License

MIT

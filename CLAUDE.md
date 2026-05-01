# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack Markdown editor built with Vue 3 (frontend) and Go/Gin (backend). The application features user authentication, real-time preview, document storage, community pages, dark/light themes, desktop pets, and AI-assisted writing.

## Development Commands

### Backend (Go)
```bash
cd backend
# Install dependencies
go mod tidy

# Run development server (requires MySQL running)
go run ./cmd/server/main.go

# Or use the Windows script
scripts\run.bat

# Build executable
go build -o server ./cmd/server/main.go
```

### Frontend (Vue 3)
```bash
cd frontend
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database
- The backend automatically creates the database and `users` table if they don't exist
- For full initialization including `documents` and `document_likes` tables, run `backend/databaseinit/init.sql`
- Default test accounts: `admin`/`123456` and `testuser`/`123456`

## Environment Configuration

### Backend (.env in backend/)
Required variables:
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=markdown_editor
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=24
SERVER_PORT=8080
GIN_MODE=debug
```

For production:
- Set `GIN_MODE=release`
- Use a strong random `JWT_SECRET`
- Add `CORS_ALLOWED_ORIGINS` with your frontend domain(s)

### Frontend (.env.development in frontend/)
- `VITE_API_BASE_URL=http://localhost:8080` for development
- For production, set this to your domain (e.g., `https://your-domain.com`)

## Architecture

### Backend Structure (`backend/internal/`)
- `config/`: Loads environment variables
- `database/`: MySQL connection and auto-creation logic
- `handlers/`: HTTP handlers (auth, documents, posts, tags, tasks)
- `middleware/`: CORS, JWT auth, logging
- `models/`: Data structures matching database tables
- `server/`: Router setup and server initialization
- `utils/`: JWT and password utilities

Key patterns:
- Unified response format via `pkg/api/response.go`
- JWT middleware protects routes requiring authentication
- Database connection pool with proper timeouts
- Automatic creation of missing database/tables on startup

### Frontend Structure (`frontend/src/`)
- `components/`: Reusable Vue components (EditorPane, SidebarLeft/Right, DesktopPet, etc.)
- `composables/`: Composition API hooks (useAuth, useDocument, useTheme, etc.)
- `views/`: Page-level components (EditorView, CommunityView, LoginView)
- `services/api.js`: Centralized API client with Axios
- `utils/`: Markdown parsing, export utilities, audio management
- `router/`: Vue Router configuration with authentication guards

Key patterns:
- Composition API for state management (no Pinia/Vuex)
- Local storage for editor state persistence
- Theme system with CSS custom properties
- Audio feedback for user interactions
- Desktop pet with drag-and-drop and context menu

### API Routes
All API routes are prefixed with `/api/`:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/users/profile` - Get current user (requires JWT)
- `POST /api/documents/upload` - Upload document (requires JWT)
- `GET /api/documents/list` - List documents (requires JWT)
- `GET /api/posts` - Public community posts list
- `POST /api/posts/:id/like` - Like a post (requires JWT)
- `GET /health` - Health check endpoint

### Database Schema
- `users`: User accounts with bcrypt password hashes
- `documents`: Markdown documents with metadata and optional image paths
- `document_likes`: Many-to-many relationship for community likes

## Key Features Implementation

### Authentication
- Frontend stores JWT token in localStorage
- Token automatically included in API requests via Axios interceptor
- Route guards redirect unauthenticated users from protected pages

### Markdown Editor
- Real-time preview using markdown-it with extensions (KaTeX, footnotes, etc.)
- Code syntax highlighting via highlight.js with customizable colors
- Synchronized scrolling between editor and preview panes
- Export to HTML, Markdown, and PDF formats

### Document Management
- Documents stored in MySQL with user ownership
- Automatic saving during navigation
- Import from local files
- Search functionality

### Desktop Pet
- Interactive desktop companion with drag, resize, and context menu
- Context menu provides quick access to theme switching, page navigation, and sound controls
- Position and state persisted in localStorage

### AI Continuation
- Right sidebar feature for AI-assisted writing
- API keys stored locally in browser (not sent to server)
- Configurable length and style parameters

## Development Notes

### Code Style
- Backend: Standard Go conventions, gin-gonic framework patterns
- Frontend: Vue 3 Composition API, no TypeScript
- No formal linting or testing setup currently implemented

### State Management
- Frontend uses Composition API hooks (`composables/`) for shared state
- No external state management library (Pinia/Vuex)
- Local storage used for persistence across page reloads

### Error Handling
- Backend uses unified `api.Success()` and `api.Error()` response helpers
- Frontend API client handles errors with consistent error messages
- No global error boundary in frontend

### Security Considerations
- Passwords hashed with bcrypt
- JWT tokens for authentication
- CORS configured for development and production
- API keys for AI features stored locally only

## Deployment

### Nginx Configuration
See `deploy/nginx.conf` for a production deployment example:
- Serves frontend static files from `frontend/dist`
- Proxies `/api/*`, `/uploads/*`, and `/health` to backend
- Supports HTTPS with SSL certificate configuration

### Production Checklist
1. Update backend `.env` with production values
2. Set frontend `VITE_API_BASE_URL` to production domain
3. Build frontend with `npm run build`
4. Configure Nginx with SSL certificates
5. Ensure MySQL is properly secured and backed up
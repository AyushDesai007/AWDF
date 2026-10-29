# PR6 — Full Stack Integration (React + Node + MongoDB)

**Note:** Your uploaded PR3/PR4/PR5 files came through as empty (0 bytes), so this was
built as a complete, self-contained implementation of PR6 following the practical spec
exactly. Drop in your actual PR3–5 code if you have it — the structure (`/tasks` CRUD
endpoints, `api.js` base URL pattern) matches what the spec describes, so it should
slot together with minimal changes.

## Structure

```
AWDF_PRAC/
├── backend/            Express + Mongoose API (port 5000)
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/           React (Vite) UI (port 5173)
│   ├── Dockerfile
│   └── .dockerignore
├── docker-compose.yml  Orchestrates frontend, backend, mongodb on app-network
├── PR10 README.md      Practical 10 Documentation
└── PR11 README.md      Practical 11 Docker & Docker Compose Documentation
```

## Running the Full Stack with Docker Compose (Practical 11)

To run the entire full stack (Frontend, Backend, and MongoDB) in one single command:

```bash
docker compose up --build -d
```

Confirm all 3 containers are running:
```bash
docker ps
```

Access the application:
- **Frontend UI**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **API Health**: [http://localhost:5000/health](http://localhost:5000/health)

Stop all containers:
```bash
docker compose down
```

For detailed documentation, architectural diagrams, and theoretical viva analysis, see [PR11 README.md](./PR11%20README.md).

---

## Manual / Local Setup (Alternative)

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env    # edit MONGO_URI if needed
npm run dev              # or: npm start
```

Requires a running MongoDB instance (local `mongod` or a MongoDB Atlas connection
string in `.env`). The server listens on `http://localhost:5000`.

Endpoints:
| Method | Route        | Description       |
|--------|--------------|--------------------|
| GET    | /tasks       | List all tasks     |
| POST   | /tasks       | Create a task      |
| PUT    | /tasks/:id   | Update a task      |
| DELETE | /tasks/:id   | Delete a task      |

## 2. Frontend setup

In a **separate terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Both servers must be running at the same time.

## Features implemented (per PR6 spec)

- CORS enabled on Express so the Vite dev server can call the API
- Central `src/api.js` with a single `BASE_URL`, replacing the Practical 3 GitHub-fetch logic
- Full CRUD wired to MongoDB via Mongoose
- Loading and error states on **every** API call (not just initial GET), with a Retry button
- UI state updated from the backend response after each write — never assumed
- **Optimistic UI** on task creation (temp entry shown instantly, rolled back on failure)
- **Confirmation dialog** before delete
- **Toast notifications** for success/failure of every operation

## Verifying persistence

1. Create a few tasks, edit one, delete one.
2. Refresh the browser — the list should reload from MongoDB via `GET /tasks`
   and show exactly what you left it in.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| CORS error in console | `cors()` not applied | Confirm `app.use(cors())` runs before routes in `server.js` |
| `fetch failed` | Backend not running | Start `npm run dev` in `backend/` on port 5000 |
| Stale UI after edit/delete | State not synced | Already handled here via response-driven state updates |
| Data gone after refresh | Backend/Mongo not connected | Check `MONGO_URI` and that `mongod` is running |

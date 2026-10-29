# Practical 11: Containerization with Docker and Docker Compose

## Course Information
- **Course**: Advanced Web Development Frameworks (ITUE301)
- **Institution**: Charotar University of Science and Technology (CHARUSAT) - CSPIT / DEPSTAR
- **CO / PO**: CO5 / PO3, PO5
- **Objective**: To containerize the full-stack application using Docker and orchestrate services using Docker Compose.

---

## Architecture & Container Orchestration

```
                     ┌─────────────────────────────────────────────────────────┐
                     │                       HOST MACHINE                      │
                     │                                                         │
                     │   Browser / Client                                      │
                     │   ├── http://localhost:5173 ──┐                         │
                     │   └── http://localhost:5000 ──┼────────┐                │
                     └───────────────────────────────┼────────┼────────────────┘
                                                     │        │
               ┌─────────────────────────────────────┼────────┼────────────────────────────┐
               │ Docker Network: app-network (bridge)│        │                            │
               │                                     ▼        │                            │
               │                        ┌──────────────────┐  │                            │
               │                        │     frontend     │  │                            │
               │                        │   (React+Vite)   │  │                            │
               │                        │    Port: 5173    │  │                            │
               │                        └────────┬─────────┘  │                            │
               │                                 │ (browser calls API via localhost:5000)  │
               │                                 ▼            ▼                            │
               │                        ┌──────────────────────────┐                       │
               │                        │         backend          │                       │
               │                        │      (Node/Express)      │                       │
               │                        │        Port: 5000        │                       │
               │                        └─────────────┬────────────┘                       │
               │                                      │                                    │
               │                                      │ mongodb://mongodb:27017/taskdb     │
               │                                      ▼                                    │
               │                        ┌──────────────────────────┐                       │
               │                        │         mongodb          │                       │
               │                        │   (Official mongo:latest)│                       │
               │                        │        Port: 27017       │                       │
               │                        └─────────────┬────────────┘                       │
               │                                      │                                    │
               └──────────────────────────────────────┼────────────────────────────────────┘
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │ Volume: mongodb_data        │
                                       │ (Persistent Data /data/db)  │
                                       └─────────────────────────────┘
```

---

## Problem Definition & Implementation Summary

1. **Backend Dockerfile (`backend/Dockerfile`)**:
   - Built on `node:18`.
   - Copies `package*.json` first for efficient Docker layer caching.
   - Executes `npm install` inside the container.
   - Exposes port `5000` and launches `server.js`.

2. **Frontend Dockerfile (`frontend/Dockerfile`)**:
   - Built on `node:18 AS build`.
   - Injects `ARG VITE_API_URL=http://localhost:5000` for client-side API calls.
   - Installs dependencies and executes `npm run build` to generate production assets in `/app/dist`.
   - Configured with Vite preview binding on `0.0.0.0:5173`.
   - Exposes port `5173` and launches `npm run preview -- --host`.

3. **Docker Compose Orchestration (`docker-compose.yml`)**:
   - Defines and starts all three services (`mongodb`, `backend`, `frontend`) simultaneously.
   - Configures proper dependency order with `depends_on` (`backend` waits for `mongodb`, `frontend` waits for `backend`).
   - Connects all containers to a custom bridge network `app-network`.
   - Mounts named volume `mongodb_data` to `/data/db` on MongoDB for persistence across container restarts.

4. **Build Context Optimization (`.dockerignore`)**:
   - `backend/.dockerignore` and `frontend/.dockerignore` exclude `node_modules`, `.env`, build artifacts (`dist`), and version control metadata (`.git`).

5. **Cross-Platform Bug Fix**:
   - Normalized import paths in `frontend/src/App.jsx` from `./pages/*` to `./Pages/*` to guarantee strict case-sensitivity compatibility within Linux container environments.

---

## Key Questions & Analysis

### 1. Why does the backend container need to reference the MongoDB container by its service name (`mongodb`) rather than `localhost`?
Inside Docker, each container runs in its own isolated network namespace with its own dedicated loopback interface (`localhost` / `127.0.0.1`). If the backend container attempts to connect to `localhost:27017`, it queries its own local loopback where no MongoDB instance is listening.

When services join the user-defined Docker Compose network (`app-network`), Docker's embedded DNS server automatically registers each service under its Compose service name. Thus, `mongodb://mongodb:27017/taskdb` resolves dynamically to the internal IP address of the MongoDB container.

### 2. What is the difference between `EXPOSE` in a Dockerfile and the `ports` mapping in `docker-compose.yml`?
- **`EXPOSE` (Dockerfile)**: Serves as documentation and runtime metadata indicating which ports the containerized process listens on. It does **not** publish or bind the port to the host operating system.
- **`ports` (docker-compose.yml)**: Actively configures network port forwarding between the host machine and the container (e.g., `"5173:5173"` maps host port 5173 to container port 5173). This allows external traffic, such as a host web browser, to reach the service.

### 3. Why is it considered bad practice to copy `node_modules` into a Docker image instead of running `npm install` inside the container?
1. **Platform-Specific Native Binaries**: Certain packages contain compiled C/C++ native addons. Copying a host machine's `node_modules` (e.g., compiled for Windows x64) into a Linux container will lead to binary incompatibility crashes.
2. **Build Context Bloat**: Local `node_modules` directories often span hundreds of megabytes, severely slowing down Docker image transfers and builds.
3. **Reproducibility**: Running `npm install` inside the Linux build container guarantees that dependencies match the target operating system architecture cleanly according to `package.json` and `package-lock.json`.

---

## Supplementary Problems Addressed

### 1. `.dockerignore` Exclusion
Created `.dockerignore` in both `backend/` and `frontend/` containing:
```
node_modules
npm-debug.log
dist
.env
.git
.gitignore
```
This keeps Docker build contexts tiny (under 130 kB) and prevents accidental leakage of sensitive `.env` secrets into image layers.

### 2. Multi-Stage Build Analysis for Frontend
A multi-stage build splits the build process from the production server:
```dockerfile
# Stage 1: Build production bundle
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with lightweight Nginx web server
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
```
**Benefits**:
- Reduces image size from ~1.1 GB (`node:18` runtime + tools) down to ~25 MB (`nginx:alpine` static server).
- Eliminates Node.js runtime vulnerabilities from production web server images.

### 3. Named Volume Data Persistence for MongoDB
Configured in `docker-compose.yml`:
```yaml
volumes:
  mongodb_data:
    driver: local
```
Mounted to `/data/db` inside the MongoDB container.
**Verification**: Verified by creating tasks, destroying containers with `docker compose down`, recreating them with `docker compose up -d`, and confirming that all tasks and database state persist intact.

---

## Single-Command Execution & Verification

### 1. Run the Entire Stack
```bash
docker compose up --build -d
```
*(or run without `-d` to stream all service logs in foreground: `docker compose up --build`)*

### 2. Confirm All Containers are Running
```bash
docker ps
```
**Sample Output**:
```
CONTAINER ID   IMAGE                       COMMAND                  STATUS          PORTS                                             NAMES
ff704fdbd012   awdf_prac-6-main-frontend   "docker-entrypoint.s…"   Up 20 seconds   0.0.0.0:5173->5173/tcp, [::]:5173->5173/tcp       frontend
3f289b6090bf   awdf_prac-6-main-backend    "docker-entrypoint.s…"   Up 22 seconds   0.0.0.0:5000->5000/tcp, [::]:5000->5000/tcp       backend
96910ddf0ca4   mongo:latest                "docker-entrypoint.s…"   Up 23 seconds   0.0.0.0:27017->27017/tcp, [::]:27017->27017/tcp   mongodb
```

### 3. Inspect Container Logs
```bash
# Backend logs (MongoDB connection + EventEmitter)
docker logs backend

# Frontend logs (Vite preview server)
docker logs frontend

# MongoDB logs
docker logs mongodb
```

### 4. Stop the Stack
```bash
# Stop containers without removing persistent database data
docker compose down

# Stop containers and remove volumes (wipes database)
docker compose down -v
```

---

## Localhost Links & Access Endpoints

| Service | Component | Localhost Link | Description |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React + Vite Application | [http://localhost:5173](http://localhost:5173) | Full-stack Task Management web application UI |
| **Backend API** | Express Root Endpoint | [http://localhost:5000/](http://localhost:5000/) | Returns API status and active database mode |
| **Health Check** | API Health Endpoint | [http://localhost:5000/health](http://localhost:5000/health) | Returns JSON status and database connectivity mode |
| **Tasks API** | REST CRUD Endpoint | [http://localhost:5000/tasks](http://localhost:5000/tasks) | Endpoint for task fetching and CRUD operations |
| **Event Logs** | Asynchronous Event Monitor | [http://localhost:5173/event-logs](http://localhost:5173/event-logs) | Real-time EventEmitter audit log viewer |
| **MongoDB** | Database Port Forwarding | `mongodb://localhost:27017/taskdb` | Exposed port for MongoDB Compass or host tools |

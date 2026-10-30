# Task Management Application — Advanced Web Development Frameworks

[![CI Pipeline](https://github.com/AyushDesai007/AWDF/actions/workflows/ci.yml/badge.svg)](https://github.com/AyushDesai007/AWDF/actions/workflows/ci.yml)

## Practicals Overview
- **Practical 12: CI/CD Pipeline with GitHub Actions** — [PR12 README.md](./PR12%20README.md)
- **Practical 11: Containerization with Docker & Docker Compose** — [PR11 README.md](./PR11%20README.md)
- **Practical 10: Asynchronous Processing with EventEmitter** — [PR10 README.md](./PR10%20README.md)
- **Practical 6–9: React + Node.js + Express + MongoDB Task CRUD**

---

## Practical 12: CI/CD Pipeline Summary
The repository includes automated Continuous Integration powered by **GitHub Actions** (`.github/workflows/ci.yml`).
- **Triggers**: On every `push` to `main` and on `pull_request` targeting `main`.
- **Automated Steps**:
  1. Checks out repository source code.
  2. Sets up Node.js 18.
  3. Installs backend dependencies (`npm install`).
  4. Runs automated Jest and Supertest test suites (`npm test`).
- **Test Coverage**:
  - `GET /health` — Verifies system health check.
  - `GET /tasks` — Verifies HTTP 200 and task array payload.
  - `POST /tasks` — Verifies task creation with HTTP 201.
  - `POST /tasks` validation — Verifies HTTP 400 when title is missing.
- See detailed logs, screenshots, and viva questions in [PR12 README.md](./PR12%20README.md).

---

## Running the Automated Tests Locally

```bash
cd backend
npm install
npm test
```

---

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

---

## Manual / Local Setup (Alternative)

### 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env    # edit MONGO_URI if needed
npm run dev              # or: npm start
```

The server listens on `http://localhost:5000`.

Endpoints:
| Method | Route        | Description       |
|--------|--------------|--------------------|
| GET    | /health      | Health check API   |
| GET    | /tasks       | List all tasks     |
| POST   | /tasks       | Create a task      |
| PUT    | /tasks/:id   | Update a task      |
| DELETE | /tasks/:id   | Delete a task      |

### 2. Frontend setup

In a **separate terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

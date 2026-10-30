# Practical 12: CI/CD Pipeline with GitHub Actions

[![CI Pipeline](https://github.com/AyushDesai007/AWDF/actions/workflows/ci.yml/badge.svg)](https://github.com/AyushDesai007/AWDF/actions/workflows/ci.yml)

## Course Information
- **Course**: Advanced Web Development Frameworks (ITUE301)
- **Institution**: Charotar University of Science and Technology (CHARUSAT) - CSPIT / DEPSTAR
- **Student ID**: 24IT012
- **CO / PO**: CO5 / PO3, PO5
- **Objective**: To automate testing and deployment of the application using a CI/CD pipeline.

---

## Architecture & CI/CD Pipeline Workflow

```
                        git push origin main / Pull Request
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │      GitHub Actions Workflow Trigger     │
                  │         (.github/workflows/ci.yml)      │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │           Job: build-and-test           │
                  │          Runner: ubuntu-latest          │
                  │                                         │
                  │  1. Checkout repository code            │
                  │     (actions/checkout@v4)               │
                  │                                         │
                  │  2. Setup Node.js runtime               │
                  │     (actions/setup-node@v4 - v18)       │
                  │                                         │
                  │  3. Install dependencies                │
                  │     (npm install)                       │
                  │                                         │
                  │  4. Execute automated tests             │
                  │     (npm test via Jest & Supertest)     │
                  └────────────────────┬────────────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                   [Test Fails]                [Test Passes]
                         │                           │
                         ▼                           ▼
                 ❌ Red X on GitHub           ✅ Green Checkmark
              (Build marked as Failed)     (Build marked as Success)
```

---

## Problem Definition & Implementation Summary

1. **Automated Testing Suite (`backend/tests/api.test.js`)**:
   - Utilizes `jest` and `supertest` to test backend endpoints without spinning up separate infrastructure.
   - **Test 1 (`GET /health`)**: Confirms API availability and operational health.
   - **Test 2 (`GET /tasks`)**: Core lab requirement validating task retrieval with HTTP status `200` and an array response payload.
   - **Test 3 (`POST /tasks`)**: Post-lab assignment requirement testing automated creation of tasks with HTTP status `201`.
   - **Test 4 (`POST /tasks` validation)**: Validates input validation handling (missing title returns HTTP `400`).

2. **In-Memory Test Isolation (`backend/server.js`)**:
   - Configured Express app with graceful environment detection (`NODE_ENV === 'test'`).
   - In test mode, MongoDB network connection is bypassed, and fast in-memory storage handles requests, ensuring zero external dependencies and near-instant execution in CI runners.

3. **CI Pipeline Workflow (`.github/workflows/ci.yml`)**:
   - Automated triggers on every `push` to `main` branch as well as on `pull_request` targeting `main`.
   - Provisions an isolated Ubuntu Linux runner (`ubuntu-latest`).
   - Checks out the project code, sets up Node.js v18, runs `npm install`, and executes `npm test`.

---

## Demonstration: Pipeline Failure vs. Fixed Success

### 1. Deliberately Broken Test (Red X ❌)
- **Commit SHA**: [`61b659a`](https://github.com/AyushDesai007/AWDF/commit/61b659a40745b145ca0e6a6ff1e8595359a439ce)
- **Commit Message**: `feat(ci): set up GitHub Actions CI workflow with deliberate test failure for demonstration`
- **Deliberate Change**: Changed expected HTTP status code of `GET /tasks` from `200` to `500`.
- **Pipeline Run ID**: `41057337040`
- **GitHub Actions Run URL**: [https://github.com/AyushDesai007/AWDF/actions/runs/41057337040](https://github.com/AyushDesai007/AWDF/actions/runs/41057337040)
- **Job URL**: [https://github.com/AyushDesai007/AWDF/actions/runs/41057337040/job/124068068826](https://github.com/AyushDesai007/AWDF/actions/runs/41057337040/job/124068068826)
- **Status**: Completed with `failure` (Red X ❌)
- **Execution Log**:
  ```text
  ● Task Management API Automated Tests (CI/CD Practical 12) › GET /tasks returns 200

    expect(received).toBe(expected) // Object.is equality

    Expected: 500
    Received: 200

      17 |     const res = await request(app).get('/tasks');
      18 |     // DELIBERATE FAILURE: changed expected status code to 500 to demonstrate CI Red X
    > 19 |     expect(res.statusCode).toBe(500);
         |                            ^
      20 |   });

  Test Suites: 1 failed, 1 total
  Tests:       1 failed, 3 passed, 4 total
  ```

---

### 2. Corrected & Passing Pipeline (Green Checkmark ✅)
- **Commit SHA**: [`6847e14`](https://github.com/AyushDesai007/AWDF/commit/6847e14a37d24f074ee7c290df38bc5a9a6ef9fd)
- **Commit Message**: `fix(tests): correct GET /tasks assertion to 200 and document Practical 12 CI pipeline`
- **Pipeline Run ID**: `41058210899`
- **GitHub Actions Run URL**: [https://github.com/AyushDesai007/AWDF/actions/runs/41058210899](https://github.com/AyushDesai007/AWDF/actions/runs/41058210899)
- **Job URL**: [https://github.com/AyushDesai007/AWDF/actions/runs/41058210899/job/124070995651](https://github.com/AyushDesai007/AWDF/actions/runs/41058210899/job/124070995651)
- **Status**: Completed with `success` (Green Checkmark ✅)
- **Execution Log**:
  ```text
  PASS tests/api.test.js
    Task Management API Automated Tests (CI/CD Practical 12)
      ✓ GET /health returns status 200 and healthy status payload (102 ms)
      ✓ GET /tasks returns 200 (18 ms)
      ✓ POST /tasks creates a new task successfully (740 ms)
      ✓ POST /tasks without title returns 400 validation error (19 ms)

  Test Suites: 1 passed, 1 total
  Tests:       4 passed, 4 total
  Snapshots:   0 total
  Time:        2.204 s
  ```

---

## Step-by-Step CI Pipeline Execution Table

| Step # | Step Name | Runner Action / Command | Run 1 Result (Deliberate Failure) | Run 2 Result (Corrected) |
|---|---|---|:---:|:---:|
| 1 | Set up job | Prepare `ubuntu-latest` virtual environment | ✅ Success | ✅ Success |
| 2 | Checkout code | `actions/checkout@v4` | ✅ Success | ✅ Success |
| 3 | Setup Node.js | `actions/setup-node@v4` (Node 18) | ✅ Success | ✅ Success |
| 4 | Install dependencies | `npm install` | ✅ Success | ✅ Success |
| 5 | Run tests | `npm test` (`jest --detectOpenHandles --forceExit`) | ❌ Failed (Status 200 ≠ 500) | ✅ Success (All 4 passed) |
| 6 | Overall Conclusion | Pipeline Status on GitHub | **Red X (Failed)** | **Green Check (Passed)** |

---

## Key Questions & Analysis

### 1. What is the difference between Continuous Integration (CI) and Continuous Deployment (CD), and which one does this practical actually demonstrate?
- **Continuous Integration (CI)**: The software development methodology where developers frequently integrate code commits into a shared repository. Each commit triggers an automated build and test pipeline to detect integration bugs immediately. The goal is to verify code correctness and build integrity early.
- **Continuous Deployment (CD)**: The extension of continuous integration where every build that successfully passes the automated test suite is automatically deployed to target production or staging environments without manual human gates.
- **Practical Demonstration**: This practical specifically demonstrates **Continuous Integration (CI)**. It automatically executes checkout, dependency installation (`npm install`), and the Jest/Supertest suite (`npm test`) on GitHub remote runners upon every push, reporting a definitive pass/fail badge.

### 2. Why does running tests automatically on every push catch problems earlier than testing manually before a release?
1. **Immediate Feedback Loop**: Developers obtain automated validation within seconds of pushing a commit. If an error is introduced, the context of the change is still fresh in mind.
2. **Defect Localization**: Because tests execute on small, incremental commits rather than large release batches, isolating the exact commit and code line that caused the regression is straightforward.
3. **Elimination of Human Oversight**: Manual testing can miss edge cases or regression in older endpoints due to repetitive fatigue. Automated CI runs all unit, integration, and validation tests uniformly every time.
4. **Guaranteed Environment Consistency**: Manual testing often suffers from the "it works on my machine" syndrome due to leftover local files or environment differences. CI executes in a clean, ephemeral container/VM environment.

### 3. What would happen to the pipeline if the test file path were incorrect — would the workflow fail at the same step as a genuine test failure?
- **Failure Step Comparison**:
  - **Genuine Test Failure**: Occurs during the `npm test` step when the test runner (Jest) executes the test file, finds an assertion mismatch (e.g., status 200 instead of 500), and exits with exit code `1`. Jest explicitly formats the assertion failure diff.
  - **Incorrect Test File Path**:
    - If a specific file path is passed to Jest (e.g., `jest nonexistent/path.test.js`), Jest will throw a `No tests found` or `Cannot find module` error and exit with a non-zero code.
    - If default discovery patterns are used, Jest will report `No tests found related to files changed` or `No tests found in ...`, failing with code `1` unless configured with `--passWithNoTests`.
  - **Key Distinction**: While both fail during the `Run tests` (`npm test`) step of the workflow, the failure reason, diagnostic log message, and underlying cause are fundamentally different: one is a test runner configuration/path resolution error, whereas the other is an application assertion/contract breach.

---

## Supplementary Problems & Enhancements

1. **Pull Request Triggering**:
   The workflow is configured with both `push` and `pull_request` triggers targeting `main`, preventing broken code from being merged via PRs.
2. **Multiple Endpoint Test Coverage**:
   Covers `GET /health`, `GET /tasks`, `POST /tasks` (successful creation), and `POST /tasks` (payload validation).
3. **CI Pipeline Status Badge**:
   Integrated status badge directly into the repository README reflecting live build health:
   ```markdown
   [![CI Pipeline](https://github.com/AyushDesai007/AWDF/actions/workflows/ci.yml/badge.svg)](https://github.com/AyushDesai007/AWDF/actions/workflows/ci.yml)
   ```

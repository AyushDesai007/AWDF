# Practical 13: AI API Integration into a Web Application

[![CI Pipeline](https://github.com/AyushDesai007/AWDF/actions/workflows/ci.yml/badge.svg)](https://github.com/AyushDesai007/AWDF/actions/workflows/ci.yml)

## Course Information
- **Course**: Advanced Web Development Frameworks (ITUE301)
- **Institution**: Charotar University of Science and Technology (CHARUSAT) - CSPIT / DEPSTAR
- **Student ID**: 24IT012
- **CO / PO**: CO6 / PO3, PO5, PO12
- **Objective**: To integrate an external AI service into the existing application and understand responsible AI usage.

---

## Architecture & Integration Diagram

```
                        React Frontend (Port 5173)
                                    │
                                    │ 1. User enters title & clicks
                                    │    "✨ Generate Description"
                                    ▼
                POST /api/ai/generate-description (JSON: { title })
                                    │
                                    ▼
                       Express Backend (Port 5000)
                  ├── Rate Limiter (Max 5 req/min per client)
                  ├── Input Validation (1 - 200 chars, non-empty)
                  └── API Key Check (.env: OPENAI_API_KEY)
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
        [API Key Configured & Valid]   [Missing / Invalid Key / Network Timeout]
                    │                               │
                    ▼                               ▼
             OpenAI Cloud API             Graceful Local Fallback
        (Model: gpt-4o-mini / 6s TO)     (Dynamic Contextual Engine)
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                      JSON Response Sent to React:
             { description: "...", fallback: boolean, notice: "..." }
                                    │
                                    ▼
                         React User Interface
                  ├── Populates editable suggestion in textarea
                  ├── Displays warning / provider notice banner
                  └── Enforces Responsible AI review disclaimer
```

---

## Problem Definition & Implementation Summary

1. **Secure Backend AI Route (`backend/routes/ai.js`)**:
   - Implemented route `POST /api/ai/generate-description` (and alias `/ai/generate-description`).
   - Secure server-side credential isolation: `OPENAI_API_KEY` is loaded exclusively via `dotenv` in the backend runtime and is never leaked to the client bundle or network inspector.
   - Timeout protection: Configured OpenAI client with strict timeout (`AI_REQUEST_TIMEOUT_MS = 6000ms`) so hanging third-party calls never tie up server resources.

2. **Graceful Degradation & High Availability**:
   - If the third-party AI provider experiences an outage, 401 invalid credentials, network disconnect, or if the API key is not yet configured, the system catches errors gracefully and delivers a contextual fallback description.
   - The core Task Management application never crashes or returns HTTP 500 when external AI fails.

3. **Input Validation & Abuse Mitigation**:
   - Rejects empty or whitespace-only task titles with HTTP 400 (`Task title is required`).
   - Enforces character length threshold (max 200 characters) with HTTP 400 (`Task title cannot exceed 200 characters`).
   - Implemented sliding-window rate limiting (max 5 AI requests per minute per client) to prevent quota exhaustion and abuse.

4. **Interactive React UI (`frontend/src/components/TaskForm.jsx`)**:
   - Added a **"✨ Generate Description"** button integrated directly into the Task creation form.
   - Built a dynamic loading state with an animated spinner (`⏳ Generating...`) disabling duplicate submissions while waiting for the response.
   - Displays the returned text as an **editable suggestion** in the textarea, allowing the user to review, edit, or accept the generated description before saving.
   - Prominently displays a Responsible AI disclaimer:  
     *“AI-generated suggestions may be inaccurate. Review and edit before saving.”*
   - Displays an informational status pill when fallback mode is active.

---

## Automated Test Coverage (`backend/tests/api.test.js`)

The backend test suite contains **13 automated test scenarios** covering CI/CD pipelines, authentication, and comprehensive AI edge cases:

```text
PASS tests/api.test.js
  Task Management API Test Suite
    Core API & CI/CD Pipeline (Practical 12)
      ✓ should return HTTP 200 and backend operational status on GET /health
      ✓ should return HTTP 200 with an array of tasks on GET /tasks
      ✓ should create a task successfully on POST /tasks with HTTP 201
      ✓ should reject task creation without title with HTTP 400
    Authentication & Security
      ✓ should reject request with invalid or tampered JWT token with HTTP 401
      ✓ should reject registration missing email and password with HTTP 400
    PRACTICAL 13: POST /api/ai/generate-description
      ✓ Scenario 1: should generate an AI description for a valid task title with configured provider
      ✓ Scenario 2: should reject empty, whitespace, or missing title with HTTP 400
      ✓ Scenario 2 (cont.): should reject title exceeding length limit (> 200 chars) with HTTP 400
      ✓ Scenario 3: should return controlled fallback when API key is missing
      ✓ Scenario 4: should handle invalid API key credentials gracefully without crashing
      ✓ Scenario 5: should handle provider timeout / network failure gracefully
      ✓ Scenario 6: should enforce rate limiting on repeated rapid requests

Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

---

## Key Questions & Analysis

### 1. Why must the AI API key be called from the backend rather than directly from the React frontend?
- **Exposure in Client Bundles**: Any secret placed in client-side code (`VITE_...` or `.env` files bundled by Vite/Webpack) is embedded into static JavaScript files shipped to the browser. Anyone inspecting page sources or using DevTools can extract the API key.
- **Quota Thefts & Financial Liability**: If an API key is exposed publicly, malicious actors can extract it, abuse high-tier model endpoints, exhaust API quotas, and incur substantial monetary costs on the owner's billing account.
- **Access Control & Central Enforcement**: Centralizing external API communication through an Express backend enables the backend to enforce user authentication, session verification, payload validation, abuse logging, and rate limiting before any paid API request is sent.

### 2. What does 'graceful degradation' mean in this context, and why does it matter for a feature that depends on a third-party service outside your control?
- **Definition**: Graceful degradation is a software design pattern where a system continues to operate and provide essential functionality even when one or more non-critical auxiliary components or third-party dependencies fail.
- **Importance in Third-Party AI**: External AI services are susceptible to rate limit throttling, server outages, DNS issues, breaking schema changes, and high latency. 
- **Application Context**: In this Task Management system, auto-generating a task description is an auxiliary convenience feature. If OpenAI or Gemini goes down or credentials expire, the application catches the error, presents a local contextual template, and keeps the task creation form fully operational without crashing or blocking the user.

### 3. What are the privacy and governance implications of sending task data to an external AI API, and what kind of data should never be sent this way?
- **Privacy & Governance Risks**:
  - Many public AI APIs utilize transmitted prompt data for model fine-tuning unless enterprise zero-data-retention (ZDR) agreements are formally executed.
  - Sending sensitive business or personal data violates privacy regulations such as GDPR, HIPAA, and corporate NDA boundaries.
- **Data That Must Never Be Sent to External AI**:
  1. Personally Identifiable Information (PII) such as Aadhaar/SSN numbers, home addresses, phone numbers, and dates of birth.
  2. Authentication secrets, API tokens, passwords, private encryption keys, and environment variables.
  3. Proprietary trade secrets, patented algorithms, unreleased source code, or confidential student academic records.
  4. Protected Health Information (PHI) such as medical diagnoses or personal health history.

---

## Supplementary Problems Addressed

- **Frontend Loading State**: Implemented dynamic `generatingAi` state displaying an animated spinner and preventing double submissions while awaiting API responses.
- **Abuse Prevention / Rate Limiting**: Added sliding-window rate limiting enforcing a maximum of 5 requests per minute per client IP.
- **Responsible AI Disclaimer**: Added visible disclaimer informing users that AI-generated suggestions must be reviewed for correctness before submitting.

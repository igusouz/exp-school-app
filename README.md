# School Performance Manager

Web application built with Next.js (App Router) and TypeScript for student management, class management, evaluation grids, and daily summary notifications.

## Overview

The system provides:

- Student CRUD with required fields: name, CPF, and email.
- Class CRUD with: topic, year, semester, enrolled students, and goals.
- Evaluation matrix where:
	- Rows are students.
	- Columns are goals.
	- Allowed values are only: MANA, MPA, and MA.
- Server-side persistence using JSON files.
- Notification queue and daily consolidated email per student (anti-spam strategy).

No authentication is required in this version.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- React
- Tailwind CSS
- Nodemailer
- JSON file persistence (no relational database)

## Project Structure

The code follows a layered structure inspired by Clean Architecture:

- Domain/Shared models and constants: `lib/shared`
- Application/business rules (use-case services): `lib/application`
- Infrastructure (JSON storage, repositories, mail transport): `lib/infrastructure`
- API presentation layer (HTTP response helpers): `lib/presentation`
- API routes: `app/api`
- UI pages/components: `app`, `components`
- JSON data files: `data`
- Unit tests (Vitest): `tests/unit`
- Acceptance tests (Gherkin + Cucumber): `tests/acceptance`
- Shared test helpers: `tests/support`

## Data Persistence

Server-side JSON files:

- `data/students.json`
- `data/classes.json`
- `data/notifications.json`

These files are created automatically if missing.

## Notification Flow (Daily Summary)

1. When an evaluation changes, an event is appended to `pending` in `data/notifications.json`.
2. A daily dispatch process groups pending changes by student.
3. For each student, one summary email is generated covering all changed classes/goals.
4. After sending, the student is marked in `dispatchLog` for that day and pending events are cleared for that student.

This ensures at most one summary email per student per day.

## Email Configuration

The app supports real SMTP and a development fallback.

### Environment Variables

Create a `.env.local` file in the project root:

```env
EMAIL_FROM=no-reply@exp-school.local

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_password
SMTP_SECURE=false
```

Behavior:

- If `SMTP_HOST` exists, real SMTP is used.
- If not set, the app uses Nodemailer JSON transport (logs preview payload to server console).

## Getting Started

Install dependencies:

```bash
npm install
```

Run in development:

```bash
npm run dev
```

Open:

- http://localhost:3000

Build for production:

```bash
npm run build
npm run start
```

Lint:

```bash
npm run lint
```

## Testing

The project includes both unit tests and acceptance tests.

### Unit Tests

- Runner: Vitest
- Focus: service/business logic and repository interactions

Run unit tests:

```bash
npm run test:unit
```

### Acceptance Tests

- Runner: Cucumber
- Format: Gherkin (`.feature`)
- Step definitions: TypeScript

Run acceptance tests:

```bash
npm run test:acceptance
```

### Run Full Test Suite

```bash
npm run test
```

### Current Test Files

- Unit tests:
	- `tests/unit/student-service.test.ts`
	- `tests/unit/evaluation-notification.test.ts`
- Acceptance test feature:
	- `tests/acceptance/student-evaluation-and-notification.feature`
- Acceptance step definitions:
	- `tests/acceptance/steps/student-evaluation.steps.ts`

### Acceptance Coverage Highlights

The acceptance suite currently validates scenarios such as:

- Updating evaluation matrix values (MANA, MPA, MA)
- Queueing notification events without immediate email send
- Student deletion with automatic unenrollment from classes
- Student creation and duplicate CPF rejection
- Class creation with enrolled students and goal definitions
- Daily summary dispatch aggregation across multiple classes
- Prevention of duplicate summary emails on the same day
- Clearing class evaluation cells when a student is removed from enrollment

### Test Data Isolation

- Tests reset JSON files before each scenario/test using `tests/support/data-store.ts`.
- This prevents cross-test contamination while preserving reproducibility.

## Main UI Modules

- Dashboard (`/`)
	- Access students and classes modules.
	- Includes a button to manually run daily notification dispatch.

- Students (`/students`)
	- Create, update, remove students.
	- Validates email and CPF format and uniqueness.

- Classes (`/classes`)
	- Create, update, remove classes.
	- Define topic, year, semester, goals, and enrolled students.
	- Access class details and evaluation grid.

- Class Details (`/classes/:id`)
	- View class metadata and enrolled students.

- Evaluation Grid (`/classes/:id/evaluations`)
	- Matrix/table editor for goals per student.
	- Allowed values: MANA, MPA, MA.
	- Saving queues notification events for daily email summaries.

## API Endpoints

### Students

- `GET /api/students`
- `POST /api/students`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`

### Classes

- `GET /api/classes`
- `POST /api/classes`
- `GET /api/classes/:id`
- `PUT /api/classes/:id`
- `DELETE /api/classes/:id`

### Evaluations

- `GET /api/classes/:id/evaluations`
- `PUT /api/classes/:id/evaluations`

### Notifications

- `POST /api/notifications/dispatch`

## Scheduling Daily Dispatch

Current implementation exposes manual dispatch endpoint:

- `POST /api/notifications/dispatch`

For production, schedule this endpoint once per day using your preferred scheduler (for example Vercel Cron, GitHub Actions, or server cron).

## Validation Rules (Highlights)

- CPF must contain exactly 11 digits.
- Email must have valid format.
- Student email and CPF are unique.
- Class semester must be 1 or 2.
- Evaluation values are restricted to MANA, MPA, MA.
- Evaluation updates must reference enrolled students and existing goals.

## Notes and Limitations

- JSON persistence is simple and great for prototypes/small deployments.
- For multi-instance deployments or heavy concurrency, migrate to a database.
- No authentication or authorization is implemented in this phase.

## License

This project is currently provided without an explicit license file.

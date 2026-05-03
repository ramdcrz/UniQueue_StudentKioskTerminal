# Contributing to UniQueue 🎟️

Thank you for contributing to this project. This repository is being built as a professional, open-source-grade collaboration effort for a centralized queueing system used by New Era University students and staff.

## 1. Introduction & Architecture Context 🧭

UniQueue is a zero-hardware, QR-based digital ticket system for enrollment operations across the Main Building, IS, SOM, and PSB. Students receive a digital queue ticket, scan or open it on their phone, and track their position in real time without thermal printers or manual ticket slips.

The application uses WebSockets through Socket.io for live queue updates, so kiosk, staff, and monitor screens stay synchronized without refresh. The user interface follows a Liquidglass design system, combining a premium glassmorphism aesthetic with Tailwind CSS for utility-driven styling and responsive layout control.

## 2. Local Environment Setup 🛠️

> The current workspace includes `package.json`, but no `prisma/schema.prisma` file was present in the scanned snapshot. The commands below reflect the project scripts and the standard Prisma workflow your team should use with the actual schema file in the repo.

### Prerequisites

- Node.js 20+ recommended
- npm
- A local PostgreSQL instance
- A Prisma schema file at `prisma/schema.prisma` or the schema path your team uses

### Install dependencies

```bash
npm install
```

### Set up PostgreSQL locally

Create a local database for the app. The database name used in this guide matches the project’s existing documentation.

```bash
createdb queue_db
```

If you prefer `psql`:

```bash
psql -U postgres -c "CREATE DATABASE queue_db;"
```

### Create `.env.local`

Create a `.env.local` file in the repository root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/queue_db"
NEXT_PUBLIC_BASE_URL="http://localhost:9002"
```

### Generate Prisma client and sync the database

Run these commands after the schema is in place:

```bash
npx prisma generate
npx prisma db push
```

If your team uses migrations instead of `db push`, use:

```bash
npx prisma migrate dev --name init
```

### Start the development server

The `dev` script in `package.json` runs Next.js with Turbopack on port `9002`.

```bash
npm run dev
```

### Helpful verification commands

```bash
npm run typecheck
npm run lint
```

## 3. Branching Strategy (Strict) 🌿

We use a strict `main`-protected workflow.

- `main` is locked.
- No direct commits are allowed to `main`.
- All work must be done on a branch created from `main`.
- Every branch should represent one clear change.

### Branch naming conventions

- `feat/` for new features
- `fix/` for bug fixes
- `ui/` for Tailwind or Liquidglass changes
- `docs/` for documentation updates

### Examples

- `feat/qr-ticket-generation`
- `feat/realtime-queue-sync`
- `fix/monitor-now-serving-refresh`
- `fix/ticket-number-duplication`
- `ui/mobile-status-card-layout`
- `ui/tv-monitor-contrast-tuning`
- `docs/contributing-workflow`
- `docs/setup-prisma`

### Branch rules

- Branch from `main` only.
- Keep branches short-lived and focused.
- Rebase or merge from `main` often to avoid drift.
- Do not use force-pushes on protected branches unless explicitly approved by maintainers.

## 4. Commit Message Standard ✍️

All commits must follow Conventional Commits.

### Format

```text
<type>(<scope>): <short summary>
```

### Common types

- `feat`
- `fix`
- `docs`
- `chore`
- `refactor`
- `test`
- `ui`

### Examples for this project

- `feat(auth): implement admin RBAC login`
- `fix(queue): correct live ticket ordering for enrollment counters`
- `ui(monitor): refine liquidglass layout for the TV status display`

### Commit rules

- Write messages in the imperative mood.
- Keep the subject line concise and specific.
- Use the body when you need to explain the reason behind a change.
- Reference issues or task numbers in the footer when relevant.

## 5. Pull Request (PR) Process 🔁

All changes must be merged through a pull request.

### Before opening a PR

- Ensure your branch is up to date with `main`.
- Run the required checks locally.
- Confirm the change is limited to the intended scope.
- Add or update tests when applicable.

### PR submission steps

1. Push your branch to the remote repository.
2. Open a PR against `main`.
3. Describe what changed, why it changed, and how it was tested.
4. Link any related issue, task, or discussion.
5. Request review from at least one teammate.

### UI screenshot requirement

If the PR includes UI changes, attach screenshots in the PR description.

This is mandatory for:

- Mobile status view updates
- TV monitor view updates
- Any Tailwind or Liquidglass layout changes that affect visual behavior

### Merge requirements

- At least one code review approval is required before merging.
- Do not merge if checks are failing.
- Resolve all comments, conflicts, and review blockers before the final merge.

### Good PR hygiene

- Keep PRs focused and reviewable.
- Prefer small, incremental changes over large mixed-scope PRs.
- Use screenshots, short clips, or annotated images when UI behavior changes.

## 6. Recommended Quality Checklist ✅

Before submitting your work, confirm the following:

- The feature works locally.
- Type checking passes.
- Linting passes.
- Prisma changes are consistent with the schema and database state.
- Socket.io events are handled correctly across clients.
- UI changes remain readable, responsive, and accessible.

## 7. Collaboration Notes 💬

- Communicate early when your work affects shared queue flows, ticket states, or department rules.
- Avoid committing unrelated changes in the same branch.
- If you are unsure about architecture, branch naming, or merge strategy, ask before opening the PR.

## 8. Quick Reference 📌

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Development server: `http://localhost:9002`

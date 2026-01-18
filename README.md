# Horizon Truth Backend

Horizon Truth is a platform dedicated to tracking and verifying claims. This repository contains the backend service built with **NestJS**, **TypeORM**, and **SQLite**.

## 🚀 Tech Stack

- **Framework:** [NestJS](https://nestjs.com/)
- **Database:** [SQLite](https://sqlite.org/) (via `better-sqlite3`)
- **ORM:** [TypeORM](https://typeorm.io/)
- **Validation:** [Zod](https://zod.dev/) (via `nestjs-zod`)
- **Language:** TypeScript

## 📂 Project Structure

- `src/users/`: User management and profiles.
- `src/claims/`: Claim tracking and management.
- `src/reviews/`: Community reviews for claims.
- `src/app.module.ts`: Core application module configuration.

## 🛠 Setup & Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (copy `.env.example` to `.env`):
   ```bash
   cp .env.example .env
   ```

## 📜 Available Scripts

- `npm run start:dev`: Start the application in development mode with watch mode.
- `npm run build`: Build the application for production.
- `npm run start:prod`: Start the application in production mode.
- `npm run lint`: Run ESLint to check for code quality issues.
- `npm run test`: Run unit tests using Jest.
- `npm run test:e2e`: Run end-to-end tests.

## 🧪 Testing

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

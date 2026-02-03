# Horizon Truth API (v2)

## 📌 Project Governance

- 📜 [Project Charter](./PROJECT_CHARTER.md)
- 🤝 [Code of Conduct](./CODE_OF_CONDUCT.md)
- 🛠️ [Contributing Guide](./CONTRIBUTING.md)

---

## 🎯 Project Overview

**Horizon Truth** is a platform dedicated to tracking and verifying public claims. This repository (`horizon-truth-api-v2`) contains the **backend API service** that powers the Horizon Truth ecosystem.

The API provides core business logic, data persistence, authentication, authorization, and external integrations for all Horizon Truth client applications. Built with **NestJS**, **TypeORM**, and **PostgreSQL**, it is engineered for security, scalability, and production readiness.

## 🚀 Tech Stack

### Core Framework & Language
- **Framework:** [NestJS v11](https://nestjs.com/)
- **Language:** TypeScript v5.7.3

### Database & ORM
- **Database:** PostgreSQL
- **ORM:** [TypeORM v0.3](https://typeorm.io/)

### Security & Authentication
- **Authentication:** Passport.js with JWT and API Key strategies
- **Password Hashing:** bcrypt v6
- **Validation:** Zod v4.3 with nestjs-zod integration

### Development Tools
- **Linting:** ESLint v9 with TypeScript support
- **Formatting:** Prettier v3.4
- **Testing:** Jest v30 with ts-jest
- **Build Tool:** Nest CLI v11

## 📂 Project Structure

```
src/
├── users/          # User management, profiles, and authentication
├── claims/         # Claim tracking, submission, and lifecycle
├── reviews/        # Community reviews, verification, and moderation
├── common/         # Shared utilities, guards, filters, and decorators
├── config/         # Configuration and environment setup
└── app.module.ts   # Root application module
```

## 🛠️ Quick Start

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- PostgreSQL v13 or higher (for production)

### Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Horizon-Truth/horizon-truth-api-v2
    cd horizon-truth-api-v2
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure environment**
    ```bash
    # Copy the appropriate environment file
    cp .env.development .env
    ```

4.  **Update the `.env` file** with your database credentials and other required settings.

5.  **Start the development server**
    ```bash
    npm run start:dev
    ```
    The API will be available at `http://localhost:3000`.

## 🌍 Environment Configuration

The application uses `@nestjs/config` for environment management. Key variables include:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Application port | `3000` |
| `NODE_ENV` | Runtime environment | `development` |
| `DB_TYPE` | Database type (`postgres` or `sqlite`) | `sqlite` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `horizon-truth` |
| `DB_USER` | Database user | - |
| `DB_PASSWORD`| Database password | - |
| `DB_SYNCHRONIZE`| Auto-sync database schema | `false` |
| `JWT_SECRET` | Secret for signing tokens | - |
| `JWT_EXPIRY` | JWT expiration time | `7d` |
| `API_KEY_SECRET` | Secret for API key validation | - |

Template files (`.env.development`, `.env.staging`) are provided as references.

## 📜 Available Scripts

### Development
```bash
npm run dev              # Start with watch mode (alias for start:dev)
npm run start:dev        # Start with watch mode
npm run start:debug      # Start with debug and watch
npm run lint             # Run ESLint with auto-fix
npm run format           # Format code with Prettier
```

### Testing
```bash
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:cov         # Generate test coverage report
npm run test:debug       # Debug tests with inspector
npm run test:e2e         # Run end-to-end tests
```

### Building & Production
```bash
npm run build            # Build the application
npm start               # Start the application (for production use)
npm run start:prod      # Run the compiled production build
```

## 🧪 Testing Strategy

The project uses Jest with comprehensive testing configuration:

- **Unit Tests:** Located alongside source files with `.spec.ts` extension
- **E2E Tests:** Configured in `test/jest-e2e.json`
- **Coverage:** Reports generated in `coverage/` directory
- **Test Environment:** Node.js environment with proper TypeScript support

## 🔧 Database Configuration

### Development (Default)
- Uses SQLite with `better-sqlite3` driver
- Auto-synchronization can be enabled for rapid prototyping
- File-based database in project root

### Production
- PostgreSQL recommended for production deployments
- Use migrations for schema changes
- Set `DB_SYNCHRONIZE: false` in production

### Running Migrations
```bash
# TypeORM migration commands (if configured)
npx typeorm migration:run
npx typeorm migration:generate
```

## 🚀 Deployment

### Production Build
1. Set `NODE_ENV=production`
2. Configure production environment variables
3. Build the application:
   ```bash
   npm run build
   ```
4. Start the application:
   ```bash
   npm run start:prod
   ```

### Docker (Example)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/main"]
```

## 🔐 Security Features

- **Authentication:** JWT-based stateless authentication
- **API Keys:** Header-based API key authentication for service-to-service
- **Password Security:** bcrypt with salt rounds
- **Input Validation:** Zod schema validation for all endpoints
- **CORS:** Configurable Cross-Origin Resource Sharing

## 🤝 Contributing

We welcome contributions! Please start by reading our:
- [Contributing Guide](./CONTRIBUTING.md) for development workflows.
- [Code of Conduct](./CODE_OF_CONDUCT.md) to understand our community standards.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

## 📄 License

This project is proprietary and **UNLICENSED**. All rights reserved. See the [LICENSE](./LICENSE) file for details.

---

> **For the complete project vision and governance model, please see the [Project Charter](./PROJECT_CHARTER.md).**

## 🔗 Related Repositories

- **Frontend Application:** [horizon-truth-web](https://github.com/Horizon-Truth/horizon-truth-client-v2)
- **Documentation:** [horizon-truth-docs](https://github.com/Horizon-Truth/horizon-truth-docs)
- **Live Documentation:** [horizontruth.org/docs/](https://horizontruth.org/docs/)
- **API Reference (Swagger):** [horizontruth.org/api/v1/docs](https://horizontruth.org/api/v1/docs)
    
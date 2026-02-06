# Horizon Truth API (v2)

[![CI](https://github.com/Horizon-Truth/horizon-truth-api-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/Horizon-Truth/horizon-truth-api-v2/actions/workflows/ci.yml)

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
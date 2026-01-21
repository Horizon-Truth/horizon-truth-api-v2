# Horizon-Truth — Backend Project Charter

## 1. Project Overview

**Project Name:** Horizon-Truth Backend  
**Repository Type:** Open-Source  
**Primary Stack:** NestJS, TypeScript, PostgreSQL, TypeORM

### Mission

Horizon-Truth Backend provides a secure, scalable, and auditable server-side platform for detecting, analyzing, and managing misinformation through structured data pipelines, APIs, and AI-assisted services.

### Objectives

*   Provide a robust API layer for Horizon-Truth applications.
*   Ensure strong security, identity, and access controls.
*   Support scalable analytics and AI integrations.
*   Enable transparency, traceability, and auditability.

## 2. Scope & Non-Goals

### In Scope

*   Core API architecture and routing
*   Authentication and authorization
*   Data models and persistence
*   AI service integration interfaces
*   Audit logs and analytics pipelines
*   Admin and moderation APIs
*   OpenAPI / API documentation

### Out of Scope (Non-Goals)

*   UI or client-side rendering
*   End-user UX decisions
*   Mobile or desktop applications
*   Proprietary AI models (only integrations)

## 3. Governance Model

This project follows a **Maintainer-Led Consensus Model**.

*   Day-to-day decisions are made by Maintainers.
*   Major changes require consensus or majority approval.
*   The Project Lead has tie-breaking authority.

### Decision Categories

| Type                           | Approval Required           |
| :----------------------------- | :-------------------------- |
| Bug fixes                      | Any Maintainer              |
| Minor features                 | Maintainer consensus        |
| Major architecture changes     | Maintainer vote             |
| Governance changes             | Supermajority (⅔)           |

## 4. Roles & Responsibilities

### Project Lead

*   Sets technical direction
*   Resolves disputes
*   Oversees releases

### Maintainers

*   Review and merge PRs
*   Enforce coding standards
*   Manage issues and releases

### Contributors

*   Submit issues and pull requests
*   Follow contribution guidelines

### Reviewers

*   Provide code reviews
*   Validate architecture and security decisions

## 5. Contribution Model

Contributions must follow:

*   `CONTRIBUTING.md`
*   Coding standards and linting rules
*   Mandatory code reviews
*   CI checks must pass

**Promotion to Maintainer** is based on:
*   Consistent high-quality contributions
*   Community trust
*   Maintainer consensus

## 6. Release & Versioning Strategy

*   **Semantic Versioning (SemVer)**
*   Backward compatibility for minor releases
*   Breaking changes only in major releases
*   Release notes required for every version

## 7. Security & Compliance

*   Secure-by-default API design
*   Regular dependency updates
*   Responsible disclosure process for vulnerabilities
*   Audit logs for sensitive operations

## 8. Licensing & IP

*   Licensed under an OSI-approved open-source license (defined in `LICENSE`).
*   All contributions are licensed under the same terms.
*   No CLA required unless explicitly introduced.

## 9. Communication Channels

*   GitHub Issues & Discussions
*   Pull Request reviews
*   Optional community channels (Discord / Matrix)

## 10. Sustainability & Roadmap

*   Community-driven development
*   Optional sponsorship or grants
*   Transparent roadmap maintained in GitHub

## 11. Amendments

This charter may be amended by:

1.  Maintainer proposal
2.  Maintainer approval vote
3.  Public documentation of changes

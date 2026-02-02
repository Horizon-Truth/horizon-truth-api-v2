# Horizon-Truth — Backend Project Charter

## 1. Project Overview

**Project Name:** Horizon-Truth Backend  
**Repository Type:** Open-Source  
**Primary Stack:** NestJS, TypeScript, PostgreSQL, TypeORM

### Vision

To be the global gold standard for truth-centric infrastructure, empowering communities and organizations to reclaim the digital information space through transparency, collective intelligence, and unshakeable data integrity.

### Mission

To build and maintain a secure, decentralized, and high-performance backend ecosystem that provides the technical foundation for detecting misinformation, fostering media literacy, and enabling auditable fact-checking at scale.

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

## 7. Community Engagement Statement

Horizon-Truth is built on the belief that truth is a collective pursuit. We are committed to:
*   **Radical Transparency**: Making our processes, algorithms, and governance accessible to all.
*   **Inclusive Participation**: Welcoming contributors from diverse backgrounds, including technologists, journalists, and researchers.
*   **Ethical Innovation**: Ensuring our tools are developed with a primary focus on the public good and human rights.
*   **Continuous Dialogue**: Actively seeking and acting upon feedback from the communities we serve.

## 8. Security & Compliance

*   Secure-by-default API design
*   Regular dependency updates
*   Responsible disclosure process for vulnerabilities
*   Audit logs for sensitive operations

## 9. Licensing Strategy

Our licensing strategy is designed to maximize public benefit while protecting the integrity of the platform:
*   **Primary License**: The core backend is licensed under the **Apache License 2.0**, ensuring it remains free to use, modify, and distribute, while providing a clear patent grant to users.
*   **Documentation & Media**: All non-code assets and documentation are licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.
*   **Contribution Integrity**: By contributing to this project, contributors agree that their contributions are made under the same license terms as the project itself (Inbound=Outbound).
*   **Commercial Use**: We encourage commercial adoption and integration provided the terms of the Apache 2.0 license are respected, ensuring the ecosystem remains healthy and collaborative.

## 10. Communication Channels

*   GitHub Issues & Discussions
*   Pull Request reviews
*   Optional community channels (Discord / Matrix)

## 11. Sustainability & Roadmap

*   Community-driven development
*   Optional sponsorship or grants
*   Transparent roadmap maintained in GitHub

## 12. Amendments

This charter may be amended by:

1.  Maintainer proposal
2.  Maintainer approval vote
3.  Public documentation of changes

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
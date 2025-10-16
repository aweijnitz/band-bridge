# Architecture

## Overview
Band Bridge is implemented as a Next.js application using the App Router. React components render the UI, while server actions and API routes in the same project coordinate data access. Domain-oriented service modules encapsulate business rules and wrap the Prisma client, which persists data in a PostgreSQL database. Authentication helpers ensure only authorized users can read or modify resources.

## System Flow
```mermaid
flowchart TD
    Browser[Browser UI] --> AppRouter[Next.js App Router]
    AppRouter -->|Server Actions & API Routes| Services[Domain Services]
    Services --> Prisma[Prisma Client]
    Prisma --> DB[(PostgreSQL Database)]
    AppRouter --> Auth[Authentication Middleware]
    Auth --> SessionStore[Session & API Key Verification]
    Services --> Storage[Media Storage & External Integrations]
```

## Data Model
The Prisma schema defines Users who own projects and join bands, with many-to-many membership handled through the `UserBand` join table. Projects can optionally be associated with a band and collect media assets and galleries. Media items accept user comments, and user sessions plus API keys control authenticated access.

```mermaid
erDiagram
    USER ||--o{ APIKEY : "issues"
    USER ||--o{ SESSION : "creates"
    USER ||--o{ USERBAND : "joins"
    BAND ||--o{ USERBAND : "includes"
    USER ||--o{ PROJECT : "owns"
    BAND ||--o{ PROJECT : "sponsors"
    PROJECT }o--|| BAND : "links_to"
    PROJECT ||--o{ MEDIA : "contains"
    PROJECT ||--o{ GALLERY : "shows"
    MEDIA ||--o{ COMMENT : "collects"
    USER ||--o{ COMMENT : "writes"
```

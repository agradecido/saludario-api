# Saludario API

Backend API for Saludario, a web-based food diary focused on health tracking.

## Architecture Change Log

- **Language Transition**: Backend converted from Node.js/TypeScript (Fastify) to plain PHP 8.3 with strict typing, per explicit request.
- **ORM Transition**: Replaced Prisma with native PHP PDO. Migrations are now handled by Phinx.
- **Dependency Management**: Converted to Composer.

## Stack Overview

- **Language**: PHP 8.3 (`declare(strict_types=1);` enforced)
- **Router**: FastRoute
- **Database**: PostgreSQL (PDO)
- **Migrations**: Phinx
- **Auth**: Native PHP sessions
- **Logging**: Monolog

## Local Development

### Prerequisites

- Docker and Docker Compose
- Composer (if running outside Docker)

### Environment Setup

Create `.env` based on `.env.example` or just set the database URL:

```bash
DATABASE_URL=pgsql:host=db;port=5432;dbname=saludario;user=postgres;password=postgres
```

### Start the Servers

Start the local stack (Postgres + PHP built-in server):

```bash
docker compose up -d --build
```

### Migrations

To apply database migrations:

```bash
docker compose exec api vendor/bin/phinx migrate -c phinx.php
```

### Development Testing

The API responds to requests on `http://localhost:3000/api/v1/`.

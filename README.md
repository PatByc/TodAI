# TodAI

Local productivity tracker built with Next.js App Router, TypeScript, Tailwind, Prisma, and MySQL.

## Setup

1. Copy `.env.example` to `.env`.
2. Update `DATABASE_URL` for your local MySQL database.

For XAMPP's default MySQL user, `.env` can use:

```env
DATABASE_URL="mysql://root:@localhost:3306/todai"
```

If the database does not exist yet, start MySQL in the XAMPP Control Panel, then run:

```bash
C:\xampp\mysql\bin\mysql.exe -u root < database\xampp-init.sql
```

3. Install dependencies:

```bash
npm install
```

4. Create database tables:

```bash
npm run prisma:migrate -- --name init
```

For quick local prototyping without migration files, use:

```bash
npm run prisma:push
```

5. Seed sample data:

```bash
npm run prisma:seed
```

6. Start the app:

```bash
npm run dev
```

## Pages

- `/dashboard`
- `/plans`
- `/history`
- `/goals`
- `/routines`
- `/insights`
- `/settings`

## API Routes

- `GET /api/entries`
- `POST /api/entries`
- `GET /api/entries/:id`
- `PUT /api/entries/:id`
- `DELETE /api/entries/:id`
- `GET /api/categories`
- `POST /api/categories`
- `GET /api/categories/:id`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/goals`
- `POST /api/goals`
- `GET /api/goals/:id`
- `PUT /api/goals/:id`
- `DELETE /api/goals/:id`
- `GET /api/plans`
- `POST /api/plans`
- `GET /api/plans/:id`
- `PUT /api/plans/:id`
- `DELETE /api/plans/:id`
- `GET /api/routines`
- `POST /api/routines`
- `GET /api/routines/:id`
- `PUT /api/routines/:id`
- `DELETE /api/routines/:id`
- `GET /api/timer`
- `POST /api/timer/start`
- `POST /api/timer/stop`
- `GET /api/stats/today`
- `GET /api/stats/week`
- `GET /api/stats/month`

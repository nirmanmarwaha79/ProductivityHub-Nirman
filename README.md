# My Productivity Hub

A personal productivity web app built with Next.js, React, TypeScript and CSS.

## Version 1 features

- Dashboard with task and project metrics
- Task create, edit, delete, status and priority
- Project create, edit, delete and progress
- Monthly calendar with due-date events
- Browser notifications while the app is open
- Reports and task status breakdown
- JSON export and restore

## Important data and privacy behaviour

This starter intentionally does not require login or a database. Tasks and projects are stored in the browser's `localStorage`.

That means:
- Data remains in the browser profile where it was entered.
- Data does not automatically sync to another computer or browser.
- Clearing browser storage can delete the data.
- Use Reports > Export backup regularly.
- A Vercel deployment URL is publicly reachable unless you add deployment protection. Do not put sensitive information into a public deployment.

This is a local-first prototype. Add authentication and a secured database before using it for sensitive or multi-device data.

## Requirements

- Node.js 20.9 or later
- npm

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production build

```bash
npm run build
npm start
```

## Deploy with GitHub and Vercel

1. Create a new GitHub repository named `my-productivity-hub`.
2. In this folder, run:

```bash
git init
git add .
git commit -m "Initial productivity hub"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/my-productivity-hub.git
git push -u origin main
```

3. Sign in to Vercel and import the GitHub repository.
4. Keep the framework preset as Next.js.
5. Deploy. No environment variables are required for this local-storage version.

## Notifications

Browser notifications require permission and are checked while the app is open. They are not guaranteed when the browser or app is closed. Background push notifications require a service worker and server-side scheduling, which are not included in this starter.

## Next development steps

- Add protected access/authentication.
- Add database sync and backup.
- Add recurring tasks and richer calendar views.
- Add background notifications.
- Add AI task assistant in a later version.

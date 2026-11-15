# My Productivity Hub — Project Repository Edition

A personal productivity workspace with tasks, projects, calendar, reminders, reports, and a private cloud document repository for project files.

## What's new in this edition

- **Project Repository** in the left navigation.
- Upload one or multiple documents into a selected project.
- Search documents by filename, filter by project, open/download using short-lived signed links, and delete documents.
- Private Supabase Storage bucket; each browser receives its own Supabase anonymous-auth identity and can only access its own folder.
- App-level storage cap of **1 GiB total** and **50 MB per file**. The Supabase bucket is also configured for 50 MB per object.
- Existing tasks, projects, calendar, reminders, and reports remain unchanged and continue to use browser localStorage.

## Important architecture notes

- Project/task data is still stored in this browser's localStorage. The repository's document bytes are stored in Supabase Storage.
- This version uses Supabase anonymous sign-in to avoid adding a login screen. The anonymous identity/session is browser-specific. Use the same browser profile to access the same repository. Clearing site data can remove the anonymous session and make its private files inaccessible. For cross-device access or account recovery, add email authentication before using it as a long-term document vault.
- The 1 GiB cap is enforced in the client UI. It is suitable for this personal prototype, but it is not a hard server-enforced quota against a modified client. Keep the Supabase project private and do not expose a service-role key in the browser.
- The 1 GiB capacity is an application limit, not a promise that every Supabase plan includes 1 GiB. Check the storage quota and billing limits shown in your Supabase project.
- Documents are private. The app generates a signed download link that expires after 2 minutes.

## 1. Create a Supabase project

1. Create a project at [Supabase](https://supabase.com/).
2. In **Authentication → Sign In / Providers** (or Auth settings), enable **Anonymous Sign-Ins**. The app uses this to create a private browser identity without a login form.
3. Open **Project Settings → API**. Copy the Project URL and the anon/publishable key. Never use the `service_role` key in this app.
4. In **SQL Editor**, run the contents of `supabase/setup.sql`. This creates the private `project-documents` bucket and its access policies.

## 2. Configure local development

Copy `.env.example` to `.env.local`, then replace the placeholders:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000. Select **Repository**, choose a project, and upload documents.

## 3. Configure Vercel

In Vercel → Project → **Settings → Environment Variables**, add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Add them to Production (and Preview/Development if needed), save, then redeploy. These are public client credentials protected by Supabase Row Level Security/storage policies; do not add a service-role secret.

## 4. Deploy updates

If replacing your existing GitHub project, extract this ZIP over a fresh working folder, review the files, then commit and push. Vercel will build from the updated commit. The app uses Next.js 15.5.29 and matching `eslint-config-next`.

```bash
npm install
npm run lint
npm run build
git add .
git commit -m "Add private project document repository"
git push
```

## Supported files

The uploader accepts general file types. Individual uploads are limited to 50 MB. You can upload multiple files as long as the app's total usage remains within 1 GiB. The app stores the file itself in Supabase; the project association is represented by its private storage folder.

## Troubleshooting

- **Storage setup required:** verify both Vercel environment variables and redeploy.
- **Anonymous sign-in disabled:** enable anonymous sign-ins in Supabase Auth settings.
- **Not authorized / RLS error:** run `supabase/setup.sql` and confirm the bucket name is `project-documents`.
- **Upload too large:** reduce the file to 50 MB or less.
- **Documents missing in another browser:** this version uses a browser-specific anonymous account; use the same browser profile, or implement email login for cross-device access.

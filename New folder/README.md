# YBEES Inc. — Employee Portal

A single-page employee portal (login, dashboard, performance grading, employee
management, admin access control) backed by a Google Sheet via Google Apps
Script.

## Structure

```
ybees-portal/
├── index.html            # the entire app (HTML/CSS/JS in one file)
├── apps-script/
│   └── Code.gs            # Google Apps Script backend (deploy separately — not hosted on GitHub Pages)
└── README.md
```

## How it works

- `index.html` is a static, self-contained page — no build step, no server
  required to run it.
- It talks to a Google Sheet through a Google Apps Script Web App, whose
  `/exec` URL is stored in the `API_URL` constant near the top of the
  `<script>` block in `index.html`.
- `apps-script/Code.gs` is the backend that lives in the Apps Script editor
  attached to your Google Sheet — it is **not** served by GitHub Pages, it's
  kept in this repo just so the backend code is version-controlled alongside
  the frontend.

## Deploying the frontend (GitHub Pages)

1. Push this repo to GitHub.
2. Repo Settings → Pages → Source: **Deploy from a branch** → Branch:
   `main` (or your default branch), folder `/ (root)`.
3. GitHub gives you a URL like `https://<username>.github.io/<repo>/` —
   that's your live portal.

Any other static host (Netlify, Vercel, Cloudflare Pages, plain S3, etc.)
works too — it's just a static file.

## Setting up the backend (Google Apps Script)

1. Open the Google Sheet you want to use as the database.
2. Extensions → Apps Script, and paste in the contents of
   `apps-script/Code.gs`.
3. Run `setupFreshDatabase()` once from the function dropdown to create the
   `Employees` and `Performance` sheets and seed sample login accounts.
   (⚠️ this clears those two sheets first — only run it when you actually
   want a clean reset.)
4. Deploy → New deployment → Web app → Execute as **Me** → Who has access
   **Anyone** → Deploy. Copy the `/exec` URL.
5. Paste that URL into `API_URL` in `index.html` (replacing the current
   value), commit, and push.

Sample seeded accounts (all use password `Welcome1`, and are prompted to set
a new password on first login):

| Emp ID | Name | Role |
|---|---|---|
| EMP001 | Dela Cruz, Juan | System Admin |
| EMP002 | Santos, Maria | Admin |
| EMP003 | Reyes, Angela | Employee |
| EMP004 | Tan, Michael | Employee |

## Notes / gotchas

- The Apps Script `/exec` URL in `API_URL` is effectively public (anyone
  with the link can call it). Don't put real secrets in the sheet's
  password column beyond what you're comfortable with in a demo-grade
  auth setup like this one.
- If you already have real employee data in the sheet and are updating the
  backend later, use a migration-safe version of `Code.gs` that only adds
  missing columns instead of wiping the sheet — ask if you need that swapped
  back in.
- Employee photos are uploaded to a Drive folder called
  **"YBEES Employee Photos"** created automatically by the script, and
  shared as "anyone with the link can view" so they can be displayed in the
  portal.

# YBEES Inc. — Employee Portal

A single-page employee portal (login, dashboard, performance grading, employee
management, admin access control) backed by a Google Sheet via Google Apps
Script.

## Files

```
index.html   ← the entire app (HTML/CSS/JS, plus the login-screen team photo, all in one file)
Code.gs      ← Google Apps Script backend — deployed separately in Google, not by GitHub Pages
README.md
.gitignore
```

## Go live on GitHub Pages

1. Push these files to a GitHub repo (root of the repo, no subfolder needed).
2. Repo → Settings → Pages → Source: **Deploy from a branch** → Branch:
   your default branch (e.g. `main`) → Folder: `/ (root)` → Save.
3. GitHub gives you a live URL: `https://<username>.github.io/<repo>/`.

That's it — `index.html` is fully self-contained (styles, script, and the
team photo are all inline), so there's nothing else to configure for the
static site itself.

## Backend (already deployed)

`index.html` already points at a live Apps Script Web App URL (the `API_URL`
constant near the top of the `<script>` block), so the portal will load real
employee data as soon as it's live.

`Code.gs` is included here just so the backend logic is version-controlled
alongside the frontend — it does **not** run on GitHub Pages. It lives in the
Apps Script editor attached to the Google Sheet you're using as the
database. If you ever need to update the backend:

1. Open the Google Sheet → Extensions → Apps Script.
2. Paste in the (possibly updated) contents of `Code.gs`.
3. Deploy → Manage deployments → edit the existing deployment → Version:
   **New version** → Deploy. This keeps the same `/exec` URL that's already
   in `index.html`, so you don't need to touch the frontend.

## Notes

- The Apps Script `/exec` URL in `API_URL` is effectively public (anyone
  with the link can call it) — normal for this kind of setup, but worth
  knowing before you push to a public repo.
- Employee photos uploaded through the portal are saved to a Drive folder
  called **"YBEES Employee Photos"**, shared as "anyone with the link can
  view" so they render inside the app.

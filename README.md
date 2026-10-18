# Kolapps

Static app portfolio for GitHub Pages. All apps have equal prominence. The frontend uses local optimized images, plain HTML/CSS/JavaScript, and a checked-in public store snapshot. No API keys, server, analytics scripts or paid hosting are required.

## Develop

Node.js 22 or newer:

```sh
npm ci
npm run dev
npm run check
```

Preview: http://127.0.0.1:4173. Edit `src/`, not generated `index.html` or `assets/site.*`. `npm run build` produces an allowlisted `dist/` deployment. `data/apps.json` controls app membership, store IDs and country. Testy is always fetched from Türkiye in Turkish. Portföyüm is removed.

## Store data

`npm run sync` fetches Apple public lookup metadata and web screenshots, Apple public RSS review samples, and Google Play public metadata via `google-play-scraper`. Icons, banners and screenshots are downloaded and optimized as WebP. CDN content identities avoid repeated downloads. Prices are excluded from the normalized schema and UI.

Ratings remain separate by platform and country. Missing data is never presented as zero. Google install counts are public ranges; Apple has no public download counts. Reviews are bounded recent samples, not complete history; the UI labels selected five-star reviews and hides samples older than 30 days. Metadata, images and reviews can fail independently: the last successful snapshot is retained, warnings are logged, and a total metadata outage fails the sync without replacing the snapshot. Public endpoints and scraping formats can change; this is not an official analytics integration.

## Publish free on GitHub Pages

1. Push this project to GitHub.
2. Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Run **Refresh stores and deploy portfolio** from Actions, or push to main.

The workflow runs at 03:17 and 15:17 UTC (06:17 and 18:17 Türkiye), refreshes the snapshot, runs checks, commits changed public data/images, and deploys only `dist/`. GitHub scheduled execution can be delayed, and schedules on inactive public repositories may be disabled. Manual dispatch can refresh on demand. Repository rules must allow the workflow bot to commit snapshots; otherwise use a bot PR workflow. No App Store Connect or Play Console credentials are needed.

## Contact form

The page posts directly to FormSubmit over HTTPS; no mail application opens. The default spam CAPTCHA remains enabled. On the first submission, **the owner must confirm the activation email sent to mguvenn96@gmail.com**. Until activation, do not assume delivery. A real submission and inbox delivery have not been tested. The provider displays its confirmation/success page; the website never claims delivery before a response. The form includes a provider privacy link. See https://formsubmit.co/ for service details. The email endpoint is public by design, not a secret. To use another provider, change the form action and CSP form-action together.

## Public repository hygiene

- Only `dist/` is deployed; research archives, source tooling and credential files are excluded.
- `.gitignore` excludes local research, output, dependencies, environment files, signing keys and temporary writes.
- Do not add private credentials, private analytics exports or message submissions. Gitignore cannot protect already tracked files or erase Git history.
- Store text is escaped; runtime scripts/assets are local; a CSP restricts scripts, image sources and form destinations.
- Run `npm audit` and `npm run check` before release. Dependency updates are proposed by Dependabot.
- Public store source URLs, review author names and the contact email are intentionally public data.

Brand PNG: `assets/kolapps-logo.png`.

# Ship

Prepare a release to GitHub Pages (`xgrybvo6508-dot/learning-hub`, Vite base `/learning-hub/`). Stop at the first red step and report it.

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`, then confirm that `dist/` asset URLs, `manifest.webmanifest` (`start_url`/`scope`) and the service worker all use `/learning-hub/`.
5. Secret scan: `bash .cursor/hooks/secret-scan.sh < /dev/null`. It must print `{}`. Also confirm `git ls-files` has no `.env*` file other than `.env.example`.
6. Only if **all** of the above are green, describe the deploy steps. Don't run them unless the user asks:
   - Commit with a clear message on `main`.
   - `git push origin main`. A normal push only: **never** `--force`, `-f`, `--force-with-lease`, or `+refspec`.
   - First-time repo (if needed): `gh repo create xgrybvo6508-dot/learning-hub --public --source . --push`, then enable Pages from Actions: `gh api -X POST repos/xgrybvo6508-dot/learning-hub/pages -f build_type=workflow`.
   - The GitHub Actions workflow (`.github/workflows/deploy.yml`: checkout → `npm ci` → `npm test` → `npm run build` → upload `dist` → deploy-pages) publishes to `https://xgrybvo6508-dot.github.io/learning-hub/`.
   - Watch with `gh run watch` if a deploy was triggered.
   - After deploy: site loads, installs as PWA, works offline after first visit.

Report a short checklist with PASS/FAIL per step.

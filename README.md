# Shoe Desk

A simple admin dashboard for an Instagram-only shoe shop (running, badminton, tennis, casual).
Inventory with sizes, manual orders and reservations, a sales dashboard, Excel/CSV import and
export, and an Instagram "Posts" inbox that turns posts into products.

Stack: Next.js (App Router, server actions) + TypeScript + Tailwind, Postgres (`pg`) in production
and an embedded Postgres (PGlite) when no `DATABASE_URL` is set.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

On first visit you land on `/setup`: choose an admin password and (optionally) load sample data
(26 shoes, ~80 orders, sample Instagram posts). Locally the data is saved in `.data/pglite`.
No Instagram token is needed.

Production:

```bash
DATABASE_URL=postgres://... ADMIN_PASSWORD=... npm run build && npm start
```

`npm run build` applies `migrations/*.sql` to `DATABASE_URL` (skips when unset).
See `.env.example` for all settings.

## How stock works

- **Stock** = pairs physically on hand. **Held** = pairs in `reserved` or `paid` orders. **Available** = stock − held.
- `reserved` / `paid` hold stock. `completed` deducts it. `cancelled` releases it (cancelling a completed sale puts the pair back).
- Orders can't oversell: saving fails if the size doesn't have enough available.
- Low stock = a size with available ≤ the product's low-stock level (default 2). "Sold out" = 0 available.
- "Sales" count orders that are `paid` or `completed`, dated by the paid date (or the date you enter for back-dated sales).
- "This week / month" use `APP_TIMEZONE` (default Asia/Manila), weeks start Monday.

## Connect Instagram

The app reads the Graph API from the server using environment variables (never stored in the DB or sent to the browser).

**Option A: Instagram Login (simplest).** Professional (Business/Creator) account.
1. In developers.facebook.com create an app and add the "Instagram" product (Instagram API with Instagram Login).
2. Add your IG account as an Instagram tester / generate a token with `instagram_business_basic`.
3. Exchange it for a long-lived token (valid ~60 days).
4. Set `IG_ACCESS_TOKEN=<token>`.

**Option B: Facebook Login.** Business account linked to a Facebook Page. Use a long-lived user/page token with
`instagram_basic` and set both `IG_ACCESS_TOKEN` and `IG_USER_ID` (the Instagram business account id).

Restart/redeploy; the Posts page now shows "Connected" and **Sync from Instagram** pulls the latest posts
(image, caption, permalink) into the inbox. Re-syncing never duplicates posts and never resets their status.
Refresh long-lived tokens before expiry: `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<token>`.

Without a token the page runs in **sample mode** ("Load sample posts"), and you can always use
**Add a post by hand** (paste link + caption + upload a photo).

In the inbox, each post can be **Created as a product** (brand, category, name and price are guessed from the
caption), **attached** to an existing product, or dismissed. Instagram image URLs expire, so the post photo is copied
into the product when you create/attach it.

## Import / export

- Export inventory, sales and all orders as `.xlsx` or `.csv` (Data page).
- Import `.csv` or `.xlsx` with columns `category, name` (required) and `brand, size, stock, price, cost`
  (one row per size). Column names like `model`, `qty`, `us size`, `srp`, `capital` also work. You get a preview
  first and can choose to *replace* or *add to* existing stock.

## Layout

```
src/lib/        db, auth, inventory + order stock rules, stats, Instagram client, import/export
src/app/        pages (login/setup, dashboard, stock, products, orders, posts, data, settings), server actions, API routes
migrations/     SQL schema (applied by npm run build / auto-applied locally)
```

`src/lib/migrations.generated.ts` is generated from `migrations/*.sql` (`npm run dev|build` regenerate it).
Only add new migration files; never edit one that has been applied.

## AI agents

Four agents from [agency-agents](https://github.com/msitarzewski/agency-agents) are installed as Cursor rules in `.cursor/rules/`:

| Rule | Use for | Auto-attaches to |
|------|---------|------------------|
| `frontend-developer` | UI, components, Tailwind, accessibility | `src/app/**/*.tsx`, `src/components/**` |
| `backend-architect` | server actions, API routes, DB/migrations | `src/app/actions`, `src/app/api`, `src/lib`, `migrations` |
| `application-security-engineer` | secure code review, auth, secrets, input handling | on demand |
| `code-reviewer` | review of changes before merge | on demand |
| `git-workflow-master` | branching, conventional commits, PR flow | on demand (used by `/ship`) |

Invoke on demand in chat, e.g. `@application-security-engineer review src/app/actions/auth.ts` or
`@code-reviewer review my uncommitted changes`.

### Ship changes (`/ship`)

`/ship` (defined in `.cursor/commands/ship.md`) runs the whole flow in one go: typecheck, safety scan for secrets,
summary, conventional commits on a feature branch, push, and a pull request against `main`. It never pushes to
`main` directly and never force-pushes. Nothing is pushed unless you run `/ship`.

Prerequisites (one time):

The remote uses the `github-sagetech` SSH host alias (key `~/.ssh/id_ed25519_sagetech`, account `sagetech24`),
same as RacketTier. Plain HTTPS fails with 403 because the keychain login is a different GitHub account.

```bash
git remote add origin git@github-sagetech:sagetech24/show-desk.git
git config user.name sagetech24
git config user.email sagetechnology.ai@gmail.com
git push -u origin main
```

Run the first push once so the PR has a base branch. Optionally install the GitHub CLI (`brew install gh`, then
`gh auth login`) so `/ship` can open the PR itself. Without `gh`, `/ship` prints a compare link to open the PR by hand.

To update: `git pull` in a clone of agency-agents, run `./scripts/convert.sh --tool cursor`, then from this
project root run
`./scripts/install.sh --tool cursor --agent frontend-developer,backend-architect,application-security-engineer,code-reviewer`
(re-apply the `globs` in the two `.mdc` files afterwards).

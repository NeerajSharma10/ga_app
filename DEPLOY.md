# Deploying to production

Accounts you'll need (all free to start): GitHub, [Render](https://render.com), your Aiven MySQL service, and [Expo](https://expo.dev) (for building the Android app).

## A. Push the code to GitHub

```bash
cd ~/ga_app
git add .
git commit -m "Initial commit"
```

Create a new **empty** repo on github.com (no README/license), then:

```bash
git remote add origin https://github.com/<your-username>/ga_app.git
git branch -M main
git push -u origin main
```

## B. Get your Aiven production connection string

Aiven console → your MySQL service → **Connection Information** → copy the **Service URI**. It looks like:

```
mysql://avnadmin:PASSWORD@your-service.aivencloud.com:PORT/defaultdb?ssl-mode=REQUIRED
```

Keep this handy — you'll paste it twice (Render, and once locally for setup).

## C. Deploy the API on Render (free tier)

1. Render dashboard → **New** → **Web Service** → connect your GitHub repo
2. Configure it exactly like this (monorepo, so build from the repo root, not `apps/api`):
   - **Root Directory**: leave blank
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run prisma:generate --workspace apps/api && npm run build --workspace apps/api`
     (the explicit `prisma:generate` step matters - in a monorepo, Prisma's usual auto-generate-on-install doesn't reliably find the schema, and `tsc` will fail with "no exported member 'GameType'" etc. without it)
   - **Start Command**: `npm run prisma:deploy --workspace apps/api && npm run start --workspace apps/api`
   - **Instance Type**: Free
3. Add environment variables (Render dashboard → Environment):
   - `DATABASE_URL` → your Aiven Service URI from step B
   - `JWT_SECRET` → generate one locally: `openssl rand -hex 32`, paste the output
   - (leave `PORT` alone — Render sets this automatically and the app already reads it)
4. Deploy. First build takes a few minutes. Note the public URL Render gives you, e.g. `https://ga-app-api.onrender.com` — this also runs `prisma migrate deploy` on every start, so your schema stays in sync automatically on future deploys.

**Free tier tradeoff**: it sleeps after 15 minutes of no traffic and takes ~30-50s to wake on the next request. Fine for a staff tool used during business hours.

## D. Seed production data and create your real login

Run these **from your own machine**, pointed at the Aiven database (not the free Render shell — this is simpler and doesn't depend on your Render plan):

```bash
cd apps/api
DATABASE_URL="<paste your Aiven Service URI>" npm run seed:catalog
DATABASE_URL="<paste your Aiven Service URI>" npm run create-admin
```

- `seed:catalog` loads the game types/pricing/stations (safe, no fake accounts)
- `create-admin` interactively asks for **your own** name, mobile number, and a real password, and creates your actual Super Admin login — this replaces the dev-only `admin123` accounts, which must never be used in production

If this hangs or times out, check Aiven console → your service → whether IP-based connection filtering is on, and allow your current IP (or temporarily allow all, then lock it down later).

## E. Point the mobile app at production

```bash
cd apps/mobile
echo 'EXPO_PUBLIC_API_URL=https://ga-app-api.onrender.com' > .env
```

(use your actual Render URL from step C)

## F. Build the Android APK

```bash
npm install -g eas-cli
cd apps/mobile
eas login          # creates/logs into your free Expo account
eas build:configure
```

When prompted, make sure the build profile produces an **APK** (not AAB) for direct install — `eas build:configure` will ask; pick internal distribution. Then:

```bash
eas build --platform android --profile preview
```

This builds in Expo's cloud (~10-15 min) and prints a download link for a `.apk` file when done.

## G. Install on staff phones

- Open the `.apk` link from each phone's browser (or share the file via WhatsApp/Drive), tap to install
- Android will ask to allow installing from that source once — allow it
- Open the app, log in with the real account from step D

## H. Making future changes

- **API changes**: `git push` to `main` → Render redeploys automatically, including any new migrations.
- **Mobile app changes**: rebuild with `eas build --platform android --profile preview` again and redistribute the new APK link.

## Production hygiene checklist

- [ ] `JWT_SECRET` on Render is a fresh random value, not the local dev one
- [ ] Logged in with your real `create-admin` account, not `admin123`
- [ ] Aiven connection uses `ssl-mode=REQUIRED` (already in the Service URI)
- [ ] `.env` files are gitignored (already set up) — never commit real secrets

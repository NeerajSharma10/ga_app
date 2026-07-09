# Deploying to production

Accounts you'll need (all free to start): GitHub, a [Google Cloud](https://console.cloud.google.com) project with billing enabled (Cloud Run's free tier needs a billing account on file even though it won't charge you at this scale), your Aiven MySQL service, and [Expo](https://expo.dev) (for building the Android app).

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

## C. Deploy the API on Google Cloud Run

Cloud Run's free tier (2M requests/month) comfortably covers this app's traffic, and cold starts are much faster than Render's (~1-3s vs ~30-50s). Easiest via **Google Cloud Shell** (console.cloud.google.com → the `>_` icon, top right) — it has `gcloud` and `docker` preinstalled and already logged in, so nothing to install locally. Clone your repo there first: `git clone https://github.com/<you>/ga_app.git && cd ga_app`.

```bash
# One-time setup
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
gcloud artifacts repositories create ga-app --repository-format=docker --location=us-central1
gcloud auth configure-docker us-central1-docker.pkg.dev
```

```bash
# Build and deploy (run from the repo root - the Dockerfile needs the whole
# monorepo as build context, since apps/api depends on packages/shared-types)
docker build -f apps/api/Dockerfile -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/ga-app/api:latest .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/ga-app/api:latest

gcloud run deploy ga-app-api \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/ga-app/api:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="<your Aiven Service URI>",JWT_SECRET="<output of: openssl rand -hex 32>"
```

This prints your service URL when done, e.g. `https://ga-app-api-xxxxx.us-central1.run.app`.

**Important**: the container does **not** run migrations automatically on startup - see "Applying schema changes" below for why, and run that step whenever you change `schema.prisma`.

**Future updates**: rerun the `docker build` / `docker push` / `gcloud run deploy` three commands above — there's no git-push auto-deploy like Render had, since Cloud Run doesn't watch your repo directly. (A Cloud Build trigger can add that later if it becomes annoying — ask if you want it set up.)

### Applying schema changes

Cloud Run scales to zero when idle, so every cold start boots a fresh container. If that boot required a successful database connection (e.g. to check for pending migrations), a single transient DNS/network blip from the database provider would take down the **entire service** - including endpoints that never touch the database - until a cold start happened to land when the database was reachable again. So migrations are a deliberate, separate, manual step instead of part of every startup:

```bash
DATABASE_URL="<your Aiven Service URI>" npm run prisma:deploy --workspace apps/api
```

Run this once after `gcloud run deploy`, and again any time you change `schema.prisma` and redeploy - not on every deploy.

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
echo 'EXPO_PUBLIC_API_URL=https://ga-app-api-xxxxx.us-central1.run.app' > .env
```

(use your actual Cloud Run URL from step C)

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

- **API changes**: rerun the `docker build` / `docker push` / `gcloud run deploy` sequence from step C.
- **Mobile app changes**: rebuild with `eas build --platform android --profile preview` again and redistribute the new APK link.

## Production hygiene checklist

- [ ] `JWT_SECRET` on Cloud Run is a fresh random value, not the local dev one
- [ ] Logged in with your real `create-admin` account, not `admin123`
- [ ] Aiven connection uses `ssl-mode=REQUIRED` (already in the Service URI)
- [ ] `.env` files are gitignored (already set up) — never commit real secrets

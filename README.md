# Gamer's Academy App

Monorepo: `apps/api` (Node/Fastify/Prisma), `apps/mobile` (Expo/React Native), `packages/shared-types`.

## 1. Backend setup

```
cd apps/api
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — from your Aiven MySQL service (Aiven console → Service overview → connection string). Aiven requires SSL; `?sslaccept=strict` in the example usually works since Aiven's CA is publicly trusted.
- `JWT_SECRET` — any long random string.

Then:
```
npm install
npm run prisma:migrate --workspace apps/api   # creates tables on Aiven
npm run seed --workspace apps/api             # loads game types/prices/stations + 2 test logins
npm run api:dev                               # starts the API on :4000
```

Default logins after seeding (password for both: `admin123`):
- `9999999999` — Super Admin (Owner)
- `8888888888` — Admin (Floor Staff)

## 2. Mobile app setup

The app needs your machine's LAN IP (not `localhost`) to reach the API from a phone/emulator on the same wifi:

```
cd apps/mobile
echo 'EXPO_PUBLIC_API_URL=http://<your-lan-ip>:4000' > .env
npm run mobile:start
```

Scan the QR code with Expo Go (Android/iOS) or press `a`/`i` for an emulator.

## What's seeded

Game types match the current printed menu: PS5, PS4, PS3, Pool, Foosball, Board Games, Coin Games — with their real prices, and one station per type (2x for PS3).

## Notes for testing

- Customers are identified by 10-digit Indian mobile number only.
- Custom-duration pricing prorates off the largest defined price tier per game type; staff can always override the final price on a session.
- PDF receipts are generated server-side and shared from the History screen.

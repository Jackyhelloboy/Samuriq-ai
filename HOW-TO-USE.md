# Samuriq AI v10: how to use it (plain language)

## What changed in this version
- Text is larger everywhere (small 8 to 11 px labels raised to 13 px or more), with bigger buttons and fields on phones.
- Workspace progress bar now shows: hours reported vs target, an orange "today" marker between start and deadline, days left, and the hours needed per day to finish on time. It turns red when a person is behind pace.
- A red "Today's update is missing" notice shows until the person sends the day's update.
- A "How this works" box on the workspace explains the five steps to participants.

## Your daily routine (about 5 minutes)
1. Admin > Overview: approve people who have messaged you on Telegram (tick "community verified" after you check).
2. Admin > Team & targets: see who reported today and who did not. Message the missing ones.
3. Admin > Proof & reports: check evidence, enter the client's approved minutes.
4. Admin > Team & targets: download the CSV and send it to the client.
5. Admin > Payments: prepare payouts from approved minutes only.

## Client link protection
The client website address is never printed on the page. People click "Open client workspace"; the server checks that they are approved, community verified and (for pair projects) confirmed, then redirects them. Anyone not approved gets an error. A person who is approved can still see the address in their browser once the client site opens, and can share it. Only the client's own login or invite code can stop that.

## Not automatic yet (be aware)
- Telegram verification is manual. No bot is connected, so the site cannot message people or check who joined the group.
- Missed daily updates are flagged on screen but nobody is automatically blocked or messaged.
- Payments are prepared manually. No Cashfree or other payout API is connected.
- Hosting uses Sign in with ChatGPT. Replacing it with email or phone sign-up for the public needs further work.

## Run it
Node 22.13 or newer: `npm ci`, then `npm run build`. See START-HERE.md for database and settings.

## Telegram bot (new in this version)
What it does: when someone messages your bot from the same Telegram username they registered with, the site links their chat and marks their applications community-verified. Daily, it can message everyone who has not reported today.

Setup (one time, about 10 minutes):
1. In Telegram, talk to @BotFather, send /newbot, copy the bot token.
2. In your hosting settings add three secrets: BOT_TOKEN (the token), TELEGRAM_WEBHOOK_SECRET (any long random string), REMIND_SECRET (another long random string).
3. Run the database file drizzle/0005_telegram_links.sql (same way as the earlier files in drizzle/).
4. Tell Telegram where to send messages (replace the capitals):
   https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=https://YOUR-SITE/api/telegram&secret_token=YOUR_WEBHOOK_SECRET
5. Put your bot's link (t.me/yourbotname) on the registration page and in your WhatsApp auto-reply: "After registering, message our bot."

Daily reminders:
- Manual: Admin > Team & targets > "Send Telegram reminders to everyone missing today".
- Automatic: use any free scheduler (for example cron-job.org) to send a POST to https://YOUR-SITE/admin/remind at 9 pm India time with the header Authorization: Bearer YOUR_REMIND_SECRET.
- People who never messaged the bot cannot be reminded. The result shows how many were not linked.

Honest limits: it uses the Telegram username written on the registration form; a wrong username means no match. It cannot add or remove people from your Telegram groups.

## Integrations on hold (add keys later, nothing breaks meanwhile)
Open Admin > Integrations > "Service status" to see each service as CONNECTED or ON HOLD, with the exact setting names to add when you are ready:
- BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET: Telegram auto-verify
- REMIND_SECRET: automatic daily reminders
- BANK_ENCRYPTION_KEY: needed before people save bank details (64 hex characters)
- CASHFREE_CLIENT_ID, CASHFREE_CLIENT_SECRET: reserved names only. No Cashfree code exists yet, so adding them does nothing until a payout connection is built.
- DISCORD_BOT_TOKEN, WHATSAPP_TOKEN: reserved names only, no code yet.
While on hold, do it by hand: tick community verified, use the Send reminders button, prepare payouts from the Payments page.

## New in v13: automatic online/paused, per-project users, videos
- Run database file drizzle/0006_project_videos.sql (adds three video fields).
- Project state is automatic from the dates in Admin > Projects: before the start date = STARTS SOON, from start date to deadline (India time, end of day) = ONLINE, after the deadline = PAUSED / OFFLINE. When paused, new applications, daily updates and "Open client workspace" are refused. To restart a project, set a new start date and deadline.
- Admin > Project roster: pick a project to see everyone registered for it, their status, Telegram handle, whether they reported today (MISSING in the list), days reported and minutes.
- Videos: in Admin > Projects > edit, paste an Introduction link, a Registration link and a Tutorial link. YouTube, Google Drive (shared as "anyone with the link") and Vimeo links play inside the project page. Any other link shows an "Open video" button. People see them on the project page and the workspace links to it.

## New in v14: accounts, auto-pause, tests
- Sign-in: people can now create an account with email and password on /login (no ChatGPT needed). ChatGPT sign-in still works where hosted that way. Emails are NOT verified until an email service is connected, so approval and Telegram verification stay your real gate. To create the owner account, set ADMIN_EMAIL and ADMIN_SETUP_CODE (any long secret), then register with that email and the setup code. Run drizzle/0007_accounts.sql.
- Auto-block: after 2 full days without a daily update, "Open client workspace" is refused and the person sees "Access paused". Submitting a new update restores access automatically. Change the limit with MISS_LIMIT in app/project-state.ts. Admin > Project roster shows who is paused.
- Tests: after `npm run build`, run `python3 scripts/test-vendor.py` and `python3 scripts/test-v13.py` (local server with sample data; checks sign-up/sign-in, wrong passwords, owner-email protection, paused projects, missed-update blocking, restore, videos, admin pages).
- Desktop admin: sticky sidebar, wider layout, zebra tables with hover, three-column integration cards.


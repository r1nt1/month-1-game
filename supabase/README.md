# Accounts and leaderboard

The game uses Supabase Auth for Google sign-in and Postgres for player records.
`players` has only `player_id`, `display_name`, and `best_score`. Emails stay in
Supabase Auth. Names are permanent and unique without regard to letter case.
The public leaderboard exposes five names and scores, ordered by score and then
alphabetically for ties. Guest runs are not saved.

## Database

`migrations/202609150001_players.sql` is already applied to the month-1-game
Supabase project. Run it once when setting up a fresh database. The tests in
`tests/players.sql` run inside a transaction and roll back their temporary users.
They passed against the project on September 15, 2026.

Direct score/name writes are denied. The database functions derive the player ID
from the signed-in session. Scores can only increase. This protects ownership;
it does not prevent a technically skilled player from submitting an invented score.
The browser calls score submission only when a game ends, for the player signed
in when that run started. Failed saves are reported and are not queued.

## Google setup

The Google Cloud project `month-1-game` and web client `Blocks web` are configured,
and Google is enabled in Supabase. Local Google sign-in, profile creation, score
saving, and leaderboard display have been observed with the `rinti` account.
No billing or trial was enabled.

Production configuration is prepared for `https://month-1-game.vercel.app`:
- Google allows that JavaScript origin and the local `http://127.0.0.1:5181` origin.
- Supabase's Site URL is `https://month-1-game.vercel.app/`.
- Supabase allows `https://month-1-game.vercel.app/?auth=google` and
  `http://127.0.0.1:5181/?auth=google` as exact redirects.
- Vercel Production has `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and
  `VITE_GOOGLE_AUTH_READY=true`. No Google secret is stored in the frontend.

Google remains in Testing status. Basic identity-only sign-in is exempt from the
Google test-user allowlist restriction, according to
https://developers.google.com/identity/protocols/oauth2/production-readiness/overview.
The observed login request uses only email and profile. Verify public sign-in with
another account and on a phone after deployment. The new game has not been pushed
or deployed yet; these environment values apply to the next production build.

For a fresh setup, create a Google Cloud project and a Web application OAuth client (the credentials
that identify this game to Google). Use only basic identity scopes: openid, email,
and profile. Configure this Supabase callback in Google's authorized redirect URIs:

`https://urfjdqvcoxvdckpaldcn.supabase.co/auth/v1/callback`

Put the Google client ID and secret in Supabase's Google provider settings, never
in frontend code. Add each game return URL to Supabase's redirect allow list:
`http://127.0.0.1:5181/?auth=google`, `http://localhost:5181/?auth=google`, and the
exact deployed Vercel game URL with `/?auth=google` when deployment is approved.
A phone needs its reachable LAN or deployed URL explicitly allowed too.
If additional Google permissions are introduced later, reassess testing and verification requirements.

Local configuration in `.env.local`:

```dotenv
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_GOOGLE_AUTH_READY=false
```

Only change the last value to `true` after Google and Supabase are configured.
Never put a secret or service-role key into a VITE variable: those values are
included in the browser. Set the same public values in Vercel when deployment is
approved. Email delivery is not used by this sign-in flow.

Before release, test Google sign-in and cancellation, choosing a permanent name,
a duplicate name, sign-out, score saving, and the top-five list with real accounts.
Local sign-in and saved scores were verified. Public-domain sign-in remains an
after-deployment check.
Build/type/lint/audit checks and database tests do not replace those tests.

The UI has loading, empty, and failure states. Game input is ignored while an
account or leaderboard dialog is open. Supabase keeps the authentication session
in browser storage; player scores are stored in the database.

To undo the feature, revert its Git commits. The database is separate: reverting
code does not remove accounts or scores. Do not drop the table to undo UI work.

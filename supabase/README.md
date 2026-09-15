# Accounts and leaderboard

The game uses Supabase Auth for email sign-in and Postgres for player records.
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

## Email setup still required

The dashboard currently requires custom SMTP (an email delivery service) to edit
the default sign-in-link template. Configure a sender, then change the relevant
sign-in/confirmation email templates to display `{{ .Token }}` as a code instead
of a confirmation link. Verify both a new account and a returning account.

Local configuration in `.env.local`:

```dotenv
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_EMAIL_CODES_READY=false
```

Only change the last value to `true` after email templates and delivery are ready.
The app deliberately blocks code requests until then. Never put a secret or
service-role key into a VITE variable: those values are included in the browser.
Set the same public values in Vercel when deployment is approved.

Before release, test code delivery, invalid/expired codes, a duplicate name,
sign-out, score saving, and the top-five list with real accounts. Live email tests
have not yet been performed. Build/type/lint/audit checks and transactional
database checks do not replace those tests.

The UI has loading, empty, and failure states. Game input is ignored while an
account or leaderboard dialog is open. Supabase keeps the authentication session
in browser storage; player scores are stored in the database.

To undo the feature, revert its Git commits. The database is separate: reverting
code does not remove accounts or scores. Do not drop the table to undo UI work.

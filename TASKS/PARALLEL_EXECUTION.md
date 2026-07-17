# Parallel wave execution — runbook

How to actually execute a wave from `TASKS/TODO.md` that has multiple
parallel tracks, using git worktrees + background subagents. This is exactly
what was used for Wave 1 (Track A + Track B) — follow the same procedure for
every subsequent wave.

## Prerequisites

- Docker running: `docker ps`. If not, `systemctl --user start docker-desktop`
  (Docker Desktop on this machine), then wait a few seconds.
- The `lawgenie-postgres` container running (`docker start lawgenie-postgres`
  if it shows as exited) — this is the one Postgres instance every track's DB
  gets cloned from.
- Both repos (`lawgenie-be`, `lawgenie-frontend`) on a clean `master`. Check
  `git status` in both; if there's real uncommitted work, commit or stash it
  first — worktrees only inherit *committed* state.

## Step 1 — identify the wave's tracks

Read the wave's section in `TASKS/TODO.md`. Each `### Track X` heading is one
parallel unit. Note which task IDs belong to which track, and whether a track
is a **continuation** of an earlier wave's track (same letter, e.g. Track B
in Wave 1 continues into Wave 2 — same branch, not a new one).

## Step 2 — create worktree pairs (one per track, per repo)

For a **new** track letter `X`:
```bash
git -C /home/anas/Documents/Code/lawgenie-be worktree add \
  /home/anas/Documents/Code/lawgenie-be-track-X -b track/X
git -C /home/anas/Documents/Code/lawgenie-frontend worktree add \
  /home/anas/Documents/Code/lawgenie-frontend-track-X -b track/X
```

For a **continuing** track (its branch already exists and was merged into
`master` at the end of the previous wave — so it has nothing unique left):
fast-forward the branch to current `master` first, then worktree it:
```bash
git -C /home/anas/Documents/Code/lawgenie-be branch -f track/X master
git -C /home/anas/Documents/Code/lawgenie-be worktree add \
  /home/anas/Documents/Code/lawgenie-be-track-X track/X
# same for the frontend repo
```

## Step 3 — install deps

```bash
cd lawgenie-be-track-X && npm install --legacy-peer-deps
cd lawgenie-frontend-track-X && npm install
```

## Step 4 — isolated DB + ports per track

Assign each track in the wave a distinct backend port (3001, 3002, 3003...)
and frontend port (5176, 5177, 5178... — avoid 5173-5175, used by manually-
run instances) so they can all run concurrently without colliding.

Clone the dev DB per track:
```bash
# only needed if CREATE DATABASE ... TEMPLATE complains about active connections:
docker exec -i lawgenie-postgres psql -U lawgenie -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='lawgenie' AND pid <> pg_backend_pid();"

docker exec -i lawgenie-postgres psql -U lawgenie -d postgres \
  -c "CREATE DATABASE lawgenie_track_X TEMPLATE lawgenie;"
```

Then write each worktree's `.env`:
- Backend: copy `lawgenie-be/.env`, override `PORT` and `DATABASE_URL` to
  point at `lawgenie_track_X`.
- Frontend: `VITE_API_URL=http://localhost:<that track's backend port>`.

## Step 5 — dispatch one background subagent per track

Use the `Agent` tool, one call per track, **all in a single message** so they
run concurrently, `run_in_background: true`. Each prompt must be fully
self-contained — a subagent starts with zero memory of any prior
conversation. Include:

- What LawGenie is, one line, plus what's already built (check `TASKS/TODO.md`
  for what's checked off).
- The exact task IDs it owns, quoted in full — not just "do track C".
- Its two worktree paths, and an explicit instruction to never touch the main
  checkouts (`lawgenie-be`/`lawgenie-frontend` directly) — other agents may be
  working in sibling worktrees at the same time.
- Its backend port/DB and frontend port, and that it should actually run both
  dev servers to verify its work (curl the endpoints with real JWTs, drive
  the frontend with a real browser check) — not just write code that looks
  right.
- The current "Locked decisions" block from `TASKS/TODO.md`, copied verbatim.
- Which existing files are the closest precedent to follow (name specific
  route/service/validator files, not just "follow conventions").
- Instruction to check off its boxes in `TASKS/TODO.md` and commit as each
  task finishes, and to stop — not merge, not touch `master`, not start
  another track's or wave's tasks — once its own list is done.

## Step 6 — wait, then review, then merge

Don't poll for progress — a notification arrives when each subagent finishes,
with its own summary. Once **all** tracks in the wave are done:

1. Report each track's summary to the user.
2. Wait for explicit go-ahead — the user may review the worktrees themselves
   or ask for specific things to be run/curled first.
3. Only then: merge each track branch into `master`, one at a time, in both
   repos. `TASKS/TODO.md` should auto-merge cleanly (different lines checked
   off). `prisma/schema.prisma` may need a manual conflict resolution if two
   tracks both touched the same model — usually just combining two added
   back-relation lines (see Wave 1's merge commit for the exact pattern).
4. After all merges: `npx prisma migrate deploy` + `npx prisma generate` in
   the real `lawgenie-be` checkout against the real `lawgenie` DB (not a
   track clone), then boot the backend once to confirm it starts cleanly.
5. Tell the user it's ready for them to run and review manually. Do not run
   the servers for them unless asked.

## Step 7 — cleanup (only when told to)

```bash
git worktree remove lawgenie-be-track-X
git worktree remove lawgenie-frontend-track-X
git branch -d track/X   # in both repos, only after it's actually merged
docker exec -i lawgenie-postgres psql -U lawgenie -d postgres \
  -c "DROP DATABASE lawgenie_track_X;"
```

# Production Schedules

## Dream Cycle Task Extraction

Dream Cycle task extraction runs outside the CLI sync request. Sync stores sessions
and intent messages, then queues `semantic_task_extraction_jobs`. A server-side
schedule calls the cron endpoint to process queued jobs in small batches.

After deploying code that includes `POST /api/cron/dream-cycle`, configure the
production schedule:

1. Set `CRON_SECRET` in the production app environment.
2. Set the same `CRON_SECRET` value in InsForge secrets.
3. Create the schedule:

```bash
npx @insforge/cli schedules create \
  --name "Dream Cycle Task Extraction" \
  --cron "*/5 * * * *" \
  --url "https://www.trydevpulse.com/api/cron/dream-cycle?limit=10" \
  --method POST \
  --headers '{"Authorization":"Bearer ${{secrets.CRON_SECRET}}"}'
```

The endpoint processes at most 10 pending jobs per run. Failed jobs remain
`failed`; they are not retried automatically unless the source intent material
changes and sync enqueues a fresh job for the session.

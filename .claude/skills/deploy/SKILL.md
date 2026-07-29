---
name: deploy
description: Deploy applications to Vercel. Use when the user says "deploy", "deploy to Vercel", "push to production", "deploy my app", or "go live".
---

# Deploy to Vercel

## Safety guard (added locally)

`vercel --prod` is a live, hard-to-reverse action on a shared system. Regardless
of how the trigger phrase is worded ("deploy", "go live", "push to production",
etc.), never run `vercel --prod` (or bootstrap a new Vercel project/login)
without first getting explicit, in-the-moment confirmation from the user for
*that specific deploy*. A `vercel` preview deploy is lower risk but still
touches an external service — confirm the target/project before running it
too if no Vercel project is currently configured in the repo.

## Prerequisites Check

```bash
vercel --version
vercel whoami
```

If not installed: `npm install -g vercel`
If not logged in: `vercel login`

## Deployment

**Production:**
```bash
vercel --prod
```

**Preview:**
```bash
vercel
```

## After Deployment

- Display the deployment URL
- Show build status
- Mention `vercel logs <url>` for debugging if needed


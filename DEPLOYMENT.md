# Deployment Guide

## Free Hosting Architecture

The platform is designed to be hosted for free using the following stack:
- **Frontend:** Vercel, Netlify, or Cloudflare Pages.
- **Backend & Database:** Supabase Free Tier.

## Steps

1. **Database:**
   - Create a project on Supabase.
   - Run the SQL scripts found in `supabase/migrations/` and `supabase/seed/` in the Supabase SQL Editor.
   
2. **Frontend:**
   - Connect your GitHub repository to Vercel/Cloudflare Pages.
   - Set the root directory to `apps/web`.
   - Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
   - The build command is `npm run build` and output directory is `dist`.

3. **PWA:**
   - Ensure the site is served over HTTPS to enable PWA installation and service workers.

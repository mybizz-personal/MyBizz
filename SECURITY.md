# Security Guidelines

## Multi-Tenant Isolation
- The core of our security model is PostgreSQL Row Level Security (RLS).
- Business Owners must never have access to data with a `business_id` not belonging to them.
- All APIs and backend requests validate the user's role and business association before fetching or mutating data.

## Passwords
- All passwords are encrypted safely by Supabase Auth (or similar auth provider). No plain text passwords are ever stored.

## Reporting Vulnerabilities
If you discover a vulnerability, do not open a public issue. Please responsibly disclose it by contacting the Platform Administrators.

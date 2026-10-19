# Database Architecture

The database is powered by PostgreSQL. 

## Multi-Tenancy

We use a shared-schema multi-tenant architecture where almost every table has a `business_id` column.
Tenant isolation is enforced via Row Level Security (RLS) policies.

## Core Tables

- `platform_users`: Global users across the platform.
- `businesses`: All tenants/businesses.
- `business_users`: Mapping of users to businesses and roles (Platform Admin, Business Owner).
- `products`: Product catalog for each business.
- `inventory`: Real-time stock levels across different `inventory_locations`.
- `sales`: Transaction records.

Check `supabase/migrations/0000_initial_schema.sql` for the complete schema design.

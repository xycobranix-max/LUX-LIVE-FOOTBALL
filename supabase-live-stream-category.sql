-- LUX LIVE FOOTBALL: separate LIVE TV and LIVE FOOTBALL streams
-- Run this once in Supabase SQL Editor before deploying the updated app.

alter table public.live_streams
    add column if not exists category text;

-- Existing streams stay in the football category unless you reclassify them.
update public.live_streams
set category = 'live_football'
where category is null or btrim(category) = '';

alter table public.live_streams
    alter column category set default 'live_football';

alter table public.live_streams
    alter column category set not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'live_streams_category_check'
          and conrelid = 'public.live_streams'::regclass
    ) then
        alter table public.live_streams
            add constraint live_streams_category_check
            check (category in ('live_tv', 'live_football'));
    end if;
end $$;

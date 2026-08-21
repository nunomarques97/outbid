-- handle_new_user() (see *_rpc_functions.sql) already fires for every new
-- auth.users row regardless of provider, so a profiles row was always being
-- created for Google sign-ins too -- that part was never broken. What was
-- wrong: it only ever checked raw_user_meta_data->>'display_name', which is
-- a key our own email/password sign-up form sets explicitly, but Google's
-- OAuth metadata never contains -- Google populates 'full_name'/'name'
-- instead. Every Google user's profile was silently falling all the way
-- through to the email-prefix fallback instead of their real name.
--
-- CREATE OR REPLACE on the same function/trigger names -- no new table, no
-- column change, safe to layer on regardless of whether the previous
-- version of this function has been applied to a given environment yet.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

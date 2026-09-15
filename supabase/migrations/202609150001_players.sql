begin;

create table public.players (
  player_id uuid primary key references auth.users(id),
  display_name text not null check (display_name = btrim(display_name) and display_name <> ''),
  best_score integer not null default 0 check (best_score >= 0)
);
create unique index players_unique_name on public.players (lower(display_name));
alter table public.players enable row level security;
revoke all on public.players from anon, authenticated;
grant select on public.players to authenticated;
create policy "Players can read their own profile" on public.players for select to authenticated
  using ((select auth.uid()) = player_id);

create function public.register_player(chosen_name text) returns public.players
language plpgsql security definer set search_path = '' as $$
declare result public.players;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into public.players(player_id, display_name)
    values (auth.uid(), btrim(chosen_name)) returning * into result;
  return result;
end;
$$;

create function public.submit_score(run_score integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare result integer;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if run_score is null or run_score < 0 then raise exception 'Invalid score'; end if;
  update public.players set best_score = greatest(best_score, run_score)
    where player_id = auth.uid() returning best_score into result;
  if not found then raise exception 'Choose a display name first'; end if;
  return result;
end;
$$;

create function public.top_players() returns table(display_name text, best_score integer)
language sql stable security definer set search_path = '' as $$
  select p.display_name, p.best_score from public.players p
    order by p.best_score desc, lower(p.display_name) asc limit 5;
$$;

revoke all on function public.register_player(text) from public, anon, authenticated;
revoke all on function public.submit_score(integer) from public, anon, authenticated;
revoke all on function public.top_players() from public, anon, authenticated;
grant execute on function public.register_player(text) to authenticated;
grant execute on function public.submit_score(integer) to authenticated;
grant execute on function public.top_players() to anon, authenticated;
commit;

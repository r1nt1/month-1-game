-- Temporary test users and scores are rolled back, leaving no test data.
begin;
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); result integer;
begin
  insert into auth.users(id) values (a),(b);
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform public.register_player('CurriculumTestAlpha');
  select public.submit_score(10) into result;
  if result <> 10 then raise exception 'First score failed'; end if;
  select public.submit_score(3) into result;
  if result <> 10 then raise exception 'Best score decreased'; end if;
  begin
    perform public.register_player('ChangedName');
    raise exception 'Name changed unexpectedly';
  exception when unique_violation then null; end;
  perform set_config('request.jwt.claim.sub', b::text, true);
  begin
    perform public.register_player('curriculumtestalpha');
    raise exception 'Case-insensitive uniqueness failed';
  exception when unique_violation then null; end;
  perform public.register_player('CurriculumTestBeta');
  perform public.submit_score(20);
  if (select best_score from public.players where player_id = a) <> 10 then
    raise exception 'Another player score changed'; end if;
  if has_table_privilege('authenticated','public.players','UPDATE') then raise exception 'Direct update allowed'; end if;
  if has_table_privilege('anon','public.players','SELECT') then raise exception 'Guest raw access allowed'; end if;
  if has_function_privilege('anon','public.submit_score(integer)','EXECUTE') then raise exception 'Guest score write allowed'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.players'::regclass) then raise exception 'RLS disabled'; end if;
  if (select count(*) from public.top_players()) > 5 then raise exception 'More than five players'; end if;
  raise notice 'PASS: scores, ownership, permanent names, uniqueness, and access grants';
end;
$$;
rollback;

-- =====================================================================
-- SMART LIBRARY SYSTEM - security setup
-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- This script does NOT create, drop or alter any table or column.
-- It only adds: Row Level Security policies, helper functions (RPC),
-- one default settings row (if empty) and Realtime publication entries.
-- It is safe to run more than once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helper: is the logged-in user an admin?
--    An admin = a Supabase Auth user whose email exists in public.admins
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------
-- 2. Row Level Security
-- ---------------------------------------------------------------------
alter table public.admins            enable row level security;
alter table public.students          enable row level security;
alter table public.books             enable row level security;
alter table public.book_copies       enable row level security;
alter table public.borrowings        enable row level security;
alter table public.fines             enable row level security;
alter table public.library_activity  enable row level security;
alter table public.library_settings  enable row level security;

-- admins: a logged-in admin can read only their own row (used at login)
drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- admin-only tables
drop policy if exists students_admin_all on public.students;
create policy students_admin_all on public.students
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists borrowings_admin_all on public.borrowings;
create policy borrowings_admin_all on public.borrowings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists fines_admin_all on public.fines;
create policy fines_admin_all on public.fines
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists activity_admin_all on public.library_activity;
create policy activity_admin_all on public.library_activity
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- catalogue + settings: everyone may read (the kiosk searches books),
-- only admins may change
drop policy if exists books_read on public.books;
create policy books_read on public.books
  for select to anon, authenticated using (true);
drop policy if exists books_admin_write on public.books;
create policy books_admin_write on public.books
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists copies_read on public.book_copies;
create policy copies_read on public.book_copies
  for select to anon, authenticated using (true);
drop policy if exists copies_admin_write on public.book_copies;
create policy copies_admin_write on public.book_copies
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_read on public.library_settings;
create policy settings_read on public.library_settings
  for select to anon, authenticated using (true);
drop policy if exists settings_admin_write on public.library_settings;
create policy settings_admin_write on public.library_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. Default settings row (only if the table is empty).
--    Values come from the column defaults of library_settings.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.library_settings) then
    insert into public.library_settings default values;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. Kiosk functions (called by the React kiosk with the anon key).
--    The students table is NOT readable by anon users. The kiosk can
--    only do these specific, controlled actions, identified by RFID UID.
-- ---------------------------------------------------------------------

-- Who owns this card?
create or replace function public.kiosk_identify(p_rfid text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare s public.students;
begin
  select * into s from public.students where rfid_uid = trim(p_rfid);
  if not found then
    return null;
  end if;
  return json_build_object(
    'id', s.id,
    'student_id', s.student_id,
    'name', s.name,
    'faculty', s.faculty
  );
end;
$$;

-- Current library settings (loan period, fine rate, reminder, max fine)
create or replace function public.kiosk_settings()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select row_to_json(s) from (
    select loan_period_days, fine_per_day, reminder_days_before, maximum_fine
    from public.library_settings order by id limit 1
  ) s;
$$;

-- The student's borrowings (current + history)
create or replace function public.kiosk_my_borrowings(p_rfid text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(r order by r.borrowed_at desc), '[]'::json)
  from (
    select b.id, b.borrowed_at, b.due_date, b.returned_at, b.status,
           c.book_code, bk.title, bk.author
    from public.borrowings b
    join public.students s    on s.id  = b.student_id
    join public.book_copies c on c.id  = b.book_copy_id
    join public.books bk      on bk.id = c.book_id
    where s.rfid_uid = trim(p_rfid)
  ) r;
$$;

-- The student's fines
create or replace function public.kiosk_my_fines(p_rfid text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(r order by r.created_at desc), '[]'::json)
  from (
    select f.id, f.amount, f.fine_status, f.created_at, f.paid_at,
           c.book_code, bk.title
    from public.fines f
    join public.students s    on s.id  = f.student_id
    join public.borrowings b  on b.id  = f.borrowing_id
    join public.book_copies c on c.id  = b.book_copy_id
    join public.books bk      on bk.id = c.book_id
    where s.rfid_uid = trim(p_rfid)
  ) r;
$$;

-- The student's activity log
create or replace function public.kiosk_my_activity(p_rfid text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(r order by r."timestamp" desc), '[]'::json)
  from (
    select a.id, a.action, a."timestamp", a.device_id,
           c.book_code, bk.title
    from public.library_activity a
    join public.students s         on s.id  = a.student_id
    left join public.book_copies c on c.id  = a.book_copy_id
    left join public.books bk      on bk.id = c.book_id
    where s.rfid_uid = trim(p_rfid)
    order by a."timestamp" desc
    limit 100
  ) r;
$$;

-- Borrow a book copy (all checks + writes happen atomically)
create or replace function public.kiosk_borrow(
  p_rfid text,
  p_book_code text,
  p_device_id text default 'KIOSK'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  s   public.students;
  c   public.book_copies;
  st  public.library_settings;
  v_title text;
  v_unpaid numeric;
  v_now timestamptz := now();
  v_due timestamptz;
begin
  -- 1. who is the student?
  select * into s from public.students where rfid_uid = trim(p_rfid);
  if not found then
    return json_build_object('ok', false, 'code', 'STUDENT_NOT_FOUND',
      'message', 'Student not found. Please contact the library administrator.');
  end if;

  -- 2. does the book copy exist? (row is locked until we finish)
  select * into c from public.book_copies where book_code = trim(p_book_code) for update;
  if not found then
    return json_build_object('ok', false, 'code', 'BOOK_NOT_FOUND',
      'message', 'Book code not found.');
  end if;

  -- 3. is it available?
  if c.status <> 'AVAILABLE' then
    return json_build_object('ok', false, 'code', 'BOOK_UNAVAILABLE',
      'message', 'This book copy is currently borrowed.');
  end if;

  -- 4. unpaid fines?
  if exists (select 1 from public.fines
             where student_id = s.id and fine_status = 'UNPAID') then
    select coalesce(sum(amount), 0) into v_unpaid
    from public.fines where student_id = s.id and fine_status = 'UNPAID';
    return json_build_object('ok', false, 'code', 'UNPAID_FINE',
      'message', 'Borrowing blocked because you have an unpaid fine.',
      'fine_amount', v_unpaid);
  end if;

  -- 5. settings -> due date
  select * into st from public.library_settings order by id limit 1;
  if not found then
    return json_build_object('ok', false, 'code', 'SETTINGS_MISSING',
      'message', 'Library settings are not configured. Please contact the library administrator.');
  end if;
  v_due := v_now + make_interval(days => st.loan_period_days);

  -- 6. write everything
  insert into public.borrowings (student_id, book_copy_id, borrowed_at, due_date, status)
  values (s.id, c.id, v_now, v_due, 'BORROWED');

  update public.book_copies set status = 'BORROWED' where id = c.id;

  insert into public.library_activity (student_id, book_copy_id, action, device_id)
  values (s.id, c.id, 'BORROW', coalesce(nullif(trim(p_device_id), ''), 'KIOSK'));

  select title into v_title from public.books where id = c.book_id;

  return json_build_object('ok', true,
    'title', v_title,
    'book_code', c.book_code,
    'borrowed_at', v_now,
    'due_date', v_due);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Admin function: process a return (+ overdue fine)
-- ---------------------------------------------------------------------
create or replace function public.admin_return_book(p_borrowing_id bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.borrowings;
  st public.library_settings;
  v_now timestamptz := now();
  v_late_days int := 0;
  v_fine numeric := 0;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into b from public.borrowings where id = p_borrowing_id for update;
  if not found then
    return json_build_object('ok', false, 'message', 'Borrowing record not found.');
  end if;
  if b.status <> 'BORROWED' then
    return json_build_object('ok', false, 'message', 'This book has already been returned.');
  end if;

  select * into st from public.library_settings order by id limit 1;
  if not found then
    raise exception 'Library settings are missing';
  end if;

  update public.borrowings
     set returned_at = v_now, status = 'RETURNED'
   where id = b.id;

  update public.book_copies set status = 'AVAILABLE' where id = b.book_copy_id;

  insert into public.library_activity (student_id, book_copy_id, action, device_id)
  values (b.student_id, b.book_copy_id, 'RETURN', 'ADMIN');

  -- overdue fine: every started late day counts, capped at maximum_fine
  if v_now > b.due_date then
    v_late_days := ceil(extract(epoch from (v_now - b.due_date)) / 86400.0)::int;
    v_fine := least(v_late_days * st.fine_per_day, st.maximum_fine);
    if v_fine > 0 then
      insert into public.fines (borrowing_id, student_id, amount, fine_status)
      values (b.id, b.student_id, v_fine, 'UNPAID');
    end if;
  end if;

  return json_build_object('ok', true, 'late_days', v_late_days, 'fine_amount', v_fine);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Who may call which function
-- ---------------------------------------------------------------------
revoke all on function public.kiosk_identify(text)              from public;
revoke all on function public.kiosk_settings()                  from public;
revoke all on function public.kiosk_my_borrowings(text)         from public;
revoke all on function public.kiosk_my_fines(text)              from public;
revoke all on function public.kiosk_my_activity(text)           from public;
revoke all on function public.kiosk_borrow(text, text, text)    from public;
revoke all on function public.admin_return_book(bigint)         from public;

grant execute on function public.is_admin()                      to anon, authenticated;
grant execute on function public.kiosk_identify(text)            to anon, authenticated;
grant execute on function public.kiosk_settings()                to anon, authenticated;
grant execute on function public.kiosk_my_borrowings(text)       to anon, authenticated;
grant execute on function public.kiosk_my_fines(text)            to anon, authenticated;
grant execute on function public.kiosk_my_activity(text)         to anon, authenticated;
grant execute on function public.kiosk_borrow(text, text, text)  to anon, authenticated;
grant execute on function public.admin_return_book(bigint)       to authenticated;

-- ---------------------------------------------------------------------
-- 7. Realtime: broadcast changes of these tables
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['library_activity', 'borrowings', 'book_copies', 'fines']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null; -- already added
    end;
  end loop;
end $$;

-- Training groups: assign each existing account to its group.
-- Run this in the Supabase SQL Editor. Safe to re-run (idempotent).
--
-- This mirrors TEAM_BY_EMAIL in lib/data.ts, which is what assigns the group
-- when a NEW account is created. Keep the two in sync — this file only exists
-- to backfill accounts that were created before groups were set up.
--
-- Accounts whose email is not listed keep whatever group they already have
-- (so an admin's manual fix is never clobbered). Not listed because we don't
-- know their emails yet: Pakulis (Group 3), Frye and Kelly (Group 4).
--
-- Note: team_id is display/standings only — it does NOT affect anyone's points.

update public.profiles p
set team_id = v.team_id
from (values
  -- ── Group 1 ──
  ('lsmith88@stanford.edu', 'group-1'),   -- Smith
  ('code@stanford.edu',     'group-1'),   -- Jack Griffin
  ('elliott5@stanford.edu', 'group-1'),   -- Donovan-Davies
  ('pwolfens@stanford.edu', 'group-1'),   -- Wolfensberger
  ('bcelli@stanford.edu',   'group-1'),   -- Celli
  ('florgen@stanford.edu',  'group-1'),   -- Lorgen
  ('raph21@stanford.edu',   'group-1'),   -- Skottowe
  ('ferdirfh@stanford.edu', 'group-1'),   -- F. Hainlein
  ('jpiersma@stanford.edu', 'group-1'),   -- Piersma

  -- ── Group 2 ──
  ('sandrosc@stanford.edu', 'group-2'),   -- Scalfi
  ('mericson@stanford.edu', 'group-2'),   -- Ericson
  ('hainlein@stanford.edu', 'group-2'),   -- L. Hainlein
  ('marcus06@stanford.edu', 'group-2'),   -- Albrecht
  ('abfreijo@stanford.edu', 'group-2'),   -- Freijo
  ('tmurphy6@stanford.edu', 'group-2'),   -- Murphy
  ('dannys29@stanford.edu', 'group-2'),   -- Stephenson
  ('mtm1@stanford.edu',     'group-2'),   -- Madigan
  ('dompucc@stanford.edu',  'group-2'),   -- Puccinelli

  -- ── Group 3 ──
  ('jsalvi05@stanford.edu', 'group-3'),   -- Salvi
  ('hylton@stanford.edu',   'group-3'),   -- Harvey
  ('ggeorge8@stanford.edu', 'group-3'),   -- George
  ('orio@stanford.edu',     'group-3'),   -- Orio
  ('braun11@stanford.edu',  'group-3'),   -- Endicott
  ('cmuehl@stanford.edu',   'group-3'),   -- Muehl
  ('auth@stanford.edu',     'group-3'),   -- Auth
  ('zorbalzr@stanford.edu', 'group-3'),   -- Tubidis

  -- ── Group 4 ──
  ('tcorbett@stanford.edu', 'group-4'),   -- Corbett
  ('calber05@stanford.edu', 'group-4'),   -- Berwick
  ('herzogt@stanford.edu',  'group-4'),   -- Herzog
  ('cvac05@stanford.edu',   'group-4'),   -- Vachris
  ('amodio@stanford.edu',   'group-4'),   -- Hanna-Amodio
  ('thebig0z@stanford.edu', 'group-4'),   -- Routley
  ('gzpetrow@stanford.edu', 'group-4'),   -- Petrow

  -- ── Coxswains ──
  ('joskoo@stanford.edu',   'coxswains'), -- Koo
  ('kjalford@stanford.edu', 'coxswains'), -- Alford
  ('zammit@stanford.edu',   'coxswains'), -- Zammit
  ('vbern@stanford.edu',    'coxswains')  -- Bernstein
) as v(email, team_id)
where lower(p.email) = v.email
  and p.team_id is distinct from v.team_id;

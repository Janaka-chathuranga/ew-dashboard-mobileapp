-- Kanban board: persist a column's order after a drag.
-- Given the destination status and the full ordered list of issue ids now in
-- that column, set each issue's status + board_rank (zero-padded index).
-- One atomic call per drop. SECURITY INVOKER so issues_update RLS applies
-- (project members can move issues).

create or replace function public.reorder_column(payload jsonb)
returns void
language plpgsql
as $$
declare
  v_status_id uuid := (payload->>'status_id')::uuid;
  v_ids jsonb := payload->'issue_ids';
  v_id uuid;
  i int;
begin
  for i in 0 .. jsonb_array_length(v_ids) - 1 loop
    v_id := (v_ids->>i)::uuid;
    update public.issues
      set status_id = v_status_id,
          board_rank = lpad(i::text, 6, '0')
      where id = v_id;
  end loop;
end;
$$;

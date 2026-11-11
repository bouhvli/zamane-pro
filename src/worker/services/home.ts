import { sql } from "drizzle-orm";
import { toSafeMinor } from "../../shared/money.ts";
import type { HomeResponse } from "../../shared/schemas/home.ts";
import { db, type DbContext } from "../db/client.ts";

/**
 * GET /api/home (§5): one SQL statement built from CTEs. Every part filters on the caller's space.
 * Derived values are computed here, never stored (§4.3).
 */
export async function getHome(c: DbContext, spaceId: string): Promise<HomeResponse> {
  const res = await db(c).execute<{ home: Record<string, unknown> }>(sql`
    with
    s as (select id, currency, timezone, invite_code from spaces where id = ${spaceId}),
    g as (
      select g.id, g.kind, g.title, g.target_amount, g.completed_at, g.created_at,
        case when g.kind = 'money'
          then (select coalesce(sum(e.amount), 0) from goal_entries e where e.goal_id = g.id and e.space_id = g.space_id)
          else coalesce((select e.percent from goal_entries e where e.goal_id = g.id and e.space_id = g.space_id
                         order by e.created_at desc, e.id desc limit 1), 0)
        end as progress,
        (select json_build_object('userId', e.created_by, 'amount', e.amount, 'percent', e.percent, 'note', e.note,
                                  'at', e.created_at)
           from goal_entries e where e.goal_id = g.id and e.space_id = g.space_id
           order by e.created_at desc, e.id desc limit 1) as last
      from goals g where g.space_id = ${spaceId}
    ),
    m as (
      select sm.user_id, u.display_name, sm.slot from space_members sm join "user" u on u.id = sm.user_id
      where sm.space_id = ${spaceId}
    )
    select json_build_object(
      'currency', (select currency from s),
      'total', (select coalesce(sum(e.amount), 0) from goal_entries e
                join goals gg on gg.id = e.goal_id and gg.space_id = e.space_id
                where e.space_id = ${spaceId} and gg.kind = 'money'),
      'goals', coalesce((select json_agg(json_build_object(
                  'id', id, 'kind', kind, 'title', title, 'progress', progress, 'target', target_amount,
                  'completedAt', completed_at, 'last', last) order by created_at) from g), '[]'::json),
      'trips', coalesce((select json_agg(json_build_object('id', id, 'title', title, 'destination', destination,
                  'startDate', start_date, 'endDate', end_date) order by start_date)
                from (select * from trips t where t.space_id = ${spaceId} and t.start_date is not null
                        and t.end_date >= ((now() at time zone (select timezone from s))::date - 1)
                      order by t.start_date limit 5) t), '[]'::json),
      'shoppingLeft', (select count(*) from shopping_items where space_id = ${spaceId} and bought_at is null),
      'members', coalesce((select json_agg(json_build_object('userId', user_id, 'displayName', display_name,
                  'slot', slot) order by slot) from m), '[]'::json),
      'inviteCode', case when (select count(*) from m) = 1 then (select invite_code from s) end
    ) as home`);
  const h = res.rows[0]!.home as Record<string, unknown> & {
    goals: Array<Record<string, unknown> & { last: Record<string, unknown> | null }>;
  };
  // json_build_object turns bigints into JSON numbers; check they're safe and normalise the shapes.
  return {
    currency: String(h.currency).trim(),
    total: toSafeMinor(h.total as number),
    goals: h.goals.map((g) => ({
      id: String(g.id),
      kind: g.kind as "money" | "general",
      title: String(g.title),
      progress: toSafeMinor(g.progress as number),
      target: g.target == null ? null : toSafeMinor(g.target as number),
      completedAt: (g.completedAt as string | null) ?? null,
      last: g.last
        ? {
            userId: String(g.last.userId),
            amount: g.last.amount == null ? null : toSafeMinor(g.last.amount as number),
            percent: (g.last.percent as number | null) ?? null,
            note: (g.last.note as string | null) ?? null,
            at: String(g.last.at),
          }
        : null,
    })),
    trips: (h.trips as HomeResponse["trips"]) ?? [],
    shoppingLeft: Number(h.shoppingLeft),
    members: (h.members as HomeResponse["members"]) ?? [],
    inviteCode: (h.inviteCode as string | null) ?? null,
  };
}

/**
 * Turns a line of the table list (tables.ts) into the database condition "this row is the household's".
 * The copy and the deletion both ask here, so they always mean the same rows.
 * No database connection is used in this file: it only builds the condition.
 */
import { and, eq, getTableColumns, inArray, or, sql, type SQL } from "drizzle-orm";
import { getTableConfig, type PgColumn, type PgTable } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import { ruleFor, TABLE_NAMES, type TableName } from "./tables";

/**
 * Whose rows are meant.
 * A whole household: its id, every profile in it, every grown-up who signs in to it and their email addresses.
 * One profile: `accountId` is null and `profileIds` holds that one profile. Tables that belong to the household as a
 * whole (screens, invites, the grown-ups) then match nothing and are left alone.
 */
export interface Scope {
  accountId: string | null;
  profileIds: readonly string[];
  personIds: readonly string[];
  emails: readonly string[];
}

export const tableOf = (name: TableName) => schema[name] as PgTable;
export const columnsOf = (name: TableName) => getTableColumns(tableOf(name)) as Record<string, PgColumn>;

/** "column is one of the ids of the owned rows of that table". */
function inOwned(column: PgColumn, table: TableName, scope: Scope): SQL | null {
  const inner = ownedWhere(table, scope);
  return inner ? sql`${column} in (select ${columnsOf(table).id} from ${tableOf(table)} where ${inner})` : null;
}

/** The condition that picks the scope's rows of one table. Null when the table has none in this scope. */
export function ownedWhere(name: TableName, scope: Scope): SQL | null {
  const o = ruleFor(name).owner;
  if (!o) return null;
  const cols = columnsOf(name), any: SQL[] = [];
  if (o.self && scope.accountId) any.push(eq(cols.id, scope.accountId));
  if (scope.accountId) for (const c of o.account ?? []) any.push(eq(cols[c], scope.accountId));
  if (scope.profileIds.length) for (const c of o.profile ?? []) any.push(inArray(cols[c], [...scope.profileIds]));
  if (scope.personIds.length) for (const c of o.person ?? []) any.push(inArray(cols[c], [...scope.personIds]));
  if (o.parent) {
    const hit = inOwned(cols[o.parent.column], o.parent.table, scope);
    if (hit) any.push(hit);
  }
  if (o.ref) {
    for (const [kind, table] of Object.entries(o.ref.to)) {
      const hit = inOwned(cols[o.ref.column], table, scope);
      if (hit) any.push(and(eq(cols[o.ref.kind], kind), hit)!);
    }
  }
  if (o.email && scope.emails.length) any.push(inArray(sql`lower(${cols[o.email]})`, scope.emails.map((e) => e.toLowerCase())));
  return any.length === 0 ? null : any.length === 1 ? any[0] : or(...any)!;
}

const nameByTable = new Map<PgTable, TableName>(TABLE_NAMES.map((n) => [tableOf(n), n]));

export interface ForeignKey { column: string; to: TableName; onDelete: string | undefined }

/** The foreign keys of a table as the schema declares them, by column name. */
export function foreignKeys(name: TableName): ForeignKey[] {
  const cols = Object.entries(columnsOf(name));
  return getTableConfig(tableOf(name)).foreignKeys.map((fk) => {
    const ref = fk.reference();
    return { column: cols.find(([, c]) => c === ref.columns[0])![0], to: nameByTable.get(ref.foreignTable as PgTable)!, onDelete: fk.onDelete };
  });
}

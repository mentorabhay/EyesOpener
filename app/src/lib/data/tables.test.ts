import { describe, expect, it } from "vitest";
import { is } from "drizzle-orm";
import { PgDialect, PgTable } from "drizzle-orm/pg-core";
import { data as copy } from "@/copy/data";
import * as schema from "@/db/schema";
import { DESCRIBED } from "./export";
import { columnsOf, foreignKeys, ownedWhere } from "./owned";
import { ERASE_ORDER, PARTS, ruleFor, TABLE_NAMES, tableOfPart, type Owner, type TableName } from "./tables";

const inSchema = Object.entries(schema).filter(([, v]) => is(v, PgTable)).map(([k]) => k).sort();
const ownerOf = (n: TableName): Owner => ruleFor(n).owner ?? {};
/** The columns that make a row the household's, and so decide whether it is removed. */
const ownerColumns = (n: TableName) => { const o = ownerOf(n); return [...(o.account ?? []), ...(o.profile ?? []), ...(o.person ?? []), ...(o.parent ? [o.parent.column] : [])] as string[]; };
/** A deletion removes rows of this table. */
const removed = (n: TableName) => { const e = ruleFor(n).erase; return e === "rows" || e === "people"; };
/** The tables whose rows a table's `owner` reads. */
const reads = (n: TableName): TableName[] => {
  const o = ownerOf(n), out: TableName[] = [];
  if (o.account?.length) out.push("account");
  if (o.profile?.length && n !== "profile") out.push("profile");
  if (o.parent) out.push(o.parent.table);
  if (o.ref) out.push(...Object.values(o.ref.to));
  return out;
};

describe("the table list covers the whole schema", () => {
  it("has a line for every table, and no line for a table that does not exist", () => {
    expect([...TABLE_NAMES].sort()).toEqual(inSchema);
  });

  it("gives every line a decision for the copy and for deletion, with a reason whenever rows are left out or left alone", () => {
    for (const name of TABLE_NAMES) {
      const rule = ruleFor(name);
      expect(rule.holds.length, name).toBeGreaterThan(10);
      if ("leftOut" in rule.copy) expect(rule.copy.leftOut.length, `${name}: why it is left out of the copy`).toBeGreaterThan(15);
      if (typeof rule.erase === "object") expect(rule.erase.untouched.length, `${name}: why a deletion leaves it alone`).toBeGreaterThan(15);
    }
  });

  it("never leaves a household's rows out of a deletion: a table with an owner is removed or unlinked, a table without one is not", () => {
    for (const name of TABLE_NAMES) {
      const rule = ruleFor(name), owned = !!rule.owner;
      if (owned) expect(["rows", "unlink", "people"], `${name} has an owner`).toContain(rule.erase);
      else expect(typeof rule.erase === "object" || rule.erase === "scrub", `${name} has no owner`).toBe(true);
    }
  });

  it("puts every table that has an owner into the copy, or says why not", () => {
    for (const name of TABLE_NAMES) {
      const rule = ruleFor(name);
      if (!rule.owner) expect("leftOut" in rule.copy, `${name} has no owner, so it cannot be in a household's copy`).toBe(true);
    }
    /* The one owned table kept out: pooled numbers that mix several families. */
    expect(TABLE_NAMES.filter((n) => ruleFor(n).owner && "leftOut" in ruleFor(n).copy)).toEqual(["experimentSignal"]);
  });

  it("maps each part of the file to exactly one table, and has words for each part", () => {
    const used = TABLE_NAMES.flatMap((n) => { const c = ruleFor(n).copy; return "part" in c ? [c.part] : []; });
    expect([...used].sort()).toEqual([...PARTS].sort());
    expect(new Set(used).size).toBe(used.length);
    for (const part of PARTS) {
      expect(ruleFor(tableOfPart(part)).copy).toMatchObject({ part });
      expect(copy.file.parts[part].what.length, part).toBeGreaterThan(20);
    }
  });

  it("explains only columns that exist, and hides only columns that exist", () => {
    for (const part of PARTS) {
      const name = tableOfPart(part), cols = Object.keys(columnsOf(name)), c = ruleFor(name).copy;
      for (const unit of Object.keys((copy.file.parts[part] as { units?: Record<string, string> }).units ?? {})) expect(cols, `${part}: unit for ${unit}`).toContain(unit);
      for (const hidden of Object.keys(("part" in c && c.hide) || {})) expect(cols, `${name}: hides ${hidden}`).toContain(hidden);
    }
  });

  it("keeps secrets out of the copy: every column that holds a scrambled PIN is hidden", () => {
    for (const name of TABLE_NAMES) {
      const c = ruleFor(name).copy;
      if (!("part" in c)) continue;
      for (const column of Object.keys(columnsOf(name)).filter((k) => /hash|secret|password/i.test(k))) expect(Object.keys(c.hide ?? {}), `${name}.${column}`).toContain(column);
    }
  });
});

describe("every foreign key that points at something a deletion removes has a decision", () => {
  it("is either what makes the row the household's, or is listed with what becomes of it", () => {
    for (const name of TABLE_NAMES) {
      const rule = ruleFor(name), mine = ownerColumns(name), links = (rule.links ?? {}) as Record<string, { fate: string; why: string }>;
      const pointing = foreignKeys(name).filter((fk) => removed(fk.to));
      for (const fk of pointing) {
        if (mine.includes(fk.column)) continue;
        const link = links[fk.column];
        expect(link, `${name}.${fk.column} points at ${fk.to}, which a deletion removes. Give it a line in tables.ts`).toBeDefined();
        expect(link.why.length, `${name}.${fk.column}`).toBeGreaterThan(20);
        /* What the list says must be what the database does. */
        expect(link.fate === "cleared" ? "set null" : "cascade", `${name}.${fk.column} is listed as ${link.fate}`).toBe(fk.onDelete);
      }
      for (const column of Object.keys(links)) {
        expect(pointing.some((fk) => fk.column === column) && !mine.includes(column), `${name}.${column} is listed but is not such a key`).toBe(true);
      }
    }
  });

  it("points each owner column at the table it claims", () => {
    for (const name of TABLE_NAMES) {
      const o = ownerOf(name), fks = foreignKeys(name), to = (column: string) => fks.find((fk) => fk.column === column)?.to;
      for (const c of o.account ?? []) expect(to(c), `${name}.${c}`).toBe("account");
      for (const c of o.profile ?? []) expect(name === "profile" && c === "id" ? "profile" : to(c), `${name}.${c}`).toBe("profile");
      for (const c of o.person ?? []) expect(to(c), `${name}.${c}`).toBe("appUser");
      if (o.parent) expect(to(o.parent.column), `${name}.${o.parent.column}`).toBe(o.parent.table);
      if (o.ref) for (const target of Object.values(o.ref.to)) expect(columnsOf(target).id, `${name} points into ${target}`).toBeDefined();
    }
  });

  it("only unlinks a row through a key the database would also empty", () => {
    for (const name of TABLE_NAMES.filter((n) => ruleFor(n).erase === "unlink")) {
      const o = ownerOf(name);
      expect(Object.keys(o), name).toEqual(["profile"]);
      for (const c of o.profile ?? []) expect(foreignKeys(name).find((fk) => fk.column === c)?.onDelete, `${name}.${c}`).toBe("set null");
    }
  });

  it("can put into words every shared thing a family's row points at", () => {
    for (const part of PARTS) {
      for (const fk of foreignKeys(tableOfPart(part))) {
        if (fk.to === "appUser" || fk.to === "profile" || ruleFor(fk.to).owner) continue;
        expect(DESCRIBED, `${tableOfPart(part)}.${fk.column} points at ${fk.to}: add it to SHARED in export.ts`).toContain(fk.to);
      }
    }
  });
});

describe("the order rows are removed in", () => {
  it("names every table whose rows are removed, once", () => {
    expect([...ERASE_ORDER].sort()).toEqual(TABLE_NAMES.filter((n) => ruleFor(n).erase === "rows").sort());
    expect(new Set(ERASE_ORDER).size).toBe(ERASE_ORDER.length);
  });

  it("removes a table before every table its owner reads, and the household last", () => {
    for (const name of ERASE_ORDER) {
      for (const needs of reads(name)) {
        if (!ERASE_ORDER.includes(needs)) continue;
        expect(ERASE_ORDER.indexOf(name), `${name} must be removed before ${needs}`).toBeLessThan(ERASE_ORDER.indexOf(needs));
      }
    }
    expect(ERASE_ORDER.at(-1)).toBe("account");
    expect(ERASE_ORDER.at(-2)).toBe("profile");
  });
});

describe("which rows are a household's", () => {
  const dialect = new PgDialect({ casing: "snake_case" });
  const text = (name: TableName, scope: Parameters<typeof ownedWhere>[1]) => {
    const w = ownedWhere(name, scope);
    if (!w) return null;
    const { sql, params } = dialect.sqlToQuery(w);
    return { sql, params };
  };
  const home = { accountId: "A", profileIds: ["P1", "P2"], personIds: ["U1"], emails: ["Parent@Example.test"] };
  const one = { accountId: null, profileIds: ["P1"], personIds: [], emails: [] };

  it("matches the household by its id, its profiles, its grown-ups and their email", () => {
    expect(text("account", home)).toEqual({ sql: '"account"."id" = $1', params: ["A"] });
    expect(text("session", home)?.sql).toBe('"session"."profile_id" in ($1, $2)');
    expect(text("fusionMail", home)?.sql).toBe('("fusion_mail"."from_profile_id" in ($1, $2) or "fusion_mail"."to_profile_id" in ($3, $4) or "fusion_mail"."from_user_id" in ($5))');
    expect(text("enquiry", home)).toEqual({ sql: 'lower("enquiry"."email") in ($1)', params: ["parent@example.test"] });
  });

  it("follows a row to the row it hangs off, and a loose pointer to the table its kind names", () => {
    expect(text("counsellorNote", home)?.sql).toBe('"counsellor_note"."link_id" in (select "counsellor_link"."id" from "counsellor_link" where "counsellor_link"."profile_id" in ($1, $2))');
    const review = text("moderationItem", home)!;
    expect(review.sql).toContain('"moderation_item"."kind" = $1 and "moderation_item"."ref_id" in (select "story"."id" from "story"');
    expect(review.params.filter((p) => typeof p === "string" && ["story", "protocol", "note", "mail"].includes(p))).toEqual(["story", "protocol", "note", "mail"]);
  });

  it("matches nothing in a table with no owner, and nothing at all when the scope is empty", () => {
    for (const name of TABLE_NAMES.filter((n) => !ruleFor(n).owner)) expect(text(name, home), name).toBeNull();
    for (const name of TABLE_NAMES) expect(text(name, { accountId: null, profileIds: [], personIds: [], emails: [] }), name).toBeNull();
  });

  it("leaves the household's own things alone when only one profile is meant", () => {
    for (const name of ["account", "appUser", "device", "invite", "pushToken", "sponsorGroupMember", "dataRequest", "enquiry"] as const) expect(text(name, one), name).toBeNull();
    expect(text("profile", one)).toEqual({ sql: '"profile"."id" in ($1)', params: ["P1"] });
    expect(text("consent", one)?.sql).toBe('"consent"."profile_id" in ($1)');
  });
});

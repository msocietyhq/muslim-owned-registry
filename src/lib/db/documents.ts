import { randomUUID } from "crypto";
import { type SqlLike, type TxSql, sqlClient } from "./client";

type Filter = { field: string; op: "=="; value: unknown };
type Order = { field: string; dir: "asc" | "desc" };

export const FieldValue = {
  increment(amount = 1) {
    return { __increment: amount };
  },
  serverTimestamp() {
    return { __serverTimestamp: true };
  },
};

function isIncrement(value: unknown): value is { __increment: number } {
  return Boolean(value && typeof value === "object" && "__increment" in value);
}

function isServerTimestamp(value: unknown): value is { __serverTimestamp: true } {
  return Boolean(value && typeof value === "object" && "__serverTimestamp" in value);
}

function jsonPath(field: string) {
  const parts = field.split(".");
  return parts.map((part) => `'${part.replace(/'/g, "''")}'`).join(",");
}

function applyWrites(current: Record<string, unknown>, patch: Record<string, unknown>, merge: boolean) {
  const base = merge ? { ...current } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (isIncrement(value)) {
      const prev = typeof base[key] === "number" ? (base[key] as number) : 0;
      base[key] = prev + value.__increment;
    } else if (isServerTimestamp(value)) {
      base[key] = new Date().toISOString();
    } else {
      base[key] = value;
    }
  }
  return base;
}

export class DocumentSnapshot {
  constructor(
    public readonly id: string,
    private readonly payload: Record<string, unknown> | null,
    public readonly ref: DocumentReference,
  ) {}

  get exists() {
    return this.payload !== null;
  }

  data() {
    return this.payload ? { ...this.payload } : undefined;
  }

  get(field: string) {
    return this.payload?.[field];
  }
}

export class QuerySnapshot {
  constructor(public readonly docs: DocumentSnapshot[]) {}

  get empty() {
    return this.docs.length === 0;
  }
}

export class DocumentReference {
  constructor(
    public readonly collectionName: string,
    public readonly id: string,
    private readonly tx?: TxSql,
  ) {}

  collection(sub: string) {
    return new CollectionReference(`${this.collectionName}/${this.id}/${sub}`, this.tx);
  }

  async get() {
    const sql = this.tx || (await sqlClient());
    const rows = await sql.unsafe(
      "SELECT data FROM documents WHERE collection = $1 AND id = $2",
      [this.collectionName, this.id],
    );
    const data = rows[0]?.data as Record<string, unknown> | undefined;
    return new DocumentSnapshot(this.id, data ?? null, this);
  }

  async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
    const sql = this.tx || (await sqlClient());
    const existing = await this.get();
    const next = applyWrites(existing.data() || {}, data, Boolean(options?.merge));
    await sql.unsafe(
      `INSERT INTO documents (collection, id, data)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (collection, id)
       DO UPDATE SET data = EXCLUDED.data`,
      [this.collectionName, this.id, JSON.stringify(next)],
    );
  }

  async delete() {
    const sql = this.tx || (await sqlClient());
    await sql.unsafe("DELETE FROM documents WHERE collection = $1 AND id = $2", [
      this.collectionName,
      this.id,
    ]);
  }
}

export class Query {
  constructor(
    protected readonly collectionName: string,
    private readonly filters: Filter[] = [],
    private readonly order?: Order,
    private readonly limitCount?: number,
    protected readonly tx?: TxSql,
  ) {}

  where(field: string, op: "==", value: unknown) {
    return new Query(
      this.collectionName,
      [...this.filters, { field, op, value }],
      this.order,
      this.limitCount,
      this.tx,
    );
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc") {
    return new Query(this.collectionName, this.filters, { field, dir }, this.limitCount, this.tx);
  }

  limit(count: number) {
    return new Query(this.collectionName, this.filters, this.order, count, this.tx);
  }

  async get() {
    const sql = this.tx || (await sqlClient());
    const params: unknown[] = [this.collectionName];
    let query = "SELECT id, data FROM documents WHERE collection = $1";
    for (const filter of this.filters) {
      params.push(typeof filter.value === "string" ? filter.value : JSON.stringify(filter.value));
      const idx = params.length;
      if (typeof filter.value === "string" || typeof filter.value === "number" || typeof filter.value === "boolean") {
        query += ` AND data #>> ARRAY[${jsonPath(filter.field)}] = $${idx}::text`;
        if (typeof filter.value !== "string") {
          params[idx - 1] = String(filter.value);
        }
      } else {
        query += ` AND data #> ARRAY[${jsonPath(filter.field)}] = $${idx}::jsonb`;
      }
    }
    if (this.order) {
      query += ` ORDER BY data #>> ARRAY[${jsonPath(this.order.field)}] ${this.order.dir === "desc" ? "DESC" : "ASC"}`;
    }
    if (this.limitCount) {
      params.push(this.limitCount);
      query += ` LIMIT $${params.length}`;
    }
    const rows = await sql.unsafe(query, params);
    return new QuerySnapshot(
      rows.map(
        (row) =>
          new DocumentSnapshot(
            String(row.id),
            (row.data as Record<string, unknown>) || {},
            new DocumentReference(this.collectionName, String(row.id), this.tx),
          ),
      ),
    );
  }
}

export class CollectionReference extends Query {
  constructor(collectionName: string, tx?: TxSql) {
    super(collectionName, [], undefined, undefined, tx);
  }

  doc(id?: string) {
    return new DocumentReference(this.collectionName, id || randomUUID(), this.tx);
  }

  async add(data: Record<string, unknown>) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

type TransactionStore = {
  get(ref: DocumentReference): Promise<DocumentSnapshot>;
  set(ref: DocumentReference, data: Record<string, unknown>, options?: { merge?: boolean }): void;
  create(ref: DocumentReference, data: Record<string, unknown>): void;
};

export class FirestoreStore {
  collection(name: string) {
    return new CollectionReference(name);
  }

  doc(path: string) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length < 2) {
      throw new Error(`Invalid document path: ${path}`);
    }
    const id = parts.pop()!;
    return new DocumentReference(parts.join("/"), id);
  }

  async getAll(...refs: DocumentReference[]) {
    return Promise.all(refs.map((ref) => ref.get()));
  }

  async runTransaction<T>(fn: (tx: TransactionStore) => Promise<T>): Promise<T> {
    const sql = await sqlClient();
    return sql.begin(async (inner) => {
      const writes: Array<() => Promise<void>> = [];
      const tx: TransactionStore = {
        async get(ref) {
          return new DocumentReference(ref.collectionName, ref.id, inner).get();
        },
        set(ref, data, options) {
          writes.push(() => new DocumentReference(ref.collectionName, ref.id, inner).set(data, options));
        },
        create(ref, data) {
          writes.push(async () => {
            const snap = await new DocumentReference(ref.collectionName, ref.id, inner).get();
            if (snap.exists) throw new Error("Document already exists.");
            await new DocumentReference(ref.collectionName, ref.id, inner).set(data);
          });
        },
      };
      const result = await fn(tx);
      for (const write of writes) await write();
      return result;
    });
  }
}

export const firestoreStore = new FirestoreStore();

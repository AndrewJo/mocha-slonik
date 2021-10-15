import { env } from "process";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { createPool, DatabasePoolType, NotFoundError, sql } from "slonik";

use(chaiAsPromised);

describe("BindPoolMock", function () {
  let dbUrl: string;
  let pool: DatabasePoolType;

  before(function () {
    dbUrl = env.DATABASE_URL ?? "postgres://localhost:5432";
    pool = createPool(dbUrl);
  });

  beforeEach(async function () {
    await pool.query(sql`CREATE TABLE test (foo integer NOT NULL);`);
  });

  it("should wrap all database calls in transaction", async function () {
    const actual = await pool.oneFirst(sql`INSERT INTO test (foo) VALUES (1) RETURNING foo;`);
    expect(actual).to.equal(1);
  });

  it("should rollback after each tests", function () {
    const actual = pool.one(sql`SELECT * FROM test;`);
    return expect(actual).to.be.rejectedWith(NotFoundError, "Resource not found.");
  });
});

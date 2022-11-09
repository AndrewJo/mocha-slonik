import { env } from "process";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { createPool, DatabasePool, NotFoundError, sql } from "slonik";

use(chaiAsPromised);

describe("BindPoolMock", function () {
  let dbUrl: string;
  let pool: DatabasePool;

  before(async function () {
    dbUrl = env.DATABASE_URL ?? "postgres://localhost:5432";
    pool = await createPool(dbUrl);
  });

  beforeEach(async function () {
    await pool.query(sql`CREATE TABLE test (foo integer NOT NULL);`);
  });

  it("should wrap all database calls in transaction", async function () {
    const actual = await pool.connect(async (connection) => {
      return connection.oneFirst(sql`INSERT INTO test (foo) VALUES (1) RETURNING foo;`);
    });
    expect(actual).to.equal(1);
  });

  it("should rollback after each tests", function () {
    const actual = pool.one(sql`SELECT * FROM test;`);
    return expect(actual).to.be.rejectedWith(NotFoundError, "Resource not found.");
  });

  it("should reject wrapped methods if not using sql template literal", async function () {
    const actual = pool.any("SELECT * FROM test;" as any);
    return expect(actual).to.be.rejectedWith(TypeError, "Query must be constructed using `sql` tagged template literal.");
  });

  it("should wrap new pools in transaction", async function () {
    const pool2 = await createPool(env.DATABASE_URL ?? "postgres://localhost:5432", {
      interceptors: [
        {
          beforePoolConnection(ctx) {
            return pool;
          }
        }
      ],
    });

    return pool2.connect(async (connection) => {
      await connection.query(sql`SELECT 1`);
      expect(pool.getPoolState().activeConnectionCount).to.not.equal(pool2.getPoolState().activeConnectionCount);
    });
  });

  it("should reject when copyFromBinary is called", function () {
    return expect(pool.copyFromBinary(null, null, null)).to.be.rejectedWith(Error, "copyFromBinary is not supported in transactions.");
  });
});

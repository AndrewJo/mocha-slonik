import { env } from "process";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { DatabasePool, createPool } from "../../src/index";
import { NotFoundError, sql } from "slonik";

use(chaiAsPromised);

describe("createPool", function () {
  let dbUrl: string;
  let pool: DatabasePool;

  before(async function () {
    dbUrl = env.DATABASE_URL ?? "postgres://localhost:5432";
    pool = await createPool(dbUrl);
  });

  describe("test group #1", function () {
    before(async function () {
      await pool.query(sql.unsafe`CREATE TABLE test (foo integer NOT NULL);`);
    });

    after(async function () {
      pool.rollback();
    });

    it("should wrap all database calls in transaction", async function () {
      const actual = await pool.connect(async (connection) => {
        return connection.oneFirst(sql.unsafe`INSERT INTO test (foo) VALUES (1) RETURNING foo;`);
      });
      expect(actual).to.equal(1);
    });

    it("should see previously inserted data", async function () {
      const actual = await pool.oneFirst(sql.unsafe`SELECT foo FROM test;`);
      expect(actual).to.equal(1);
    });
  });

  describe("test group #2", function () {
    beforeEach(async function () {
      await pool.query(sql.unsafe`CREATE TABLE test (foo integer NOT NULL);`);
    });

    afterEach(async function () {
      pool.rollback();
    });

    it("should wrap all database calls in transaction", async function () {
      const actual = await pool.connect(async (connection) => {
        return connection.oneFirst(sql.unsafe`INSERT INTO test (foo) VALUES (1) RETURNING foo;`);
      });
      expect(actual).to.equal(1);
    });

    it("should rollback after each tests", function () {
      const actual = pool.one(sql.unsafe`SELECT * FROM test;`);
      return expect(actual).to.be.rejectedWith(NotFoundError, "Resource not found.");
    });
  });
});

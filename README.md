# mocha-slonik

[![npm](https://img.shields.io/npm/v/mocha-slonik?style=flat-square)][npm]
[![CircleCI](https://img.shields.io/circleci/build/github/AndrewJo/mocha-slonik/master?style=flat-square)][circleci]
[![Codecov branch](https://img.shields.io/codecov/c/github/AndrewJo/mocha-slonik/master?style=flat-square)][codecov]
[![GitHub](https://img.shields.io/github/license/AndrewJo/mocha-slonik?style=flat-square)](./LICENSE)
[![npm](https://img.shields.io/npm/dw/mocha-slonik?style=flat-square)][npm]

[Slonik][slonik] transaction support for [Mocha][mocha] test framework.

## Table of Contents

- [How it works](#how-it-works)
- [Version compatibility](#version-compatibility)
- [Installation](#installation)
- [Usage](#usage)
  - [Without Mocha Root Hook plugin](#without-mocha-root-hook-plugin)
  - [With Mocha Root Hook plugin](#with-mocha-root-hook-plugin)
- [API](#api)
  - [`rollback`](#rollback)
  - [`currentTransaction`](#currenttransaction)
- [Best practices](#best-practices)
  - [Always rollback transaction in `after`/`afterEach` block](#always-rollback-transaction-in-afteraftereach-block)
- [Developing](#developing)
- [Running tests](#running-tests)
- [Limitations](#limitations)
  - [Lack of `copyFromBinary` support](#lack-of-copyfrombinary-support)

## How it works

mocha-slonik is a [Root Hook Plugin][root-hook-plugin] for [Mocha][mocha] that utilizes
[ts-mock-imports][ts-mock-imports] to return a stubbed bindPool function that wrap most of the
[Slonik query methods][slonik-query-methods] in a transaction that automatically rolls back after
each test.

## Version compatibility

|  mocha-slonik |                            slonik |  mocha |
| ------------: | --------------------------------: | -----: |
| ≥4.2.0 <5.0.0 | ^27.0.0 \|\| ^28.0.0 \|\| ^29.0.0 | ≥9.2.2 |
| ≥4.1.0 <4.2.0 |              ^27.0.0 \|\| ^28.0.0 | ^9.1.0 |
|        ~4.0.0 |                           ^27.0.0 | ^9.1.0 |
|        ^3.0.0 |                           ^26.0.0 | ^9.1.0 |
|        ^2.0.0 |                           ^25.0.0 | ^9.1.0 |
|        ^1.0.0 |                           ^24.0.0 | ^9.1.0 |

## Installation

Install this library as a dev dependency in your project:

```sh
npm i -D mocha-slonik
```

## Usage

### Without Mocha Root Hook plugin

This is recommended for applications that utilize factory design pattern and does not wish to
introduce global side effect on the Slonik module itself.

This is especially useful if you want fine control over when you want to rollback the transactions.
For example, if you have a nested `describe` block but only wish to rollback on the inner block,
you can choose to rollback in the inner `after` function.

```typescript
import { createPool } from "mocha-slonik";

describe("outer block", function () {
  let pool;

  before(function () {
    pool = createPool(/* ... */);
  });

  describe("test group 1", function () {
    // Group 1 rolls back after the entire group has completed running.
    after(async function () {
      await pool.rollback();
    });

    it("should insert data", async function () {
      // ...
    });

    it("should test something else with inserted data", async function () {
      // ...
    });
  });

  describe("test group 2", function () {
    // Group 2 rolls back after EACH test completed running.
    afterEach(async function () {
      await pool.rollback();
    });

    it("shouldn't be affected by changes to data by tests in group 1", async function () {
      // ...
    })
  });

});
```

This ensures the tests that are grouped by the inner `describe` block see the side effects of
previous tests within the group but isolated from other tests outside of the inner `describe`
block.

#### Example Express.js project

##### `createServer.ts`

```typescript
export const createServer = ({ app, pool }, listenPort) => {
  app.use(json);
  app.post("/articles", async (req, res, next) => {
    const { title, body } = req.body;
    const newArticle = await pool.query(sql`
      INSERT INTO articles (title, body) VALUES (${title}, ${body}) RETURNING *;
    `);

    res.status(201).json(newArticle);
  });

  app.get("/articles/:articleId", async (req, res, next) => {
    const article = await pool.one(sql`
      SELECT * FROM articles WHERE id = ${req.params.articleId} LIMIT 1;
    `);

    res.json(article);
  });

  return app.listen(listenPort ?? 8080);
}
```

##### `server.ts`

```typescript
import express, { json } from "express";
import { createPool, sql } from "slonik";
import { createServer } from "app";

const pool = createPool(process.env.DATABASE_URL);
export const app = express();
export const server = createServer({ app, pool });
```

##### `server.spec.ts`

```typescript
import { expect, use } from "chai";
import chaiHttp from "chai-http";
import { createPool } from "mocha-slonik";
import { sql } from "slonik";
import { createServer } from "./app";

use(chaiHttp);

describe("/articles", function () {
  let app;
  let client;
  let server;
  let pool;

  before(async function () {
    app = express();
    pool = createPool(process.env.DATABASE_URL);
    server = createServer({ app, createPool });
    client = chai.request(server).keepOpen();
  });

  beforeEach(async function () {
    // Assume 3 items of test fixture data to be inserted into the database.
    const testFixtures = [
      [ /* ... */ ],
      // ...
    ];

    // Bulk insert test fixture
    await pool.query(sql`
      INSERT INTO articles (title, body)
      SELECT * FROM ${sql.unnest(testFixtures, ["text", "text"])};
    `);
  });

  // Remember to rollback the pool afterEach test.
  afterEach(async function () {
    await pool.rollback();
  });

  after(function (done) {
    pool.end().then(() => {
      client.close();
      server.close(done);
    });
  });

  it("should insert a new article", async function () {
    const payload = {
      title: "Never Gonna Give You Up",
      body: "We're no strangers to love"
    };

    // oldCount should be 3 based on test fixture.
    const oldCount = await pool.oneFirst(sql`SELECT COUNT(*) FROM articles;`);

    const response = await client.post("/articles").send(payload);

    // newCount should now be 4
    const newCount = await pool.oneFirst(sql`SELECT COUNT(*) FROM articles;`);

    expect(response.body).to.eql(payload);
    expect(newCount).to.be.above(oldCount);
  });

  it("should get an article by id", async function () {
    const response = await client.get("/articles/1").send();
    const expected = {
      title: "Lorem ipsum",
      body: "Lorem ipsum dolor amit"
    };

    // Previous test shouldn't affect this test and count return 3
    const count = await pool.oneFirst(sql`SELECT COUNT(*) FROM articles;`);

    expect(response.body).to.eql(expected);
  });
});
```

### With Mocha Root Hook plugin

This usage pattern is recommended for applications that cannot utilize factory design pattern.

Require `mocha-slonik/register` in Mocha CLI:

```sh
mocha --require mocha-slonik/register tests/**/*.ts
```

Or update `.mocharc` configuration file:

```json
{
  "require": [
    "mocha-slonik/register"
  ]
}
```

That's it! All of your Slonik queries will be wrapped in a transaction in both your application
code and your tests that will automatically be rolled back after each test block.

#### Example Express.js project

##### `app.ts`

```typescript
import express, { json } from "express";
import { createPool, sql } from "slonik";

const pool = createPool(process.env.DATABASE_URL);
export const app = express();

app.use(json);
app.post("/articles", async (req, res, next) => {
  const { title, body } = req.body;
  const newArticle = await pool.query(sql`
    INSERT INTO articles (title, body) VALUES (${title}, ${body}) RETURNING *;
  `);

  res.status(201).json(newArticle);
});

app.get("/articles/:articleId", async (req, res, next) => {
  const article = await pool.one(sql`
    SELECT * FROM articles WHERE id = ${req.params.articleId} LIMIT 1;
  `);

  res.json(article);
});

app.listen(8080);
```

##### `app.spec.ts`

```typescript
import { expect, use } from "chai";
import chaiHttp from "chai-http";
import { createPool, sql } from "slonik";
import { app } from "./app";

use(chaiHttp);

describe("/articles", function () {
  let client;
  let server;
  let pool;

  before(async function () {
    server = app.listen(9090);
    client = chai.request(server).keepOpen();
    pool = createPool(process.env.DATABASE_URL);
  });

  beforeEach(async function () {
    // Assume 3 items of test fixture data to be inserted into the database.
    const testFixtures = [
      [ /* ... */ ],
      // ...
    ];

    // Bulk insert test fixture (rolls back after each test)
    await pool.query(sql`
      INSERT INTO articles (title, body)
      SELECT * FROM ${sql.unnest(testFixtures, ["text", "text"])};
    `);
  });

  after(function (done) {
    pool.end().then(() => {
      client.close();
      server.close(done);
    });
  });

  it("should insert a new article", async function () {
    const payload = {
      title: "Never Gonna Give You Up",
      body: "We're no strangers to love"
    };

    // oldCount should be 3 based on test fixture.
    const oldCount = await pool.oneFirst(sql`SELECT COUNT(*) FROM articles;`);

    const response = await client.post("/articles").send(payload);

    // newCount should now be 4
    const newCount = await pool.oneFirst(sql`SELECT COUNT(*) FROM articles;`);

    expect(response.body).to.eql(payload);
    expect(newCount).to.be.above(oldCount);
  });

  it("should get an article by id", async function () {
    const response = await client.get("/articles/1").send();
    const expected = {
      title: "Lorem ipsum",
      body: "Lorem ipsum dolor amit"
    };

    // Previous test shouldn't affect this test and count return 3
    const count = await pool.oneFirst(sql`SELECT COUNT(*) FROM articles;`);

    expect(response.body).to.eql(expected);
  });
});
```

## API

The query methods exposed by mocha-slonik is nearly identical to
[query methods][slonik-query-methods] exposed by default Slonik pool instance except for few
additional methods, properties and [limitations](#limitations).

### `rollback`

`rollback` method is used to rollback the global transaction in mocha-slonik. It should _only_ be
used in `after` or `afterEach` blocks in your tests. Usage anywhere else is considered
anti-pattern and may introduce side effects that are hard to debug.

Example:

```typescript
import { createPool } from "mocha-slonik";

describe("/articles", function () {
  let pool;

  before(async function () {
    pool = createPool(process.env.DATABASE_URL);
  });

  // ...

  // Remember to rollback the pool afterEach test.
  afterEach(async function () {
    await pool.rollback();
  });

  // ...
});
```

### `currentTransaction`

`currentTransaction` getter is a property that returns the current transaction if one has been
started, `undefined` otherwise.

## Best practices

### Always rollback transaction in `after`/`afterEach` block

Unless you are using the Mocha Root Hook plugin, you should always rollback your transactions in
`after` or `afterEach` block instead of individual `it` test cases. This prevents unexpected
surprises if your test code throws errors or has rejected promises because `after`/`afterEach` is
guaranteed to run even if your tests fail or contains errors.

**Do:**

```typescript
import { createPool } from "mocha-slonik";

describe("Rollback on afterEach", function () {
  let pool;

  before(async function () {
    pool = createPool(process.env.DATABASE_URL);
  });

  // ...

  // Rollback the transaction after each test.
  afterEach(async function () {
    await pool.rollback();
  });

  // ...
});

describe("Rollback on after", function () {
  let pool;

  before(async function () {
    pool = createPool(process.env.DATABASE_URL);
  });

  // ...

  // Rollback the transaction after the entire group of tests in the describe block.
  after(async function () {
    await pool.rollback();
  });

  // ...
});
```

**Don’t:**

```typescript
import { expect } from "chai";
import { createPool } from "mocha-slonik";
import { sql } from "slonik";

describe("Rollback on individual test cases", function () {
  let pool;

  before(async function () {
    pool = createPool(process.env.DATABASE_URL);
  });

  it("Bad example 1", async function () {
    const result = await pool.oneFirst(sql`SELECT 1`);
    expect(result).to.eq(0);

    // If the assertion above fails, the rollback won't execute.
    await pool.rollback();
  });

  it("Bad example 2", async function () {
    const result = await pool.oneFirst(sql`SELECT 1`);

    // Simulate some thrown error in the test code
    await Promise.reject(new Error());

    // The rollback won't excute even if the rollback is above the assertion this time.
    await pool.rollback();

    expect(result).to.eql(1);
  });

  it("Bad example 3", async function () {
    try {
      const result = await pool.oneFirst(sql`SELECT 1`);

      // Simulate some thrown error in the test code
      await Promise.reject(new Error());

      expect(result).to.eql(1);
    } catch (error) {
      throw error;
    } finally {
      // Technically works but you have to remember to add the try/finally block for EVERY test case.
      await pool.rollback();
    }
  });
});
```

## Developing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before making changes to this project.

## Running tests

To run tests:

```shell
npm run build && npm test
```

To run test with coverage:

```shell
npm run test:coverage && npx nyc reporter --reporter=lcov
```

This will generate an HTML coverage report at: `./coverage/lcov-report/index.html`.

## Limitations

This library overrides parts of Slonik that is not part of its public API and may break in the
future. Please make sure to check the release notes for compatible Slonik versions before using
this library.

### Lack of `copyFromBinary` support

Due to the lack of support for transactions in `copyFromBinary` method and
[the potential for being deprecated in the future versions][slonik-issue-161], calling
`copyFromBinary` will immediately reject with an error message.

[npm]: https://www.npmjs.com/package/mocha-slonik
[circleci]: https://circleci.com/gh/AndrewJo/mocha-slonik/tree/master
[codecov]: https://app.codecov.io/gh/AndrewJo/mocha-slonik/
[mocha]: https://mochajs.org
[root-hook-plugin]: https://mochajs.org/#root-hook-plugins
[ts-mock-imports]: https://github.com/EmandM/ts-mock-imports
[slonik]: https://github.com/gajus/slonik
[slonik-query-methods]: https://github.com/gajus/slonik#slonik-query-methods
[slonik-issue-161]: https://github.com/gajus/slonik/issues/161#issuecomment-604770259

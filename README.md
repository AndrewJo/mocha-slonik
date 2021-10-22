# mocha-slonik

![npm](https://img.shields.io/npm/v/mocha-slonik?style=flat-square)
![CircleCI](https://img.shields.io/circleci/build/github/AndrewJo/mocha-slonik/master?style=flat-square)
![Codecov branch](https://img.shields.io/codecov/c/github/AndrewJo/mocha-slonik/master?style=flat-square)
![GitHub](https://img.shields.io/github/license/AndrewJo/mocha-slonik?style=flat-square)
![npm](https://img.shields.io/npm/dw/mocha-slonik?style=flat-square)

Slonik transaction support for [Mocha][mocha] test framework.

## How it works

mocha-slonik is a [Root Hook Plugin][root-hook-plugin] for [Mocha][mocha] that utilizes
[ts-mock-imports][ts-mock-imports] to return a stubbed bindPool function that wrap most of the
[Slonik query methods][slonik-query-methods] in a transaction that automatically rolls back after
each test.

## Installation

Install this library as a dev dependency in your project:

```sh
npm i -D mocha-slonik
```

## Usage

### Without Mocha Root Hook plugin

This is recommended for applications that utilize factory design pattern and does not wish to
introduce global side effect on the Slonik module itself.

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

[mocha]: https://mochajs.org
[root-hook-plugin]: https://mochajs.org/#root-hook-plugins
[ts-mock-imports]: https://github.com/EmandM/ts-mock-imports
[slonik]: https://github.com/gajus/slonik
[slonik-query-methods]: https://github.com/gajus/slonik#slonik-query-methods
[slonik-issue-161]: https://github.com/gajus/slonik/issues/161#issuecomment-604770259

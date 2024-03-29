import { RootHookObject } from "mocha";
import { Pool } from "pg";
import { ImportMock, OtherManager } from "ts-mock-imports";
import * as bindPool from "slonik/dist/binders/bindPool";
import type {
  ClientConfiguration,
  DatabasePool,
  Logger,
} from "slonik/dist/types";
import { BindPoolMock } from "mocha-slonik/binders/bindPoolMock";

let bindPoolMock: BindPoolMock;
let bindPoolImportMock: OtherManager<
  (
    parentLog: Logger,
    pool: Pool,
    clientConfiguration: ClientConfiguration
  ) => DatabasePool
>;

export const mochaHooks: RootHookObject = {
  beforeAll() {
    bindPoolMock = new BindPoolMock();
    bindPoolImportMock = ImportMock.mockOther(bindPool, "bindPool", bindPoolMock.bindPool());
  },
  afterEach() {
    bindPoolMock.rollback();
  },
  afterAll() {
    bindPoolImportMock.restore();
  },
};

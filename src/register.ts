import { RootHookObject } from "mocha";
import { ImportMock, OtherManager } from "ts-mock-imports";
import * as bindPool from "slonik/dist/src/binders/bindPool";
import { BindPoolFunction, BindPoolMock } from "mocha-slonik/binders/bindPoolMock";

let bindPoolMock: BindPoolMock;
let bindPoolImportMock: OtherManager<BindPoolFunction>;

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

import { Pool as PgPool } from "pg";
import type pgTypes from "pg-types";
import { Logger } from "slonik/dist/Logger";
import type { ClientConfigurationInput } from "slonik/dist/types";
import { createClientConfiguration } from "slonik/dist/factories/createClientConfiguration";
import { createInternalPool } from "slonik/dist/factories/createInternalPool";
import { createPoolConfiguration } from "slonik/dist/factories/createPoolConfiguration";
import { createTypeOverrides } from "slonik/dist/routines/createTypeOverrides";
import { getPoolState } from "slonik/dist/state";
import { BindPoolMock } from "mocha-slonik/binders/bindPoolMock";
import type { DatabasePool } from "mocha-slonik/types";

/**
 * @param connectionUri PostgreSQL [Connection URI](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING).
 */
export const createPool = async (
  connectionUri: string,
  clientConfigurationInput?: ClientConfigurationInput
): Promise<DatabasePool> => {
  const clientConfiguration = createClientConfiguration(clientConfigurationInput);

  const poolConfiguration = createPoolConfiguration(connectionUri, clientConfiguration);

  let Pool = clientConfiguration.PgPool;

  if (!Pool) {
    Pool = PgPool;
  }

  if (!Pool) {
    throw new Error("Unexpected state.");
  }

  const setupPool = createInternalPool(Pool, poolConfiguration);

  let getTypeParser: typeof pgTypes.getTypeParser;

  try {
    const connection = await setupPool.connect();

    getTypeParser = await createTypeOverrides(
      connection,
      clientConfiguration.typeParsers
    );

    await connection.release();
  } finally {
    await setupPool.end();
  }

  const pool: PgPool = createInternalPool(Pool, {
    ...poolConfiguration,
    types: {
      getTypeParser,
    }
  });

  const bindPool = new BindPoolMock().bindPool();

  return bindPool(Logger.child({
    poolId: getPoolState(pool).poolId,
  }), pool, clientConfiguration);
};

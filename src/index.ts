import { DataSource } from "typeorm";
import { AsyncLocalStorage } from "node:async_hooks";
import { Request, Response, NextFunction } from "express";

interface BemiMetadataConfig {
  apiEndpoint: string;
  userID: number;
  queryParams: Request["query"];
}

interface PostgresDriver {
  postgres: any;
}

const asyncLocalStorage = new AsyncLocalStorage();
export const bemiMetadata = (
  typeORM: DataSource,
  callback: (req: Request) => BemiMetadataConfig
) => {
  if ("postgres" in typeORM.driver) {
    const driver = typeORM.driver as PostgresDriver;
    const originalQuery = driver.postgres.Client.prototype.query;
    driver.postgres.Client.prototype.query = async function <T = any>(
      config,
      values,
      callback
    ) {
      const writeOperationsRegex = /(INSERT|UPDATE|DELETE)\s/gi;
      if (writeOperationsRegex.test(config)) {
        const context = asyncLocalStorage.getStore();
        config = config.concat(` /*Bemi ${JSON.stringify(context)} Bemi*/`);
      }
      return await originalQuery.call(this, config, values, callback);
    };
  } else {
    console.error("Bemi currently supports only PostgreSQL databases");
  }

  return (req: Request, _res: Response, next: NextFunction) => {
    const config = callback(req);

    asyncLocalStorage.run(config, () => {
      next();
    });
  };
};

export { bemiUpSQL, bemiDownSQL } from "./commands/migration-helpers";
export { Change } from "./entities/Change";

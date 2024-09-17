import { DataSource } from "typeorm";
import { AsyncLocalStorage } from "node:async_hooks";
import { Request, Response, NextFunction } from "express";

interface PostgresDriver {
  postgres: any;
}

const ASYNC_LOCAL_STORAGE = new AsyncLocalStorage();
const MAX_CONTEXT_SIZE = 1000000 // ~ 1MB

let wrappedOriginalQuery = false;

const wrapOriginalQuery = (typeORM: DataSource) => {
  if (wrappedOriginalQuery) return;

  if (!("postgres" in typeORM.driver)) {
    throw new Error("Bemi currently supports only PostgreSQL databases");
  }

  const driver = typeORM.driver as PostgresDriver;
  const originalQuery = driver.postgres.Client.prototype.query;
  driver.postgres.Client.prototype.query = function(config: any, values: any, clbk: any) {
    let sql = config;
    const writeOperationsRegex = /(INSERT|UPDATE|DELETE)\s/gi;
    const context = ASYNC_LOCAL_STORAGE.getStore();

    if (context && sql && writeOperationsRegex.test(sql)) {
      const contextComment = `/*Bemi ${JSON.stringify(context)} Bemi*/`
      if (contextComment.length <= MAX_CONTEXT_SIZE) {
        sql = `${sql} ${contextComment}`;
        if (process.env.BEMI_DEBUG) console.log(`>>[Bemi] ${sql}`);
      }
    }
    return originalQuery.call(this, sql, values, clbk);
  };

  wrappedOriginalQuery = true;
}

export const setContext = (
  typeORM: DataSource,
  callback: (req: Request) => any
) => {
  wrapOriginalQuery(typeORM);

  return (req: Request, _res: Response, next: NextFunction) => {
    const config = callback(req);

    ASYNC_LOCAL_STORAGE.run(config, () => {
      next();
    });
  };
};

export { bemiUpSQL, bemiDownSQL } from "./commands/migration-helpers";
export { Change } from "./entities/Change";

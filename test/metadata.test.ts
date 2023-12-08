// @ts-nocheck

import chai from "chai";
import chaiHttp from "chai-http";
import { bemiMetadata } from "../src/index";
import { stub, spy } from "sinon";
import express from "express";
chai.use(chaiHttp);

const expect = chai.expect;

describe("bemiMetadata middleware", () => {
  let typeORM: any;
  let callback: sinon.SinonSpy;
  let next: sinon.SinonSpy;

  beforeEach(() => {
    typeORM = {
      driver: {
        postgres: {
          Client: {
            prototype: {
              query: (sql, _config, _callback) => {
                return Promise.resolve(sql);
              },
            },
          },
        },
      },
    };
    callback = spy();
    next = spy();
  });

  const app = express();

  it("should call callback and run next function", async () => {
    const req: Request = {} as Request;
    const res: Response = {} as Response;

    await bemiMetadata(typeORM, callback)(req, res, next);

    expect(callback.calledWith(req)).to.be.true;
    expect(next.calledOnce).to.be.true;
  });

  it("should inject Bemi metadata into PostgreSQL queries", (done) => {
    app.use(
      bemiMetadata(typeORM, (req) => ({
        apiEndpoint: "/",
        userID: 123,
        queryParams: { food: "bar" },
      }))
    );
    app.get("/", (req, res) => {
      typeORM.driver.postgres.Client.prototype
        .query(
          `INSERT INTO "todo"("task", "isCompleted") VALUES ($1, $2) RETURNING "id"`
        )
        .then((sql) => res.json({ query: sql }))
        .catch((error) => {
          res.json({ error: error.message });
        });
    });

    chai
      .request(app)
      .get("/")
      .end((_err, res) => {
        const sql = res.body.query;
        const expected = `INSERT INTO "todo"("task", "isCompleted") VALUES ($1, $2) RETURNING "id" /*Bemi {"apiEndpoint":"/","userID":123,"queryParams":{"food":"bar"}} Bemi*/`;
        expect(sql).to.equals(expected);
        done();
      });
  });

  it("should not modify queries for non-PostgreSQL databases", async () => {
    typeORM.driver = {};

    const req: Request = {} as Request;
    const res: Response = {} as Response;

    const consoleErrorStub = stub(console, "error");
    await bemiMetadata(typeORM, callback)(req, res, next);

    expect(consoleErrorStub.calledOnce).to.be.true;
    consoleErrorStub.restore();
  });
});

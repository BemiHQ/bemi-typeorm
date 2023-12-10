[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://bemi.io/">
    <img width="1201" alt="bemi-logo-github" src="https://github.com/BemiHQ/typeorm/assets/22333438/53194a82-291c-4ae0-9121-e66c16bbab5c">
  </a>

  <p align="center">
    <a href="https://github.com/BemiHQ/typeorm/issues">Report Bug</a>
    ·
    <a href="https://github.com/BemiHQ/typeorm/issues">Request Feature</a>
  </p>
</div>

# Bemi

[Bemi](https://bemi.io/) plugs into your PostgreSQL and [TypeORM](https://github.com/typeorm/typeorm) to track database changes automatically. It unlocks time travel querying and robust audit trails inside your application.

Designed with simplicity and non-invasiveness in mind, Bemi doesn't require any alterations to your existing system. It operates in the background, empowering you with powerful data change tracking features.

This middleware library is an optional TypeORM integration, enabling your application to incorporate additional metadata in PostgreSQL logs. This includes context such as the 'where' (API endpoint, worker, etc.), 'who' (user, cron job, etc.), and 'how' behind a change, thereby enriching the information captured by Bemi.

<!-- TABLE OF CONTENTS -->

## Contents

- [Highlights](#highlights)
- [Use cases](#use-cases)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Architecture overview](#architecture-overview)
- [License](#license)
- [Code of Conduct](#code-of-conduct)
- [Roadmap](#roadmap)

<!-- Highlights -->

## Highlights

- Automatically and securely stores database changes with application-level metadata in a structured form
- Highly performant without affecting code runtime execution with callbacks
- Easy to use, no table structure changes required
- 100% reliability in capturing data changes, even if executed through direct SQL outside the application
- Time travel querying and ability to easily group and filter changes
- Scalability with an automatically provisioned cloud infrastructure
- Maintains full ownership of your data

See [a demo and an example repo](https://github.com/BemiHQ/typeorm-example) for TypeORM that automatically tracks all changes.

<!-- Use cases -->

## Use cases

There's a wide range of use cases that Bemi is built for! The tech was initially built as a compliance engineering system for fintech that tracked $15B worth of money movements, but has since been extracted in to a general purpose utility. Some potential use cases include:

- **Audit Trails:** Comprehensive audit trail for compliance, or surfacing logs to customer support or external customers.

- **Change Reversion:** Revert changes made a user or roll back all data changes within an API request.

- **Troubleshooting:** Root cause application data issues.

- **Distributed Data Tracing:** Track changes across distributed systems.

- **Time Travel Queries:** Retrieve historical data, replacing event sourcing.

- **Testing:** Rolling back or rolling forward to different application states.

- **Analyzing Historical Trends:** Gain insights into historical trends and changes for informed decision-making.

<!-- GETTING STARTED -->

## Getting Started

Get started by connecting your source database and installing this open-source library into your application to start storing all data changes in a provisioned cloud PostgreSQL destination database.

First, [connect the source PostgreSQL database](https://dashboard.bemi.io/log-in?ref=typeorm) you want to track data changes for. The database connection details are securely configured through the dashboard UI in a few seconds. Bemi currently doesn't support a self hosted option, but
[contact us](mailto:hi@bemi.io) if this is required.

![dashboard](https://github.com/BemiHQ/typeorm/assets/22333438/178ecb34-4591-4404-817f-49b9f4b8c517)

Once your destination Postgres database has been fully provisioned, you'll stop seeing a pending status when hovering over the source database in the Bemi dashboard and can test the connection locally:

```sh
psql -h us-west-1-prod-destination-pool.ctbxbtz4ojdc.us-west-1.rds.amazonaws.com -p 5432 -U u_9adb30103a55 -d db_9adb30103a55 -c "SELECT * FROM changes;"
```

Next, install this package with the instructions below.

Lastly, connect directly to the Bemi PostgreSQL database to easily query change data from your application.

### Prerequisites

- PostgreSQL
- TypeORM
- Express (Fastify support coming soon)

### Installation

1. Install the NPM package

```sh
npm install @bemi-db/typeorm
```

2. Generate a TypeORM compatible migration file to add lightweight [PostgreSQL triggers](https://www.postgresql.org/docs/current/plpgsql-trigger.html) for inserting application metadata into replication logs.

```sh
npx bemi migration:create ./path-to-migrations-dir
```

3. Run pending TypeORM migrations

```sh
npx typeorm migration:run
```

<!-- Usage -->

## Usage

Add an [express.js](https://expressjs.com/) middleware. Here is an example of how to pass application context with all underlying data changes within an HTTP request:

```typescript
import { bemiMetadata } from "@bemi-db/typeorm";
import express from "express";

import { AppDataSource } from "./data-source";

const main = async (): Promise<void> => {
  const app = express();
  const port = 3000;

  // This is where you set any information that should be stored as context with all data changes
  app.use(
    bemiMetadata(AppDataSource, (req) => ({
      apiEndpoint: req.url,
      userID: req.user?.id,
      queryParams: req.query,
    }))
  );

  // Initializing TypeORM connection as normal
  AppDataSource.initialize()
    .then(() => console.log("Connected to Postgres"))
    .catch((error) => console.log(error));

  app.listen(port, (): void => {
    console.log(`Server is running on port ${port}`);
  });
};
```

To query the read-only historical data, add the Bemi destination database to TypeORM using [multiple data source](https://typeorm.io/multiple-data-sources#using-multiple-data-sources). Configuration setting are found directly on the [Bemi dashboard](https://dashboard.bemi.io/log-in/):

```typescript
import { DataSource } from "typeorm";
import { Change } from "@bemi-db/typeorm";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "admin",
  database: "db1",
  entities: [__dirname + "/entity/*{.js,.ts}"],
  synchronize: true,
});

export const BemiDataSource = new DataSource({
  type: "postgres",
  name: "bemiRead",
  host: "us-west-1-prod-destination-pool.ctbxbtz4ojdc.us-west-1.rds.amazonaws.com",
  port: 5432,
  username: "u_9adb30103a55",
  password: "password",
  database: "db_9adb30103a55",
  synchronize: false,
  logging: true,
  entities: [Change],
  migrations: [],
  ssl: { rejectUnauthorized: false },
});
```

Initialize the BemiDataSource the same place you would your main AppDataSource

```typescript
BemiDataSource.initialize()
  .then(() => {
    console.log("Connected to Bemi");
  })
  .catch((error) => {
    console.log(error);
  });
```

Querying Changes:

```typescript
import { Change } from "@bemi-db/typeorm";
import { BemiDataSource } from "./index";

const changeRepository = BemiDataSource.getRepository(Change);

const [changes, changesCount] = await changeRepository.findAndCount();
console.log("All changes: ", changes);
console.log("changes count: ", changesCount);
```

<!-- Architecture overview -->

## Architecture overview

Bemi is designed to be lightweight and secure. It takes a practical approach to achieving the benefits of [event sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) without requiring rearchitecting existing code, switching to highly specialized databases, or using unnecessary git-like data versioning abstractions. We want your system to work the way it already does with your existing database to allow keeping things as simple as possible.

Bemi plugs in to both the database and application levels, ensuring 100% reliability and a comprehensive understanding of every change.

On the database level, Bemi securely connects to PostgreSQL's [Write-Ahead Log](https://www.postgresql.org/docs/current/wal-intro.html)'s and implements [Change Data Capture](https://en.wikipedia.org/wiki/Change_data_capture). This allows tracking even the changes that get triggered via direct SQL.

On the application level, this library automatically passes application context and metadata to the replication logs to enhance the low-level database changes. For example, information about a user who made a change, an API endpoint where the change was triggered, a worker name that automatically triggered database changes, etc..

Bemi workers then stitch the low-level data with the application context and store this information in a structured easily queryable format, as depicted below:
![bemi-architechture](https://github.com/BemiHQ/typeorm/assets/22333438/47e9a656-53a1-4789-952d-9968354611a2)

The cloud solution includes worker ingesters, queues for fault tolerance, and an automatically scalable cloud-hosted PostgreSQL.

<!-- LICENSE -->

## License

Distributed under the terms of the [MIT License](http://opensource.org/licenses/MIT).

<!-- Code of Conduct -->

## Code of Conduct

Everyone interacting in the Bemi project's codebases, issue trackers, chat rooms and mailing lists is expected to follow the [code of conduct](https://github.com/exAspArk/bemi/blob/master/CODE_OF_CONDUCT.md).

<!-- ROADMAP -->

## Roadmap

- [x] Add PostgreSQL support
- [ ] Add NodeJS ORM support
  - [x] TypeORM
  - [ ] Prisma
  - [ ] Sequelize
- [ ] Track `TRUNCATE` SQL commands
- [ ] Selective tracking of tables and fields
- [ ] Passing application context in background jobs and cascading writes
- [ ] ORM querying helpers
- [ ] UI tooling providing intuitive visualization of data changes
- [ ] Permissions

import fs from "fs";
import path from "path";

// TODO: update to pass DataSource path, typeorm convension
// bun bemi migration:create ./src/migrations
export const generateMigrationFile = async (pathToMigrationsDir: string) => {
  const timestamp = new Date().getTime();
  const migrationName = `Bemi`;
  const migrationFileName = `${timestamp}-${migrationName}.ts`;
  // TODO: error handling for wrong directory + auto finding directory
  const migrationFilePath = path.join(
    process.cwd(),
    pathToMigrationsDir,
    migrationFileName
  );
  const migrationClassName = `${migrationName}${timestamp}`;
  const migrationContent = getMigrationContent(migrationClassName);

  fs.writeFileSync(migrationFilePath, migrationContent);

  console.log(`Migration file created: ${migrationFilePath}`);
};

// TODO: schema name
const getMigrationContent = (className: string) => {
  return `import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  bemiUpSQL,
  bemiDownSQL,
} from "@bemi/typeorm";

export class ${className} implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(bemiUpSQL());
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(bemiDownSQL());
  }

}
`;
};

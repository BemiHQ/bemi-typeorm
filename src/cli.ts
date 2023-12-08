#!/usr/bin/env node

import { Command } from "commander";
import { generateMigrationFile } from "./commands/generateMigrateFile";

const program = new Command();

program.name("bemi").description("CLI to Bemi utilities").version("0.1.0");

program
  .command("migration:create <path-to-destination-dir>")
  .description("Create a new TypeORM migration file with Bemi DB triggers")
  .action((pathToMigrationsDir: string) => {
    generateMigrationFile(pathToMigrationsDir);
  });

program.parseAsync(process.argv);

#!/usr/bin/env node

/**
 * This is a script to generate the open source license json for a project.
 * This script is intended to be run by pure node.js from the command line.
 *
 * How to use:
 *
 * Run `node tools/gen-license.js`
 *
 * Alternatively, you can run `npm run gen-license`
 *
 * What it does:
 *
 * - Runs `./gradlew generateLicenseJson` and generates for android libraries.
 * - Reads generated json located in `android/src/main/assets/licenses.json`
 * - Reads installed JavaScript packages
 * - Writes the result
 */

import * as utils from "./utils.js";
import { Command } from "commander";
import path from "path";

const program = new Command();
program.version(process.env.npm_package_version);

program
  .option(
    "-p, --project <directory>",
    "Project directory. Defaults to current directory."
  )
  .option(
    "-a, --androidProject <directory>",
    "Project directory. Defaults to <project>/android"
  )
  .option(
    "-l, --androidLicenseFile <filename>",
    "License file to use for android libraries. Defaults to <androidProject>/src/main/assets/licenses.json"
  )
  .option(
    "-o, --output <filename>",
    "Output file. Defaults to <project>/licenses.json"
  )
  .option("--verbose", "Verbose output");

program.parse(process.argv);

const options = program.opts();
function log(...args) {
  if (options.verbose) {
    console.log(...args);
  }
}

const projectDir = options.project || process.cwd();
const androidProjectDir =
  options.androidProject || path.join(projectDir, "android");
const androidLicenseFile =
  options.androidLicenseFile ||
  path.join(androidProjectDir, "src/main/assets/licenses.json");
const outputFile = options.output || path.join(projectDir, "licenses.json");

log(`Project directory: ${projectDir}`);
log(`Android project directory: ${androidProjectDir}`);
log(`Android license file: ${androidLicenseFile}`);
log(`Output file: ${outputFile}`);

log("Generating licenses...");
utils.generateLicenseJson(androidProjectDir);

log(`Reading licenses from ${androidLicenseFile}`);
const androidLicense = utils.readLicenseJson(androidLicenseFile);
const normalizedAndroidLicense = androidLicense.map((license) =>
  utils.normalizeAndroidLicense(license)
);

log("Reading installed JavaScript packages...");
const nodeLicense = await utils.getInstalledPackages(projectDir);
const normalizedNodeLicense = utils.normalizeNodeLicense(nodeLicense);
const allLicenses = normalizedAndroidLicense.concat(normalizedNodeLicense);

log("Writing licenses to file...");
utils.writeLicenses(allLicenses, outputFile);

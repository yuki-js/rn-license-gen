import fs from "fs";
import path from "path";
import childProcess from "child_process";
import checker from "license-checker";
import { license2spdx } from "./license2spdx.js";
import spdxLicenseList from "spdx-license-list/full.js";
/**
 * Runs `./gradlew generateLicenseJson` and generates json for android libraries.
 *
 * @param {string} androidProjDir - path to the android project
 */
export function generateLicenseJson(androidProjDir) {
  const command = `cd ${androidProjDir} && ./gradlew generateLicenseJson`;
  childProcess.execSync(command, { stdio: "inherit" });
}

/** 
 * LicenseToolsPlugin output type
 * 
 * @typedef {{
 *   artifactId: {
 *     name: string,
 *     group: string,
 *     version: string,
 *   },
 *   normalizedLicense: string,
 *   copyrightStatement: string,
 *   license: string,
 *   licenseUrl: string,
 *   libraryName: string,
 *   url: string
 *   copyrightHolder: string
 * }} LicenseToolsPluginOutput

/**
 * Reads the generated json file
 *  and attach the license content
 *
 * @param {string} filePath - The path to the json file.
 * @returns {Array<LicenseToolsPluginOutput>}
 */
export function readLicenseJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8")).libraries;
}

/**
 * Get license text file
 *
 * @param {string} license - The license name
 * @returns {string}
 */
export function getLicenseText(license) {
  const spdx = license2spdx[license];
  if (spdx in spdxLicenseList) {
    // is a valid SPDX license
    return spdxLicenseList[spdx].licenseText;
  } else {
    // is a custom license
    const licensePath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      `./templates/${spdx}.txt`
    );
    return fs.readFileSync(licensePath, "utf8");
  }
}

/**
 * license-checker output type
 * 
 * @typedef {{
 *   [pkg:string]: {
 *     licenses: string,
 *     licenseFile: string,
 *     publisher: string,
 *     repository: string,
 *   }
 * }} LicenseCheckerOutput

/**
 * Retrieves the installed JavaScript packages
 * and returns the json object.
 *
 * @param {string} projectPath - The directory path that `package.json` is in.
 * @returns {Promise<LicenseCheckerOutput>}
 */
export const getInstalledPackages = (projDir) =>
  new Promise((resolve, reject) => {
    checker.init(
      {
        start: projDir,
      },
      function (err, packages) {
        if (err) {
          reject(err);
        } else {
          resolve(packages);
        }
      }
    );
  });

/**
 * normalized license type
 *
 * @typedef {{
 *  name: string,
 *  url: string,
 *  license: string,
 *  copyrightHolder: string
 *  licenseText: string
 * }} NormalizedLicense
 */

/**
 * Normalize android license
 *
 * @param {LicenseToolsPluginOutput} license - The licenses object
 * @returns {NormalizedLicense}
 */
export function normalizeAndroidLicense(license) {
  const licenseText = getLicenseText(license.normalizedLicense);
  return {
    name: `${license.artifactId.group}:${license.artifactId.name}:${license.artifactId.version}`,
    url: license.url,
    license: license.normalizedLicense,
    copyrightHolder: license.copyrightHolder,
    licenseText,
  };
}

/**
 * Normalize node license
 *
 * @param {LicenseCheckerOutput} licenses - The licenses object
 * @returns {NormalizedLicense}
 */
export function normalizeNodeLicense(licenses) {
  const ret = [];
  for (const license in licenses) {
    if (!licenses.hasOwnProperty(license)) {
      continue;
    }

    const entity = licenses[license];
    let licenseText;
    if (!entity.licenses) {
      console.warn(`${license} has no license. Skipping...`);

      continue;
    }
    if (entity.licenseFile) {
      licenseText = fs.readFileSync(entity.licenseFile, "utf8");
    } else {
      console.warn(`${license} has no license file. Falling back...`);
      licenseText = getLicenseText(entity.licenses);
    }
    let licenseName;
    if (Array.isArray(entity.licenses)) {
      licenseName = entity.licenses.join(", ");
    } else {
      licenseName = entity.licenses;
    }
    ret.push({
      name: license,
      url: entity.repository,
      license: licenseName,
      copyrightHolder: entity.publisher,
      licenseText,
    });
  }
  return ret;
}

/**
 * Writes Lisenses
 *
 * @param {NormalizedLicense[]} allLicenses - all licenses
 * @param {string} output - The output file
 */
export function writeLicenses(allLicenses, output) {
  fs.writeFileSync(output, JSON.stringify(allLicenses, null, 2));
}

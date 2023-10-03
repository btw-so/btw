// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', error => {
  throw error;
});

// Ensure environment variables are read.
import '../config/env';

import path from 'path';
import fs from 'fs-extra';
import chalk from 'react-dev-utils/chalk';
import webpack from 'webpack';
import bfj from 'bfj';
import checkRequiredFiles from 'react-dev-utils/checkRequiredFiles';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import printHostingInstructions from 'react-dev-utils/printHostingInstructions';
import {
  measureFileSizesBeforeBuild,
  printFileSizesAfterBuild,
} from 'react-dev-utils/FileSizeReporter';
import printBuildError from 'react-dev-utils/printBuildError';
import { checkBrowsers } from 'react-dev-utils/browsersHelper';

import { configFactory } from '../config/webpack.config';
import { paths } from '../config/paths';

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024;
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024;

const isInteractive = process.stdout.isTTY;

// Warn and crash if required files are missing
if (!checkRequiredFiles([paths.appHtml, paths.appIndex])) {
  process.exit(1);
}

const argv = process.argv.slice(2);
const writeStatsJson = argv.includes('--stats');

// Generate configuration
const config = configFactory('production');

// Create the production build and print the deployment instructions.
function build(previousFileSizes) {
  console.log(chalk.cyan('Creating an optimized production build...'));

  const compiler = webpack(config);

  return new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) {
        return reject(error);
      }

      const messages = formatWebpackMessages(
        stats.toJson({ all: false, warnings: true, errors: true }),
      );

      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }

        return reject(new Error(messages.errors.join('\n\n')));
      }

      if (
        process.env.CI &&
        (typeof process.env.CI !== 'string' || process.env.CI.toLowerCase() !== 'false') &&
        messages.warnings.length
      ) {
        console.log(
          chalk.yellow(
            '\nTreating warnings as errors because process.env.CI = true.\n' +
              'Most CI servers set it automatically.\n',
          ),
        );

        return reject(new Error(messages.warnings.join('\n\n')));
      }

      const resolveArguments = {
        stats,
        previousFileSizes,
        warnings: messages.warnings,
      };

      if (writeStatsJson) {
        return bfj
          .write(`${paths.appBuild}/bundle-stats.json`, stats.toJson())
          .then(() => resolve(resolveArguments))
          .catch(error_ => reject(new Error(error_)));
      }

      return resolve(resolveArguments);
    });
  });
}

function copyPublicFolder() {
  fs.copySync(paths.appAssets, paths.appBuild, {
    dereference: true,
    filter: file => ![paths.appHtml].includes(file),
  });
}

checkBrowsers(paths.appPath, isInteractive)
  .then(() => measureFileSizesBeforeBuild(paths.appBuild))
  .then(previousFileSizes => {
    // Remove all content but keep the directory so that
    // if you're in it, you don't end up in Trash
    fs.emptyDirSync(paths.appBuild);
    // Merge with the public folder
    copyPublicFolder();

    // Start the webpack build
    return build(previousFileSizes);
  })
  .then(
    ({ previousFileSizes, stats, warnings }) => {
      if (warnings.length) {
        console.log(chalk.yellow('Compiled with warnings.\n'));
        console.log(warnings.join('\n\n'));
        console.log(
          `\nSearch for the ${chalk.underline(
            chalk.yellow('keywords'),
          )} to learn more about each warning.`,
        );
        console.log(
          `To ignore, add ${chalk.cyan('// eslint-disable-next-line')} to the line before.\n`,
        );
      } else {
        console.log(chalk.green('Compiled successfully.\n'));
      }

      console.log('File sizes after gzip:\n');
      printFileSizesAfterBuild(
        stats,
        previousFileSizes,
        paths.appBuild,
        WARN_AFTER_BUNDLE_GZIP_SIZE,
        WARN_AFTER_CHUNK_GZIP_SIZE,
      );
      console.log();

      const appPackage = require(paths.packageJson);
      const { publicUrl } = paths;
      const { publicPath } = config.output;
      const buildFolder = path.relative(process.cwd(), paths.appBuild);

      printHostingInstructions(appPackage, publicUrl, publicPath, buildFolder);
    },
    error => {
      const tscCompileOnError = process.env.TSC_COMPILE_ON_ERROR === 'true';

      if (tscCompileOnError) {
        console.log(
          chalk.yellow(
            'Compiled with the following type errors (you may want to check these before deploying your app):\n',
          ),
        );
        printBuildError(error);
      } else {
        console.log(chalk.red('Failed to compile.\n'));
        printBuildError(error);
        process.exit(1);
      }
    },
  )
  .catch(error => {
    if (error && error.message) {
      console.log(error.message);
    }

    process.exit(1);
  });

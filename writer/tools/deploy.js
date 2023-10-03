import { exec } from 'child_process';
import chalk from 'react-dev-utils/chalk';
import publish from './publish';

function deploy() {
  const start = Date.now();

  console.log(chalk.blue('Bundling...'));

  return exec('npm run build', errorBuild => {
    if (errorBuild) {
      console.log(chalk.red(errorBuild));
      process.exit(1);
    }

    console.log(`Bundled in ${(Date.now() - start) / 1000} s`);

    publish();
  });
}

module.exports = deploy;

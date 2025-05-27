const { exec } = require('child_process');
const chalk = require('react-dev-utils/chalk');
const publish = require('./publish');

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

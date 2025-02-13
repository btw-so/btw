#!/usr/bin/env node

import yargs from 'yargs';

import deploy from './deploy';
import publish from './publish';

module.exports = yargs
  .scriptName('tools')
  .usage('$0 <cmd>')
  .command({
    command: 'deploy',
    desc: 'Build the app and publish it',
    handler: deploy,
  })
  .command({
    command: 'publish',
    desc: 'Publish the app',
    handler: publish,
  })
  .demandCommand()
  .help()
  .version(false)
  .strict()
  .fail((message, error, instance) => {
    if (error) {
      throw new Error(error);
    }

    console.log(instance.help());
    process.exit(1);
  }).argv;

#!/usr/bin/env node

const yargs = require('yargs');

const deploy = require('./deploy');
const publish = require('./publish');

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

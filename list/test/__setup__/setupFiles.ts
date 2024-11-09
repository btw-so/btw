process.env.PUBLIC_URL = '';

const consoleError = console.error;

console.error = jest.fn(error => {
  const message = error instanceof Error ? error.message : error;
  const skipMessages = ['Invalid transition: rotate'];
  let shouldSkip = false;

  skipMessages.forEach(s => {
    if (message.includes(s)) {
      shouldSkip = true;
    }
  });

  if (!shouldSkip) {
    consoleError(error);
  }
});

process.on('uncaughtException', error => {
  console.error(`${new Date().toUTCString()} uncaughtException:`, error.message);
  console.error(error.stack);
});

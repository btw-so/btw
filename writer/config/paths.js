const fs = require('fs');
const path = require('path');
const getPublicUrlOrPath = require('react-dev-utils/getPublicUrlOrPath');

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

const publicUrlOrPath = getPublicUrlOrPath(
  process.env.NODE_ENV === 'development',
  require(resolveApp('package.json')).homepage,
  process.env.PUBLIC_URL,
);

const moduleFileExtensions = [
  'web.mjs',
  'mjs',
  'web.js',
  'js',
  'web.ts',
  'ts',
  'web.tsx',
  'tsx',
  'json',
  'web.jsx',
  'jsx',
];

// Resolve file paths in the same order as webpack
const resolveModule = (resolveFn, filePath) => {
  const extension = moduleFileExtensions.find(d => fs.existsSync(resolveFn(`${filePath}.${d}`)));

  if (extension) {
    return resolveFn(`${filePath}.${extension}`);
  }

  return resolveFn(`${filePath}.js`);
};

module.exports = {
  appPath: resolveApp('.'),
  appAssets: resolveApp('assets'),
  appBuild: resolveApp('build'),
  appHtml: resolveApp('assets/index.html'),
  appIndex: resolveModule(resolveApp, 'src/index'),
  appSrc: resolveApp('src'),
  appTsConfig: resolveApp('tsconfig.json'),
  config: resolveApp('config'),
  dotenv: resolveApp('.env'),
  nodeModules: resolveApp('node_modules'),
  packageJson: resolveApp('package.json'),
  publicUrlOrPath,
  swSrc: resolveModule(resolveApp, 'src/service-worker'),
  test: resolveApp('test'),
  webpackCache: resolveApp('node_modules/.cache'),
};

module.exports.moduleFileExtensions = moduleFileExtensions;

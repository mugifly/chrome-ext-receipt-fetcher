import type { Configuration } from 'webpack';

module.exports = {
  entry: {
    'content-script': { import: 'src/content-script.ts', runtime: false },
    'background-script': { import: 'src/background-script.ts', runtime: false },
  },
} as Configuration;

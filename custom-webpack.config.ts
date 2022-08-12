import type { Configuration } from 'webpack';

module.exports = {
  entry: {
    'content-script': { import: 'src/content-script.ts', runtime: false },
  },
} as Configuration;

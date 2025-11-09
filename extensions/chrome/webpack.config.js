const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: argv.mode || 'development',
    devtool: isProduction ? false : 'cheap-module-source-map',
    entry: {
      tracker: './src/tracker.js',
      app: './src/app.js',
      options: './src/options.js',
      'theme-init': './src/theme-init.js'
    },
    resolve: {
      extensions: ['.js']
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].bundle.js',
      clean: true
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' },
          { from: 'public/app.html', to: 'app.html' },
          { from: 'public/options.html', to: 'options.html' },
          { from: 'public/icons', to: 'icons' },
          { from: 'public/styles', to: 'styles' }
        ]
      })
    ],
    optimization: {
      minimize: isProduction
    }
  };
};

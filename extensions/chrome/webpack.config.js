const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: argv.mode || 'development',
    devtool: isProduction ? false : 'cheap-module-source-map',
    entry: {
      tracker: './tracker.js',
      app: './src/app.js',
      options: './src/options.js'
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
          { from: 'app.html', to: 'app.html' },
          { from: 'options.html', to: 'options.html' },
          { from: 'theme-init.js', to: 'theme-init.js' },
          { from: 'icons', to: 'icons' },
          { from: 'styles', to: 'styles' }
        ]
      })
    ],
    optimization: {
      minimize: isProduction
    }
  };
};

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
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
        { from: 'icons', to: 'icons' }
      ]
    })
  ],
  optimization: {
    minimize: false
  }
};

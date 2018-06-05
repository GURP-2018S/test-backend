const path = require('path');

module.exports = {
  entry: './src/index.ts',
  devtool: 'inline-source-map',

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
    alias: {
      "selianize": path.resolve(__dirname, "modules/selenium-ide/packages/selianize")
    }
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
};

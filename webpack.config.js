const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/index.js',
  target: 'node',
  externals: [nodeExternals()],
  output: {
    path: path.join(__dirname, '/lib'),
    filename: 'index.js',
    library: '@accounts/meteor-adapter',
    libraryTarget: 'umd',
  },
  modulesDirectories: [
    'src',
  ],
  devtool: 'source-map',
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        query: {
          babelrc: false,
          presets: ['es2015', 'stage-0'],
          plugins: [
            'transform-runtime',
          ]
        }
      },
    ],
  },
};

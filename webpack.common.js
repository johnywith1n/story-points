const path = require('path');

module.exports = {
  entry: {
    app: [
      './src/browser/js/app.js'
    ],
  },
  output: {
    path: __dirname + '/src/browser/dist',
    filename: '[name].bundle.js',
    sourceMapFilename: '[file].map'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: {
          cacheDirectory: true
        },
        include: [
          path.resolve(__dirname, 'src/browser/js')
        ],
        exclude: path.resolve(__dirname, 'node_modules')
      }
    ]
  },
  resolve: {
    modules: [
      path.join(__dirname, 'src/browser/js'),
      'node_modules'
    ]
  }
};

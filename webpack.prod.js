const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const UglyifyJSPlugin = require('uglifyjs-webpack-plugin');
const common = require('./webpack.common');
const MiniCSSExtractPlugin = require('mini-css-extract-plugin');

module.exports = merge(common, {
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCSSExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: true,
              localIdentName: '[local]_[hash:base64:5]',
              sourceMap: false
            }
          }
        ],
        include:[
          path.resolve(__dirname, 'src/browser/js')
        ],
        exclude: path.resolve(__dirname, 'node_modules')
      },
      {
        test: /\.css$/,
        use: [
          MiniCSSExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: false
            }
          }
        ],
        include:[
          path.resolve(__dirname, 'node_modules/bootstrap')
        ],
        exclude: /node_modules\/(?!(bootstrap)\/).*/
      }
    ]
  },
  plugins: [
    new MiniCSSExtractPlugin({
      filename: '[name]-styles.css',
    }),
    new UglyifyJSPlugin({
      sourceMap: true,
      parallel: true,
      cache: true
    }),
    new webpack.SourceMapDevToolPlugin({
      append: '\n//# sourceMappingURL=http://localhost:3010/src/browser/dist/[url]',
      filename: '[file].map',
      exclude: /node_modules\/(?!(bootstrap)\/).*/
    })
  ]
});

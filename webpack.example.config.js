const path = require('path');
const HtmlPlugin = require('html-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = (env = {}) => {
  return {
    entry: path.resolve('example', 'index.js'),

    output: {
      path: path.resolve(__dirname, 'example', 'build'),
      publicPath: '/',
      filename: '[name].js'
    },

    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader'
        },
        {
          test: /\.css$/,
          exclude: /node_modules/,
          use: [
            'style-loader',
            'css-loader'
          ]
        }
      ].filter(Boolean)
    },

    plugins: [
      new HtmlPlugin({
        template: './example/index.html',
        filename: 'index.html'
      }),
      new NodePolyfillPlugin(),
    ],

    mode: 'development',

    optimization: {
      emitOnErrors: false
    },

    target: 'web',

    devtool: 'eval',

    devServer: {
      host: '0.0.0.0',
      port: 3080,
      historyApiFallback: true,
      hot: true
    }
  };
};

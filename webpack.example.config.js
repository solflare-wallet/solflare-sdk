const path = require('path');
const HtmlPlugin = require('html-webpack-plugin');

module.exports = (env = {}) => {
  return {
    entry: path.resolve('example', 'index.js'),

    output: {
      path: path.resolve(__dirname, 'example', 'build'),
      publicPath: '/',
      filename: '[name].js'
    },

    node: {
      fs: 'empty'
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
    ],

    mode: 'development',

    optimization: {
      namedModules: true,
      noEmitOnErrors: true
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

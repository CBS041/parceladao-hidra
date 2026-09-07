const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    liveReload: true,
    hot: true,
    open: true,
    proxy: [
      {
        context: ['/api', '/uploads'],
        target: 'http://localhost:3001',
      },
    ],
    static: ['./'],
  },
});

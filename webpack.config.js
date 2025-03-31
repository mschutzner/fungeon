const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/main.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(vert|frag)$/,
        type: 'asset/source'
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.vert', '.frag'],
    // Add fallbacks for Node.js modules that aren't available in browsers
    fallback: {
      fs: false,
      path: false
    }
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public'),
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 9000,
    // Automatically find an available port if 9000 is in use
    port: process.env.PORT || 9000,
    allowedHosts: 'all',
    // Add hot module replacement for better development experience
    hot: true,
    // Provide fallback port option
    onListening: function(devServer) {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      const port = devServer.server.address().port;
      console.log('Listening on port:', port);
    }
  },
}; 
export default {
  mode: 'development',
  entry: [
    './test/test.ts',
    './test/test-babel.js'
  ],
  output: {
    filename: 'test.build.js'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules|vue\/src/,
        loader: 'ts-loader'
      },
      {
        test: /\.js$/,
        exclude: /node_modules|vue\/src/,
        loader: 'babel-loader'
      }
    ]
  }
};

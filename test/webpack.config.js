import {dirname, join} from 'path';
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  mode: 'development',
  entry: [
    './test/test.ts',
    './test/test-babel.js'
  ],
  output: {
    path: join(__dirname, './'),
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

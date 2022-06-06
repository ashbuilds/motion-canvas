#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import {fileURLToPath} from 'url';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import meow from 'meow';

const cli = meow({
  importMeta: import.meta,
  flags: {
    ui: {
      type: 'boolean',
      default: false,
    },
    output: {
      type: 'string',
      alias: 'o',
      default: 'output',
    },
  },
});

const projectFile = path.resolve(process.cwd(), cli.input[0]);
const renderOutput = path.resolve(process.cwd(), cli.flags.output);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compiler = webpack({
  entry: cli.flags.ui
    ? {
        index: projectFile,
        ui: path.resolve(__dirname, '../../ui/src/index.ts'),
      }
    : {
        index: projectFile,
      },
  mode: 'development',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          {loader: 'style-loader'},
          {loader: 'css-loader', options: {modules: true}},
          {loader: 'sass-loader'},
        ],
      },
      {
        test: /\.tsx?$/,
        include: path.resolve(__dirname, '../../ui/'),
        loader: 'ts-loader',
        options: {
          configFile: path.resolve(__dirname, '../../ui/tsconfig.json'),
          instance: 'ui',
        },
      },
      {
        test: /\.tsx?$/,
        exclude: path.resolve(__dirname, '../../ui/'),
        loader: 'ts-loader',
        options: {
          instance: 'project',
        },
      },
      {
        test: /\.glsl$/i,
        type: 'asset/source',
      },
      {
        test: /\.mp4/i,
        type: 'asset',
      },
      {
        test: /\.wav$/i,
        type: 'asset',
      },
      {
        test: /\.csv$/,
        loader: 'csv-loader',
        options: {
          dynamicTyping: true,
          header: true,
          skipEmptyLines: true,
        },
      },
      {
        test: /\.label$/i,
        use: [
          {
            loader: 'label-loader',
          },
        ],
      },
      {
        test: /\.anim$/i,
        use: [
          {
            loader: 'animation-loader',
          },
        ],
      },
      {
        test: /\.png$/i,
        use: [
          {
            loader: 'sprite-loader',
          },
        ],
      },
    ],
  },
  resolveLoader: {
    modules: [
      'node_modules',
      path.resolve(__dirname, '../node_modules'),
      path.resolve(__dirname, './loaders'),
    ],
  },
  resolve: {
    modules: ['node_modules', path.resolve(__dirname, '../node_modules')],
    extensions: ['.js', '.ts', '.tsx'],
    alias: {
      MC: path.resolve(__dirname, '../src'),
      '@motion-canvas/core': path.resolve(__dirname, '../src'),
    },
  },
  optimization: {
    runtimeChunk: {
      name: 'runtime',
    },
  },
  output: {
    filename: `[name].js`,
    path: __dirname,
    uniqueName: 'motion-canvas',
  },
  experiments: {
    topLevelAwait: true,
  },
  plugins: [
    new webpack.ProvidePlugin({
      // Required to load additional languages for Prism
      Prism: 'prismjs',
    }),
  ],
});

const server = new WebpackDevServer(
  {
    static: path.resolve(__dirname, '../public'),
    compress: true,
    port: 9000,
    hot: true,
    setupMiddlewares: (middlewares, devServer) => {
      middlewares.unshift({
        name: 'render',
        path: '/render/:name',
        middleware: (req, res) => {
          const stream = fs.createWriteStream(
            path.join(renderOutput, req.params.name),
            {encoding: 'base64'},
          );
          req.pipe(stream);
          req.on('end', () => res.end());
        },
      });

      return middlewares;
    },
  },
  compiler,
);
server.start().catch(console.error);

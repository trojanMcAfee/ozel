const webpack = require('webpack')
const path = require('path')


const isVendorModule = (module) => {
    // returns true for everything in node_modules
    return module.context && module.context.indexOf('node_modules') !== -1;
}

const config = {
    entry: [
        'babel-polyfill',
        './src/app.js'
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        extensions: ['.js', '.jsx', '.js.jsx']
    },
    module: {
        loaders: [
            { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/ },
            { test: /\.jsx$/, loader: 'babel-loader', exclude: /node_modules/ }
        ]
    },
    plugins: [
        // Seperate vendor code into a seperate file
        new webpack.optimize.CommonsChunkPlugin({
            name: 'vendor',
            minChunks: isVendorModule
        }),
        new webpack.optimize.CommonsChunkPlugin({
            name: 'manifest'
        }),
        new webpack.SourceMapDevToolPlugin({
            filename: "[file].map",
            exclude: ["vendor.js"]
        })
    ]
}

module.exports = config
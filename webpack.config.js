const path = require('path');
const webpack = require('webpack');

module.exports = [
    // Extension config (unchanged)
    {
        target: 'node',
        mode: 'development',
        entry: './src/extension.ts',
        output: {
            path: path.resolve(__dirname, 'out'),
            filename: 'extension.js',
            libraryTarget: 'commonjs2'
        },
        externals: {
            vscode: 'commonjs vscode',
            '@tripsnek/tmf': 'commonjs @tripsnek/tmf'
        },
        resolve: {
            extensions: ['.ts', '.js']
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    use: 'ts-loader'
                }
            ]
        },
        devtool: 'source-map'
    },
    // Webview config - only replace the problematic parts
    {
        target: 'web',
        mode: 'development',
        entry: './src/webview/ecoreEditorApp.ts',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'webview.js'
        },
        resolve: {
            extensions: ['.ts', '.js'],
            // Don't redirect the entire TMF package, just the problematic modules
            alias: {
                // Map Node.js built-ins to false
                'fs': false,
                'path': false,
            }
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    use: 'ts-loader'
                }
            ]
        },
        devtool: 'source-map'
    }
];
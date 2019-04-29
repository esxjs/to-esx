'use strict'
const { SourceTextModule } = require('vm')

const check = (source) => new SourceTextModule(source)

module.exports = check

// this module is required via an -r flag in NODE_OPTIONS in package.json
// for testing in order to circumvent the `esm` loaders
// blocking of the `vm.SourceTextModule` method. (`esm` is loaded via `tap`)

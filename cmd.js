#!/usr/bin/env node
'use strict'
const fs = require('fs')
const convert = require('.')
const [,, filename] = process.argv

const content = fs.readFileSync(filename).toString()

console.log(convert(content))

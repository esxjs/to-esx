'use strict'
const { test, only } = require('tap')
const toEsx = require('..')
const check = require('./check')
const convert = (source) => {
  const result = toEsx(source)
  // check(result)
  return result
}
test.only = only

test('empty files are left unmodified', async ({ is }) => {
  is(convert(``), ``)
})

test('includes if react is loaded', async ({is}) => {
  is(convert(`import React from 'react'`), `const esx = require('esx')()\nimport React from 'react'`)
  is(convert(`const React = require('react')`), `const esx = require('esx')()\nconst React = require('react')`)
  is(convert(`import React from 'react';`), `const esx = require('esx')();\nimport React from 'react';`)
  is(convert(`const React = require('react');`), `const esx = require('esx')();\nconst React = require('react');`)
})

test('includes if react-dom/server is loaded', async ({is}) => {
  is(convert(`import ReactDomServer from 'react-dom/server'`), `const esx = require('esx')()\nimport ReactDomServer from 'react-dom/server'`)
  is(convert(`const ReactDomServer = require('react-dom/server')`), `const esx = require('esx')()\nconst ReactDomServer = require('react-dom/server')`)
})

test('does not include unless react or react-dom/server are loaded', async ({is}) => {
  is(convert(`'use strict'`), `'use strict'`)
  is(convert(`'use strict';`), `'use strict';`)
})

test('JSX basic', async ({is}) => {
  const src = [
    `const React = require('react')`,
    'module.exports = () => (<div><p>hi</p></div>)'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('JSX basic - semi-colons', async ({is}) => {
  const src = [
    `const React = require('react');`,
    'module.exports = () => (<div><p>hi</p></div>);'
  ].join('\n')
  const esx = [
    `const esx = require('esx')();`,
    `const React = require('react');`,
    'module.exports = () => esx `<div><p>hi</p></div>`;',
  ].join('\n')
  is(convert(src), esx)
})

test('JSX basic - no parens', async ({is}) => {
  const src = [
    `const React = require('react')`,
    'module.exports = () => <div><p>hi</p></div>'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('JSX basic - no parens, semi-colons', async ({is}) => {
  const src = [
    `const React = require('react');`,
    'module.exports = () => <div><p>hi</p></div>;'
  ].join('\n')
  const esx = [
    `const esx = require('esx')();`,
    `const React = require('react');`,
    'module.exports = () => esx `<div><p>hi</p></div>`;',
  ].join('\n')
  is(convert(src), esx)
})

test('JSX basic - multiline', async ({is}) => {
  const src = [
    `const React = require('react')`,
    'module.exports = () => (',
    '  <div><p>hi</p></div>',
    ')'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `',
    '  <div><p>hi</p></div>',
    '`'
  ].join('\n')
  is(convert(src), esx)
})

test('JSX basic - multiline, semi-colon', async ({is}) => {
  const src = [
    `const React = require('react');`,
    'module.exports = () => (',
    '  <div><p>hi</p></div>',
    ');'
  ].join('\n')
  const esx = [
    `const esx = require('esx')();`,
    `const React = require('react');`,
    'module.exports = () => esx `',
    '  <div><p>hi</p></div>',
    '`;'
  ].join('\n')
  is(convert(src), esx)
})

test('JSX child expression', async ({is}) => {
  const src = [
    `const React = require('react')`,
    'module.exports = () => (<div>{42}</div>)'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<div>${42}</div>`'
  ].join('\n')
  is(convert(src), esx)
})

test('JSX attr expression', async ({is}) => {
  const src = [
    `const React = require('react')`,
    'module.exports = () => (<div attr={42}></div>)'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<div attr=${42}></div>`'
  ].join('\n')
  is(convert(src), esx)
})

test('JSX attr spread props', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const props = {a:1, b:2}`,
    'module.exports = () => (<div {...props}></div>)'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const props = {a:1, b:2}`,
    'module.exports = () => esx `<div ...${props}></div>`'
  ].join('\n')
  is(convert(src), esx)
})

test('JSX component registration – function', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const Foo = require('./foo')`,
    'module.exports = () => (<div><Foo>hi</Foo></div>)'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const Foo = require('./foo')`,
    'esx.register({ Foo })',
    'module.exports = () => esx `<div><Foo>hi</Foo></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('JSX registration of components via member expression', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {Foo: require('./foo')}`,
    'module.exports = () => (<div><o.Foo>hi</o.Foo></div>)'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {Foo: require('./foo')}`,
    `esx.register({ "o.Foo": o.Foo })`,
    'module.exports = () => esx `<div><o.Foo>hi</o.Foo></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('JSX registration of components via member expression multilevel', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {x: { Foo: require('./foo')}}`,
    'module.exports = () => (<div><o.x.Foo>hi</o.x.Foo></div>)'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {x: { Foo: require('./foo')}}`,
    `esx.register({ "o.x.Foo": o.x.Foo })`,
    'module.exports = () => esx `<div><o.x.Foo>hi</o.x.Foo></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('JSX multiple levels of component registration', async ({is}) => {
  const src = [
    `const lib = require('./lib')`,
    `const React = require('react')`,
    'const Bar = ({children}) => (<div>{children}</div>)',
    'const Foo = ({val}) => (<Bar>{val}</Bar>)',
    'module.exports = (props) => (<div><Foo val={props.val}/></div>)',
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const lib = require('./lib')`,
    `const React = require('react')`,
    'const Bar = ({children}) => esx `<div>${children}</div>`',
    'esx.register({ Bar })',
    'const Foo = ({val}) => esx `<Bar>${val}</Bar>`',
    'esx.register({ Foo })',
    'module.exports = (props) => esx `<div><Foo val=${props.val}/></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('JSX multiple levels of component registration (import)', async ({is}) => {
  const src = [
    `import lib from 'lib'`,
    `import React from 'react'`,
    'const Bar = ({children}) => (<div>{children}</div>)',
    'const Foo = ({val}) => (<Bar>{val}</Bar>)',
    'module.exports = (props) => (<div><Foo val={props.val}/></div>)',
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `import lib from 'lib'`,
    `import React from 'react'`,
    'const Bar = ({children}) => esx `<div>${children}</div>`',
    'esx.register({ Bar })',
    'const Foo = ({val}) => esx `<Bar>${val}</Bar>`',
    'esx.register({ Foo })',
    'module.exports = (props) => esx `<div><Foo val=${props.val}/></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('JSX inlined interpolated template string expression', async ({is}) => {
  const src = [
    `const React = require('react')`,
    'module.exports = () => (<div attr={`${4}${2}`}></div>)'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<div attr=${`${4}${2}`}></div>`'
  ].join('\n')
  is(convert(src), esx)
})

test('JSX fragment', async ({ is }) => {
  const src = [
    `const { createElement } = require('react')`,
    `const App = () => (<>`,
    `  <div>hi</div>`,
    `  <div>hi2</div>`,
    `</>)`,
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const { createElement } = require('react')`,
    'const App = () => esx `<>',
    '  <div>hi</div>',
    '  <div>hi2</div>',
    '</>`'
  ].join('\n')
  is(convert(src), esx)
})

test('createElement minimum basic', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `React.createElement('div', null, React.createElement('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement var assignment basic', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const el = React.createElement('div', null, React.createElement('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'const el = esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement property assignment basic', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const els = {}`,
    `els.el = React.createElement('div', null, React.createElement('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const els = {}`,
    'els.el = esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement pure function basic', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `module.exports = () => React.createElement('div', null, React.createElement('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement  basic - semi-colons', async ({is}) => {
  const src = [
    `const React = require('react');`,
    `module.exports = () => React.createElement('div', null, React.createElement('p', null, 'hi'));`
  ].join('\n')
  const esx = [
    `const esx = require('esx')();`,
    `const React = require('react');`,
    'module.exports = () => esx `<div><p>hi</p></div>`;',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement self closing / zero children', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `module.exports = () => React.createElement('img')`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<img/>`'
  ].join('\n')
  is(convert(src), esx)
})

test('createElement hardcoded props', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `module.exports = () => React.createElement('img', {a: 42, b: 'test'})`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<img a="42" b="test"/>`'
  ].join('\n')
  is(convert(src), esx)
})

test('createElement literal key props', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `module.exports = () => React.createElement('img', {"a-b": 42, "b": 'test'})`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<img a-b="42" b="test"/>`'
  ].join('\n')
  is(convert(src), esx)
})

test('createElement hardcoded boolean props', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `module.exports = () => React.createElement('img', {attr: true})`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<img attr=${true}/>`'
  ].join('\n')
  is(convert(src), esx)
})

test('createElement referenced props variable', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const val = 42`,
    `module.exports = () => React.createElement('img', {attr: val})`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const val = 42`,
    'module.exports = () => esx `<img attr=${val}/>`'
  ].join('\n')
  is(convert(src), esx)
})

test('createElement referenced props property accessor', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `module.exports = (props) => React.createElement('img', {attr: props.val})`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = (props) => esx `<img attr=${props.val}/>`'
  ].join('\n')
  is(convert(src), esx)
})

test('createElement referenced props object, param reference', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `module.exports = (props) => React.createElement('img', props)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = (props) => esx `<img ...${props}/>`'
  ].join('\n')
  is(convert(src), esx)
})

test('createElement referenced props object from property accessor', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `module.exports = (props) => React.createElement('img', props.data)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = (props) => esx `<img ...${props.data}/>`'
  ].join('\n')
  is(convert(src), esx)
})

test('createElement referenced props object from function call', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const getProps = () => { return {a: 1} }`,
    `module.exports = () => React.createElement('img', getProps())`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const getProps = () => { return {a: 1} }`,
    'module.exports = () => esx `<img ...${getProps()}/>`'
  ].join('\n')
  is(convert(src), esx)
})

test('createElement referenced children as param', async ({is}) => {
  const src = [
    `const React = require('react')`,
    'const val = 42',
    `module.exports = () => React.createElement('div', null, val)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'const val = 42',
    'module.exports = () => esx `<div>${val}</div>`'
  ].join('\n')
  is(convert(src), esx)
})

test('createElement referenced children as prop', async ({is}) => {
  const src = [
    `const React = require('react')`,
    'const val = 42',
    `module.exports = () => React.createElement('div', {children: val})`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'const val = 42',
    'module.exports = () => esx `<div children=${val}/>`'
  ].join('\n')
  is(convert(src), esx)
})

test('createElement component registration', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const Foo = require('./foo')`,
    `module.exports = () => React.createElement('div', null, React.createElement(Foo, null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const Foo = require('./foo')`,
    'esx.register({ Foo })',
    'module.exports = () => esx `<div><Foo>hi</Foo></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement component registration - non-PascalCase tag', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const foo = require('./foo')`,
    `module.exports = () => React.createElement('div', null, React.createElement(foo, null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const foo = require('./foo')`,
    'esx.register({ "$foo": foo })',
    'module.exports = () => esx `<div><$foo>hi</$foo></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement registration of components via member expression', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {Foo: require('./foo')}`,
    `module.exports = () => React.createElement('div', null, React.createElement(o.Foo, null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {Foo: require('./foo')}`,
    `esx.register({ "o.Foo": o.Foo })`,
    'module.exports = () => esx `<div><o.Foo>hi</o.Foo></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement registration of components via member expression, lowercase property', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {foo: require('./foo')}`,
    `module.exports = () => React.createElement('div', null, React.createElement(o.foo, null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {foo: require('./foo')}`,
    `esx.register({ "o.$foo": o.foo })`,
    'module.exports = () => esx `<div><o.$foo>hi</o.$foo></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement registration of components via member expression multilevel', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {x: { Foo: require('./foo')}}`,
    `module.exports = () => React.createElement('div', null, React.createElement(o.x.Foo, null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {x: { Foo: require('./foo')}}`,
    `esx.register({ "o.x.Foo": o.x.Foo })`,
    'module.exports = () => esx `<div><o.x.Foo>hi</o.x.Foo></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement registration of components via member expression multilevel, lowercase property', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {x: { foo: require('./foo')}}`,
    `module.exports = () => React.createElement('div', null, React.createElement(o.x.foo, null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {x: { foo: require('./foo')}}`,
    `esx.register({ "o.x.$foo": o.x.foo })`,
    'module.exports = () => esx `<div><o.x.$foo>hi</o.x.$foo></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement registration of components via member expression (square brackets, single quotes)', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {Foo: require('./foo')}`,
    `module.exports = () => React.createElement('div', null, React.createElement(o['Foo'], null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {Foo: require('./foo')}`,
    `esx.register({ "o['Foo']": o['Foo'] })`,
    'module.exports = () => esx `<div><o[\'Foo\']>hi</o[\'Foo\']></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement registration of components via member expression (square brackets, single quotes), lowercase property', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {foo: require('./foo')}`,
    `module.exports = () => React.createElement('div', null, React.createElement(o['foo'], null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {foo: require('./foo')}`,
    `esx.register({ "o['$foo']": o['foo'] })`,
    'module.exports = () => esx `<div><o[\'$foo\']>hi</o[\'$foo\']></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement registration of components via member expression (square brackets, double quotes)', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {Foo: require('./foo')}`,
    `module.exports = () => React.createElement('div', null, React.createElement(o["Foo"], null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {Foo: require('./foo')}`,
    `esx.register({ "o[\\"Foo\\"]": o["Foo"] })`,
    'module.exports = () => esx `<div><o["Foo"]>hi</o["Foo"]></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement registration of components via member expression (square brackets, double quotes), lowercase prop', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {foo: require('./foo')}`,
    `module.exports = () => React.createElement('div', null, React.createElement(o["foo"], null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {foo: require('./foo')}`,
    `esx.register({ "o[\\"$foo\\"]": o["foo"] })`,
    'module.exports = () => esx `<div><o["$foo"]>hi</o["$foo"]></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement registration of components via member expression (square brackets, backticks)', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {Foo: require('./foo')}`,
    `module.exports = () => React.createElement('div', null, React.createElement(o[\`Foo\`], null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {Foo: require('./foo')}`,
    'esx.register({ "o[`Foo`]": o[`Foo`] })',
    'module.exports = () => esx `<div><o[\\`Foo\\`]>hi</o[\\`Foo\\`]></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement registration of components via member expression (square brackets, backticks), lowercase prop', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {foo: require('./foo')}`,
    `module.exports = () => React.createElement('div', null, React.createElement(o[\`foo\`], null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {foo: require('./foo')}`,
    'esx.register({ "o[`$foo`]": o[`foo`] })',
    'module.exports = () => esx `<div><o[\\`$foo\\`]>hi</o[\\`$foo\\`]></div>`',
  ].join('\n')
  is(convert(src), esx)
})

// test('createElement registration of components via member expression (square brackets, reflection)', async ({is}) => {
//   const src = [
//     `const React = require('react')`,
//     `const o = {Foo: require('./foo')}`,
//     `const Foo = 'Foo'`,
//     `module.exports = () => React.createElement('div', null, React.createElement(o[Foo], null, 'hi'))`
//   ].join('\n')
//   const esx = [
//     `const esx = require('esx')()`,
//     `const React = require('react')`,
//     `const o = {Foo: require('./foo')}`,
//     `const Foo = 'Foo'`,
//     `esx.register({ "o[Foo]": o[Foo] })`,
//     'module.exports = () => esx `<div><o[Foo]>hi</o[Foo]></div>`',
//   ].join('\n')
//   is(convert(src), esx)
// })

// test('createElement registration of components via member expression (square brackets, reflection), lowercase key', async ({is}) => {
//   const src = [
//     `const React = require('react')`,
//     `const o = {Foo: require('./foo')}`,
//     `const foo = 'Foo'`,
//     `module.exports = () => React.createElement('div', null, React.createElement(o[foo], null, 'hi'))`
//   ].join('\n')
//   const esx = [
//     `const esx = require('esx')()`,
//     `const React = require('react')`,
//     `const o = {Foo: require('./foo')}`,
//     `const foo = 'Foo'`,
//     `esx.register({ "o[$foo]": o[foo] })`,
//     'module.exports = () => esx `<div><o[$foo]>hi</o[$foo]></div>`',
//   ].join('\n')
//   is(convert(src), esx)
// })

test('createElement registration of components via member expression multilevel mixed (dot notation and square brackets, single quotes)', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const o = {x: { Foo: require('./foo')}}`,
    `module.exports = () => React.createElement('div', null, React.createElement(o.x['Foo'], null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `const o = {x: { Foo: require('./foo')}}`,
    `esx.register({ "o.x['Foo']": o.x['Foo'] })`,
    'module.exports = () => esx `<div><o.x[\'Foo\']>hi</o.x[\'Foo\']></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement multiple levels of component registration', async ({is}) => {
  const src = [
    `const lib = require('./lib')`,
    `const React = require('react')`,
    'const Bar = ({children}) => React.createElement("div", null, children)',
    'const Foo = ({val}) => React.createElement(Bar, null, val)',
    'module.exports = ({val}) => React.createElement("div", null, React.createElement(Foo, {val}))',
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const lib = require('./lib')`,
    `const React = require('react')`,
    'const Bar = ({children}) => esx `<div>${children}</div>`',
    'esx.register({ Bar })',
    'const Foo = ({val}) => esx `<Bar>${val}</Bar>`',
    'esx.register({ Foo })',
    'module.exports = ({val}) => esx `<div><Foo val=${val}/></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement multiple levels of component registration (import)', async ({is}) => {
  const src = [
    `import lib from 'lib'`,
    `import React from 'react'`,
    'const Bar = ({children}) => React.createElement("div", null, children)',
    'const Foo = ({val}) => React.createElement(Bar, null, val)',
    'module.exports = ({val}) => React.createElement("div", null, React.createElement(Foo, {val}))',
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `import lib from 'lib'`,
    `import React from 'react'`,
    'const Bar = ({children}) => esx `<div>${children}</div>`',
    'esx.register({ Bar })',
    'const Foo = ({val}) => esx `<Bar>${val}</Bar>`',
    'esx.register({ Foo })',
    'module.exports = ({val}) => esx `<div><Foo val=${val}/></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('final newline', async ({is}) => {
  const src = [
    `const React = require('react')`,
    'module.exports = () => (<div attr={42}></div>)',
    ''
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<div attr=${42}></div>`',
    ''
  ].join('\n')
  is(convert(src), esx)
})

test('semi-colons on converted code', async ({is}) => {
  const src = [
    `const React = require('react');`,
    'module.exports = () => (<div attr={42}></div>);',
    ''
  ].join('\n')
  const esx = [
    `const esx = require('esx')();`,
    `const React = require('react');`,
    'module.exports = () => esx `<div attr=${42}></div>`;',
    ''
  ].join('\n')
  is(convert(src), esx)
})

test('newline consistency', async ({is}) => {
  const src = [
    `const React = require('react')`,
    'module.exports = () => (<div attr={42}></div>)',
    `console.log('some code after')`,
    `const el = <div attr={42}></div>`,
    `console.log('some code after')`,
    `;(<div attr={42}></div>)`,
    `console.log('some code after')`,
    `function f () {`,
    '  return (<div attr={42}></div>)',
    `  console.log('some code after')`,
    `}`,
    `function g () {`,
    '  return <div attr={42}></div>',
    `  console.log('some code after')`,
    `}`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<div attr=${42}></div>`',
    `console.log('some code after')`,
    'const el = esx `<div attr=${42}></div>`',
    `console.log('some code after')`,
    ';esx `<div attr=${42}></div>`',
    `console.log('some code after')`,
    `function f () {`,
    '  return esx `<div attr=${42}></div>`',
    `  console.log('some code after')`,
    `}`,
    `function g () {`,
    '  return esx `<div attr=${42}></div>`',
    `  console.log('some code after')`,
    `}`
  ].join('\n')
  is(convert(src), esx)
})

test('esx already required and initialized', async ({is}) => {
  const src = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => (<div><p>hi</p></div>)'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    'module.exports = () => esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('esx already required and initialized, but not at top', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const esx = require('esx')()`,
    'module.exports = () => (<div><p>hi</p></div>)'
  ].join('\n')
  const esx = [
    `const React = require('react')`,
    `const esx = require('esx')()`,
    'module.exports = () => esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('esx already required and initialized, assigned to other var name', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const x = require('esx')()`,
    'module.exports = () => (<div><p>hi</p></div>)'
  ].join('\n')
  const esx = [
    `const React = require('react')`,
    `const x = require('esx')()`,
    'module.exports = () => x `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('esx already required, but separately initialized', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const createEsx = require('esx')`,
    `const esx = createEsx()`,
    'module.exports = () => (<div><p>hi</p></div>)'
  ].join('\n')
  const esx = [
    `const React = require('react')`,
    `const createEsx = require('esx')`,
    `const esx = createEsx()`,
    'module.exports = () => esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('esx imported, and separately initialized', async ({is}) => {
  const src = [
    `import React from 'react'`,
    `import createEsx from 'esx'`,
    `const esx = createEsx()`,
    'module.exports = () => (<div><p>hi</p></div>)'
  ].join('\n')
  const esx = [
    `import React from 'react'`,
    `import createEsx from 'esx'`,
    `const esx = createEsx()`,
    'module.exports = () => esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('esx already required, but not initialized', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `const esx = require('esx')`,
    'module.exports = () => (<div><p>hi</p></div>)'
  ].join('\n')
  const esx = [
    `const React = require('react')`,
    `const esx = require('esx')()`,
    'module.exports = () => esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('esx imported, but not initialized', async ({is}) => {
  const src = [
    `import React from 'react'`,
    `import createEsx from 'esx'`,
    'module.exports = () => (<div><p>hi</p></div>)'
  ].join('\n')
  const esx = [
    `import React from 'react'`,
    `import createEsx from 'esx'`,
    `const esx = createEsx()`,
    'module.exports = () => esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('esx already required and initialized but not assigned', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `require('esx')()`,
    'module.exports = () => (<div><p>hi</p></div>)'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `require('esx')()`,
    'module.exports = () => esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('esx already required but not initialized or assigned', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `require('esx')`,
    'module.exports = () => (<div><p>hi</p></div>)'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `require('esx')`,
    'module.exports = () => esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the React assigned reference - import', async ({is}) => {
  const src = [
    `import unconventional from 'react'`,
    `unconventional.createElement('div', null, unconventional.createElement('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `import unconventional from 'react'`,
    'esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the React assigned reference - require', async ({is}) => {
  const src = [
    `const unconventional = require('react')`,
    `unconventional.createElement('div', null, unconventional.createElement('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const unconventional = require('react')`,
    'esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the React reference reassignment', async ({is}) => {
  const src = [
    `const unconventional = require('react')`,
    `const r = unconventional`,
    `r.createElement('div', null, r.createElement('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const unconventional = require('react')`,
    `const r = unconventional`,
    'esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the createElement reference - deconstruct require', async ({is}) => {
  const src = [
    `const { createElement } = require('react')`,
    `createElement('div', null, createElement('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const { createElement } = require('react')`,
    'esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the createElement reference - deconstruct map require', async ({is}) => {
  const src = [
    `const { createElement: h } = require('react')`,
    `h('div', null, h('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const { createElement: h } = require('react')`,
    'esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the createElement reference - require result property', async ({is}) => {
  const src = [
    `var createElement= require('react').createElement`,
    `createElement('div', null, createElement('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `var createElement= require('react').createElement`,
    'esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the createElement reference - require result property assignment to different name', async ({is}) => {
  const src = [
    `var h = require('react').createElement`,
    `h('div', null, h('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `var h = require('react').createElement`,
    'esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('createElement called directly from function return value', async ({is}) => {
  const src = [
    `require('react').createElement('div')`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    'esx `<div/>`',
  ].join('\n')
  is(convert(src), esx)
})

test('ignores createElement on objects that are not react module', async ({is}) => {
  const src = [
    `const React = require('react')`,
    `document.createElement('div')`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const React = require('react')`,
    `document.createElement('div')`
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the createElement reference - import named export', async ({is}) => {
  const src = [
    `import { createElement } from 'react'`,
    `createElement('div', null, createElement ('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `import { createElement } from 'react'`,
    'esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the createElement reference - import as', async ({is}) => {
  const src = [
    `import { createElement as h } from 'react'`,
    `h('div', null, h('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `import { createElement as h } from 'react'`,
    'esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the createElement reference - reassignment', async ({is}) => {
  const src = [
    `const { createElement } = require('react')`,
    `const h = createElement`,
    `h('div', null, h('p', null, 'hi'))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const { createElement } = require('react')`,
    `const h = createElement`,
    'esx `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('renderToString - jsx passed directly', async ({is}) => {
  const src = [
    `const ReactDomServer = require('react-dom/server')`,
    `const React = require('react')`,
    `ReactDomServer.renderToString(<div><p>hi</p></div>)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const ReactDomServer = require('react-dom/server')`,
    `const React = require('react')`,
    'esx.renderToString `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('renderToString - createElement passed directly', async ({is}) => {
  const src = [
    `const ReactDomServer = require('react-dom/server')`,
    `const React = require('react')`,
    `ReactDomServer.renderToString(React.createElement('div', null, React.createElement('p', null, 'hi')))`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const ReactDomServer = require('react-dom/server')`,
    `const React = require('react')`,
    'esx.renderToString `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the ReactDomServer assigned reference - import', async ({is}) => {
  const src = [
    `import unconventional from 'react-dom/server'`,
    `const React = require('react')`,
    `unconventional.renderToString(<div><p>hi</p></div>)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `import unconventional from 'react-dom/server'`,
    `const React = require('react')`,
    'esx.renderToString `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the ReactDomServer assigned reference - require', async ({is}) => {
  const src = [
    `const unconventional = require('react-dom/server')`,
    `const React = require('react')`,
    `unconventional.renderToString(<div><p>hi</p></div>)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const unconventional = require('react-dom/server')`,
    `const React = require('react')`,
    'esx.renderToString `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks the ReactDomServer reference reassignment', async ({is}) => {
  const src = [
    `const unconventional = require('react-dom/server')`,
    `const React = require('react')`,
    `const r = unconventional`,
    `r.renderToString(<div><p>hi</p></div>)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const unconventional = require('react-dom/server')`,
    `const React = require('react')`,
    `const r = unconventional`,
    'esx.renderToString `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks renderToString ', async ({is}) => {
  const src = [
    `const { renderToString } = require('react-dom/server')`,
    `const React = require('react')`,
    `renderToString(<div><p>hi</p></div>)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const { renderToString } = require('react-dom/server')`,
    `const React = require('react')`,
    'esx.renderToString `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks renderToString reference - deconstruct require', async ({is}) => {
  const src = [
    `const { renderToString } = require('react-dom/server')`,
    `const React = require('react')`,
    `renderToString(<div><p>hi</p></div>)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const { renderToString } = require('react-dom/server')`,
    `const React = require('react')`,
    'esx.renderToString `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks renderToString reference - deconstruct map require', async ({is}) => {
  const src = [
    `const { renderToString: r } = require('react-dom/server')`,
    `const React = require('react')`,
    `r(<div><p>hi</p></div>)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const { renderToString: r } = require('react-dom/server')`,
    `const React = require('react')`,
    'esx.renderToString `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks renderToString reference - require result property', async ({is}) => {
  const src = [
    `var r = require('react-dom/server').renderToString`,
    `const React = require('react')`,
    `r(<div><p>hi</p></div>)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `var r = require('react-dom/server').renderToString`,
    `const React = require('react')`,
    'esx.renderToString `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks renderToString reference - import named export', async ({is}) => {
  const src = [
    `import { renderToString } from 'react-dom/server'`,
    `const React = require('react')`,
    `renderToString(<div><p>hi</p></div>)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `import { renderToString } from 'react-dom/server'`,
    `const React = require('react')`,
    'esx.renderToString `<div><p>hi</p></div>`'
  ].join('\n')
  is(convert(src), esx)
})

test('tracks renderToString reference - import as', async ({is}) => {
  const src = [
    `import { renderToString as r } from 'react-dom/server'`,
    `const React = require('react')`,
    `r(<div><p>hi</p></div>)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `import { renderToString as r } from 'react-dom/server'`,
    `const React = require('react')`,
    'esx.renderToString `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('tracks renderToString reference - reassignment', async ({is}) => {
  const src = [
    `const { renderToString } = require('react-dom/server')`,
    `const r = renderToString`,
    `const React = require('react')`,
    `r(<div><p>hi</p></div>)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const { renderToString } = require('react-dom/server')`,
    `const r = renderToString`,
    `const React = require('react')`,
    'esx.renderToString `<div><p>hi</p></div>`',
  ].join('\n')
  is(convert(src), esx)
})

test('element passed to React.renderToString', async ({is}) => {
  const src = [
    `const { renderToString } = require('react-dom/server')`,
    `const { createElement } = require('react')`,
    `const el = <div><p>hi</p></div>`,
    `renderToString(el)`
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const { renderToString } = require('react-dom/server')`,
    `const { createElement } = require('react')`,
    'const el = esx `<div><p>hi</p></div>`',
    `esx.renderToString(el)`
  ].join('\n')
  is(convert(src), esx)
})

test('babel compatibility - _interopRequireDefault', async ({ is }) => {
  const src = [
    'var _react = _interopRequireDefault(require("react"))',
    'function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj } }',
    'const App = () => _react.default.createElement("svg", {',
    '  xmlns: "http://www.w3.org/2000/svg",',
    '  width: "48",',
    '  height: "48",',
    '  "aria-hidden": "true"',
    '}, _react.default.createElement("title", null, "Menu"))'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    'var _react = _interopRequireDefault(require("react"))',
    'function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj } }',
    'const App = () => esx `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" aria-hidden="true"><title>Menu</title></svg>`'
  ].join('\n')
  is(convert(src), esx)
})

test('babel compatibility - _interopRequireWildcard', async({ is }) => {
  const src = [
    'var _react = _interopRequireWildcard(require("react"))',
    'function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }',
    'const App = () => _react.default.createElement("svg", {',
    '  xmlns: "http://www.w3.org/2000/svg",',
    '  width: "48",',
    '  height: "48",',
    '  "aria-hidden": "true"',
    '}, _react.default.createElement("title", null, "Menu"))'
  ].join('\n')
  const esx = [
    `const esx = require('esx')();`,
    'var _react = _interopRequireWildcard(require("react"))',
    'function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }',
    'const App = () => esx `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" aria-hidden="true"><title>Menu</title></svg>`'
  ].join('\n')
  is(convert(src), esx)
})

test('parenthized expression around createElement', async ( { is }) => {
  const src = [
   `const _react = require('react')`,
  `function App () {`,
  ` return (_react.createElement)('div', null, (_react.createElement)('div'))`,
  `}`,
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const _react = require('react')`,
    `function App () {`,
    ' return esx `<div><div/></div>`',
    `}`,
  ].join('\n')
  is(convert(src), esx)
})

test('parenthized sequence expression around createElement (babel compat)', async ( { is }) => {
  const src = [
   `const _react = require('react')`,
  `function App () {`,
  ` return (0, _react.createElement)('div', null, (0, _react.createElement)('div'))`,
  `}`,
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const _react = require('react')`,
    `function App () {`,
    ' return esx `<div><div/></div>`',
    `}`,
  ].join('\n')
  is(convert(src), esx)
})

test('expression in children', async ( { is }) => {
  const src = [
    `const { createElement } = require('react')`,
   `function App () {`,
   `  return createElement('div', null, b && createElement('div'))`,
   `}`,
   ].join('\n')
   const esx = [
     `const esx = require('esx')()`,
     `const { createElement } = require('react')`,
     `function App () {`,
     '  return esx `<div>${b && esx `<div/>`}</div>`',
     `}`,
   ].join('\n')
   is(convert(src), esx)
})

test('expression in children leading to element with children', async ({ is }) => {
  const src = [
    `const { createElement } = require('react')`,
   `function App () {`,
   `  return createElement('div', null, b && createElement('div', null, createElement('div')))`,
   `}`,
   ].join('\n')
   const esx = [
     `const esx = require('esx')()`,
     `const { createElement } = require('react')`,
     `function App () {`,
     '  return esx `<div>${b && esx `<div><div/></div>`}</div>`',
     `}`,
   ].join('\n')
   is(convert(src), esx)
})

test('component variable assigned within component function', async ({ is }) => {
  const src = [
    `const { createElement } = require('react')`,
    'function App () {',
    '  const SelectedRouter = _exenv.default.canUseDOM ? _reactRouterDom.BrowserRouter : _reactRouter.Router',
    `  return createElement(SelectedRouter, null, 'test')`,
    '}'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const { createElement } = require('react')`,
    'function App () {',
    '  const SelectedRouter = _exenv.default.canUseDOM ? _reactRouterDom.BrowserRouter : _reactRouter.Router',
    '  esx.register({ SelectedRouter })',
    '  return esx `<SelectedRouter>test</SelectedRouter>`',
    '}'
  ].join('\n')
  is(convert(src), esx)
})

test('component variable assigned within nested component function', async ({ is }) => {
  const src = [
    `const { createElement } = require('react')`,
    'function Shell () {',
    '  const App = () => {',
    '    const SelectedRouter = _exenv.default.canUseDOM ? _reactRouterDom.BrowserRouter : _reactRouter.Router',
    `    return createElement(SelectedRouter, null, 'test')`,
    `  }`,
    '}'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const { createElement } = require('react')`,
    'function Shell () {',
    '  const App = () => {',
    '    const SelectedRouter = _exenv.default.canUseDOM ? _reactRouterDom.BrowserRouter : _reactRouter.Router',
    '    esx.register({ SelectedRouter })',
    '    return esx `<SelectedRouter>test</SelectedRouter>`',
    '  }',
    '}'
  ].join('\n')
  is(convert(src), esx)
})

test('component variable assigned above nested component function', async ({ is }) => {
  const src = [
    `const { createElement } = require('react')`,
    'function Shell () {',
    '  const SelectedRouter = _exenv.default.canUseDOM ? _reactRouterDom.BrowserRouter : _reactRouter.Router',
    '  const App = () => {',
    `    return createElement(SelectedRouter, null, 'test')`,
    `  }`,
    '}'
  ].join('\n')
  const esx = [
    `const esx = require('esx')()`,
    `const { createElement } = require('react')`,
    'function Shell () {',
    '  const SelectedRouter = _exenv.default.canUseDOM ? _reactRouterDom.BrowserRouter : _reactRouter.Router',
    '  esx.register({ SelectedRouter })',
    '  const App = () => {',
    '    return esx `<SelectedRouter>test</SelectedRouter>`',
    '  }',
    '}'
  ].join('\n')
  is(convert(src), esx)
})

test('variable assignment with comma operator', async  ({ is }) => {
  const src = [
    `import React from 'react'`,
    `function render() {`,
    `  var _this$props = this.props,`,
    `      Component = _this$props.component,`,
    `      childFactory = _this$props.childFactory,`,
    `      props = _objectWithoutPropertiesLoose(_this$props, ["component", "childFactory"]);`,
    `  return React.createElement(Component, props, children);`,
    `}`
  ].join('\n')
  const esx = [
    `const esx = require('esx')();`,
    `import React from 'react'`,
    `function render() {`,
    `  var _this$props = this.props,`,
    `      Component = _this$props.component,`,
    `      childFactory = _this$props.childFactory,`,
    `      props = _objectWithoutPropertiesLoose(_this$props, ["component", "childFactory"]);`,
    `  esx.register({ Component });`,
    '  return esx `<Component ...${props}>${children}</Component>`;',
    `}`
  ].join('\n')
  is(convert(src), esx)
})

// test('createElement registration of components via call expression', async ({is}) => {
//   const src = [
//     `const React = require('react')`,
//     `module.exports = () => React.createElement('div', null, React.createElement(require('./foo'), null, 'hi'))`
//   ].join('\n')
//   const esx = [
//     `const esx = require('esx')()`,
//     `const React = require('react')`,
//     `esx.register({ "$require('./foo')": require('./foo') })`,
//     'module.exports = () => esx `<div><$require(\'./foo\')>hi</$require(\'./foo\')></div>`',
//   ].join('\n')
//   is(convert(src), esx)
// })

// test('createElement registration of components via call expression with double quotes in param', async ({is}) => {
//   const src = [
//     `const React = require('react')`,
//     `module.exports = () => React.createElement('div', null, React.createElement(require("./foo"), null, 'hi'))`
//   ].join('\n')
//   const esx = [
//     `const esx = require('esx')()`,
//     `const React = require('react')`,
//     `esx.register({ "$require(\\"./foo\\")": require("./foo") })`,
//     'module.exports = () => esx `<div><$require("./foo")>hi</$require("./foo")></div>`',
//   ].join('\n')
//   is(convert(src), esx)
// })

// test('createElement registration of components via member expression of direct call expression return value', async ({is}) => {
//   const src = [
//     `const React = require('react')`,
//     `module.exports = () => React.createElement('div', null, React.createElement(require('./foo').foo, null, 'hi'))`
//   ].join('\n')
//   const esx = [
//     `const esx = require('esx')()`,
//     `const React = require('react')`,
//     `esx.register({ "require('./foo').$foo": require('./foo').foo })`,
//     'module.exports = () => esx `<div><require(\'./foo\').$foo>hi</require(\'./foo\').$foo></div>`',
//   ].join('\n')
//   is(convert(src), esx)
// })
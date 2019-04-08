'use strict'
const { Parser } = require('acorn')
const jsxParser = Parser.extend(require('acorn-jsx')())
const parse = jsxParser.parse.bind(jsxParser)
module.exports = convert

function convert (src) {  
  const chunks = src.split('')
  const ast = parse(src, {allowImportExportEverywhere: true})
  const { body } = ast
  var eol = ''
  var esx = 'esx'
  var included = false
  var initialized = false
  var reactLoaded = false
  const lastLine = chunks[chunks.length - 1] === '\n' ? '\n' : ''
  const components = new Set()
  const references = {
    React: new Set(),
    createElement: new Set([]),
    ReactDomServer: new Set([]),
    renderToString: new Set([])
  }
  walk(ast, null, analyze)
  reactLoaded = reactLoaded || (Object.values(references).reduce((count, set) => {
    return (count + set.size)
  }, 0) > 0)
  if (reactLoaded === false) return src
  walk(ast, null, transform)
  const [ top ] = body
  if (top) {
     if (included === false) { 
       update(top, 
        'directive' in top ? 
          `${source(top)}\nconst ${esx} = require('esx')()${eol}\n` : 
          `const ${esx} = require('esx')()${eol}\n${source(top)}`
      )
    } else if (initialized === false) {
      update(included, `${source(included)}()`)
    }
  }
  return chunks.join('').trim() + (lastLine)

  function analyze (node) {
    const { type, parent, callee } = node
    if (chunks[node.end] === ';') eol = ';'
    if (type === 'ImportDefaultSpecifier') {
      if (parent.source.value === 'esx') {
        included = true
        const ns = findAssignedNamespace(node.local.name)
        if (ns === null) update(parent, `${source(parent)}${eol}\nconst ${esx} = ${node.local.name}()${eol}`)
        else esx = ns
      }
      if (parent.source.value === 'react') {
        references.React.add(node.local.name)
      }
      if (parent.source.value === 'react-dom/server') {
        references.ReactDomServer.add(node.local.name)
      }
    }
    if (type === 'ImportSpecifier') {
      if (parent.source.value === 'react') {
        if (node.imported.name === 'createElement') {
          references.createElement.add(node.local.name)
        }
      }
      if (parent.source.value === 'react-dom/server') {
        if (node.imported.name === 'renderToString') {
          references.renderToString.add(node.local.name)
        }
      }
    }

    if (type === 'CallExpression' && callee.name === 'require') {
      const required = node.arguments[0].value
      if (required === 'react' || required === 'react-dom/server') {
        reactLoaded = true
      }
      if (parent.type === 'CallExpression') {
        const variable = parent.parent
        if (variable.type === 'VariableDeclarator') {
          if (required === 'esx') {
            esx = variable.id.name
            included = variable
            initialized = true
          }
          if (required === 'react') {
            references.React.add(variable.id.name)
          }
          if (required === 'react-dom/server') {
            references.ReactDomServer.add(variable.id.name)
          }
        }
      } else if (parent.type === 'VariableDeclarator') {
        const variable = parent
        if (required === 'esx') {
          included = variable
          if (initialized === false) {
            const ns = findAssignedNamespace(variable.id.name)
            if (ns !== null) {
              initialized = true
              esx = ns
            }
          }
        }
        if (required === 'react') {
          if ('name' in variable.id) { // default export:
            references.React.add(variable.id.name)
          } else if (variable.id.type === 'ObjectPattern') { // deconstructed
            variable.id.properties.forEach(({key, value}) => {
              if (key.name === 'createElement') {
                references.createElement.add(value.name)
              }
            })
          }
        }
        if (required === 'react-dom/server') {
          if ('name' in variable.id) { // default export:
            references.ReactDomServer.add(variable.id.name)
          } else if (variable.id.type === 'ObjectPattern') { // deconstructed
            variable.id.properties.forEach(({key, value}) => {
              if (key.name === 'renderToString') {
                references.renderToString.add(value.name)
              }
            })
          }
        }
      } else if (parent.type === 'MemberExpression') {
        const variable = parent.parent
        if (variable.init) {
          if (variable.init.property.name === 'createElement') {
            references.createElement.add(variable.id.name)
          }
          if (variable.init.property.name === 'renderToString') {
            references.renderToString.add(variable.id.name)
          }
        }
      }
    }

    // reassignment tracking:
    if (type === 'VariableDeclarator') {
      if (node.id && node.id.name && node.init) {
        if (references.React.has(node.init.name)) {
          references.React.add(node.id.name)
        }
        if (references.createElement.has(node.init.name)) {
          references.createElement.add(node.id.name)
        }
        if (references.ReactDomServer.has(node.init.name)) {
          references.ReactDomServer.add(node.id.name)
        }
        if (references.renderToString.has(node.init.name)) {
          references.renderToString.add(node.id.name)
        }
      }
    }
  }

  function findAssignedNamespace (ns) {
    var result = null
    walk(ast, null, (node) => {
      const { type, name, parent } = node 
      if (name === ns && type === 'Identifier' && parent.type === 'CallExpression') {
        result = parent.parent.id.name
      }
    })
    return result
  }

  function jsx (node) {
    const { type, name, parent } = node
    
    if (type === 'JSXElement') {
      const isRoot = parent.type !== 'JSXElement'
      const newline = parent.type === 'VariableDeclarator'
      if (isRoot) {
        if (isRenderToString(parent)) {
          esxBlock(node, newline, '')
          blank(parent.callee.start, parent.callee.end)
        } else {
          esxBlock(node, newline)
          
        }
      }
    }
    if (type === 'JSXIdentifier' && parent.type === 'JSXOpeningElement') {
      if (name[0].toUpperCase() === name[0]) {
        components.add(name)
      }
    }
    if (type === 'JSXMemberExpression' && parent.type === 'JSXOpeningElement') {
      const expr = source(node)
      components.add(`"${expr}": ${expr}`)
    }
    if (type === 'JSXSpreadAttribute') {
      update(node, '...$' + source(node).replace(/\{\s*\.\.\./, '{'))
    }
    if (type === 'JSXExpressionContainer') {
      update(node, '$' + source(node))
    }
  }

  function createElement (node) {
    if (isCreateElement(node) === false) return
    const [tag, props, ...children] = node.arguments
    const sC = children.length === 0
    const isComponent = tag.type !== 'Literal'
    var ref = isComponent ? source(tag) : tag.value
    var isPascalCase = ref[0].toUpperCase() === ref[0]
    var label = escape(ref, '`')
    var mapping = escape(ref, '"')
    var canShorthand = tag.type !== 'MemberExpression' && isPascalCase
    if (isComponent) {
      if (tag.type === 'MemberExpression') {
        var p = tag.property
        while (true) {
          if (!p.property) break
          p = p.property
        }
        const fl = p.name ? p.name[0] : source(p).replace(/^('|`|")/, '')[0]
        isPascalCase = fl[0].toUpperCase() === fl[0]
        if (isPascalCase === false) {
          const offset = /^('|`|")/.test(chunks[p.start]) ? 1 : 0
          chunks[p.start + offset] = '$' + chunks[p.start + offset]
          const sanitize = source(tag)
          label = escape(sanitize, '`')
          mapping = escape(sanitize, '"')
        }
      } else {
        if (isPascalCase === false) {
          mapping = '$' + mapping
          label = '$' + label
        }
      }
      if (canShorthand) components.add(ref)
      else components.add(`"${mapping}": ${ref}`)
    }
    const attributes = props == null || props.type === 'Literal' ? '' : propsToAttributes(props)
    if (props) blank(props.start, props.end)
    blank(node.start, tag.start)
    node.arguments.forEach(({end}, i, self) => {
      if (self[i + 1]) blank(end, self[i + 1].start)
    })
    
    update(tag, `<${label}${attributes ? ` ${attributes}` : ''}${sC ? '/' : ''}>`)
    chunks[node.end - 1] = sC ? '' : `</${label}>`
    if (!sC) children.forEach((child) => {
      if (child.type === 'Literal') update(child, child.value)
      else {
        if (isCreateElement(child) === false) {
          chunks[child.start] = '${' + chunks[child.start]
          chunks[child.end - 1] = chunks[child.end - 1] + '}'
        }
      }
    })
    const isRoot = node.parent.type !== 'CallExpression'
    const isInRenderToString = isRenderToString(node.parent)
    if (isRoot) {
      esxBlock(node, true)
    } else if (isInRenderToString) {
      esxBlock(node, true, '')
      blank(node.parent.callee.start, node.parent.callee.end)
    }
  }

  function esxBlock (node, n = false, tag = esx) {
    const { start, end } = node 
    if (chunks[start - 1] === '(') chunks[start - 1] = tag + ' `'
    else chunks[start] = tag + ' `' + chunks[start]
    if (chunks[end] === ';') chunks[end] = '`;' + (n ? '\n' : '')
    else chunks[end] = '`' + (n ? '\n' : '')
    const registrations = Array.from(components)
    if (registrations.length > 0) {
      let p = node.parent
      let outerScope
      while (p = p.parent) {
        if (p.type === 'Program') break
        outerScope = p
      }
      chunks[outerScope.start] = `${esx}.register({ ${registrations.join(', ')} })${eol}\n${chunks[outerScope.start]}`
      components.clear()
    }
  }

  function isCreateElement (node) {
    const { callee, type } = node
  
    const directCall = type === 'CallExpression' && 
      callee.type === 'MemberExpression' &&
      callee.property && callee.property.name === 'createElement' &&
      callee.object && callee.object.callee &&
      callee.object.callee.name === 'require' &&
      callee.object.arguments && callee.object.arguments[0] && 
      callee.object.arguments[0].value === 'react'

    const methodCall = type === 'CallExpression' && 
      callee.type === 'MemberExpression' && 
      references.React.has(callee.object.name) &&
      callee.property.name === 'createElement'
    
    const functionCall = type === 'CallExpression' 
      && references.createElement.has(callee.name)

    return directCall || methodCall || functionCall
  }
  
  function isRenderToString (node) {
    const { callee, type } = node
  
    const directCall = type === 'CallExpression' && 
      callee.type === 'MemberExpression' &&
      callee.property && callee.property.name === 'renderToString' &&
      callee.object && callee.object.callee &&
      callee.object.callee.name === 'require' &&
      callee.object.arguments && callee.object.arguments[0] && 
      callee.object.arguments[0].value === 'react-dom/server'

    const methodCall = type === 'CallExpression' && 
      callee.type === 'MemberExpression' && 
      references.ReactDomServer.has(callee.object.name) &&
      callee.property.name === 'renderToString'
    
    const functionCall = type === 'CallExpression' 
      && references.renderToString.has(callee.name)

    return directCall || methodCall || functionCall
  }


  function transform (node) {
    jsx(node)
    createElement(node)
    if (isRenderToString(node)) {
      update(node.callee, esx + '.renderToString')
    }
  }

  function source (node) {
    const { start, end } = node
    return chunks.slice(start, end).join('')
  }

  function update (node, str) {
    chunks[node.start] = str
    blank(node.start + 1, node.end)
  }

  function blank (start, end) {
    for (var i = start; i < end; i++) {
      chunks[i] = ''
    }
  }

  function propsToAttributes (props) {
    if (props.type !== 'ObjectExpression') {
      return `...\${${source(props)}}`
    }
    const { properties } = props
    return properties.map(({key, value}) => {
      const v = value.type === 'Literal' && typeof value.value !== 'boolean'
        ? `"${value.value}"`
        : `\${${source(value)}}`
      return `${key.name}=${v}`
    }).join(' ')
  }

  function walk (node, parent, fn) {
    if (node === null) return
    node.parent = parent
    Object.keys(node).forEach((key) => {
        if (key === 'parent') return
        const child = node[key]
        if (Array.isArray(child)) {
          child.forEach((c) => walk(c, node, fn))
        } else if (child && typeof child.type === 'string') {
          walk(child, node, fn)
        }
    })
    fn(node)
  }
}

function escape (str, char = '"') {
  var result = ''
  var last = 0
  var point = 0
  const l = str.length
  const code = char.charCodeAt(0)
  for (var i = 0; i < l; i++) {
    point = str.charCodeAt(i)
    if (point === code) {
      result += str.slice(last, i) + '\\' 
      last = i
    }
  }
  if (last === 0) return str 
  result += str.slice(last)
  return result
}
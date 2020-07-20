'use strict'
const { Parser, Node } = require('acorn')
const jsxParser = Parser.extend(require('acorn-jsx')())
const parse = jsxParser.parse.bind(jsxParser)
const PROPERTIES_RX = /[^.[\]]+|\[(?:(\d+(?:\.\d+)?)((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(\.|\[\])(?:\4|$))/g
module.exports = convert

function convert (src) {
  const chunks = src.split('')
  const ast = parse(src, {
    allowImportExportEverywhere: true,
    preserveParens: true,
    allowHashBang: true
  })
  const { body } = ast
  const [ top ] = body
  const eol = ';'
  var esx = 'esx'
  var included = false
  var initialized = false
  var reactLoaded = false
  const lastLine = chunks[chunks.length - 1] === '\n' ? '\n' : ''
  const components = new Set()
  const mappings = {}
  const references = {
    React: new Set(),
    createElement: new Set(),
    ReactDomServer: new Set(),
    renderToString: new Set()
  }
  const isCreateElement = isserFactory({ key: 'React', mod: 'react', method: 'createElement' })
  const isRenderToString = isserFactory({ key: 'ReactDomServer', mod: 'react-dom/server', method: 'renderToString' })
  walk(ast, null, analyze)
  reactLoaded = reactLoaded || (Object.values(references).reduce((count, set) => {
    return (count + set.size)
  }, 0) > 0)
  if (reactLoaded === false) return src
  walk(ast, null, transform)
  if (top) {
    if (included === false) {
      update(top,
        'directive' in top
          ? `${source(top)}\nconst ${esx} = require('esx')()${eol}\n`
          : `const ${esx} = require('esx')()${eol}\n${source(top)}`
      )
    } else if (initialized === false) {
      update(included, `${source(included)}()`)
    }
  }
  return chunks.join('').trim() + (lastLine)

  function analyze (node) {
    const { type, parent, callee } = node
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
        const isBabel = parent.callee && parent.callee.name === '_interopRequireDefault'
        if (variable.type === 'VariableDeclarator' || isBabel) {
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
            variable.id.properties.forEach(({ key, value }) => {
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
            variable.id.properties.forEach(({ key, value }) => {
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

    if (type === 'JSXElement' || type === 'JSXFragment') {
      const isRoot = parent.type !== 'JSXElement' && parent.type !== 'JSXFragment'
      if (isRoot) {
        if (isRenderToString(parent)) {
          esxBlock(node, '')
          blank(parent.callee.start, parent.callee.end)
        } else {
          esxBlock(node)
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
      mappings[`"${expr}": ${expr}`] = expr
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
      else {
        mappings[`"${mapping}": ${ref}`] = ref
        components.add(`"${mapping}": ${ref}`)
      }
    }
    const attributes = props == null || props.type === 'Literal' ? '' : propsToAttributes(props)
    if (props) blank(props.start, props.end)
    blank(node.start, tag.start)
    node.arguments.forEach(({ end }, i, self) => {
      if (self[i + 1]) blank(end, self[i + 1].start)
    })

    update(tag, `<${label}${attributes ? ` ${attributes}` : ''}${sC ? '/' : ''}>`)
    chunks[node.end - 1] = sC ? '' : `</${label}>`
    if (!sC) {
      children.forEach((child) => {
        if (child.type === 'Literal') update(child, child.value)
        else {
          if (isCreateElement(child) === false) {
            chunks[child.start] = '${' + chunks[child.start]
            chunks[child.end - 1] = chunks[child.end - 1] + '}'
          }
        }
      })
    }
    const isRoot = node.parent.type !== 'CallExpression'
    const isInRenderToString = isRenderToString(node.parent)
    const isFnArg = !isRoot && !isInRenderToString && !isCreateElement(node.parent)
    if (isFnArg || isRoot) {
      esxBlock(node)
    } else if (isInRenderToString) {
      esxBlock(node, '')
      blank(node.parent.callee.start, node.parent.callee.end)
    } else {

    }
  }

  function seek (array, pos, rx) {
    var i = pos - 1
    const end = array.length - 1
    while (i++ < end) {
      if (rx.test(array[i])) return i
    }
    return -1
  }

  function reverseSeek (array, pos, rx) {
    var i = pos
    while (i--) {
      if (rx.test(array[i])) return i
    }
    return -1
  }

  function findArg (params, name) {
    for (const param of params) {
      const found = (param.name === name && param) || (
        param.properties && param.properties.find(function match({value}) {
          if (value.type === 'ObjectPattern') {
            return value.properties.find(match)
          }
          return value.name === name
        })
      )
      if (found) return found
    }
  }

  function hasVar ({id, type}, name) {
    return id.properties
      ? id.properties.find(({ value }) => value.name === name)
      : type === 'VariableDeclarator' && id.name === name
  }

  function esxBlock (node, tag = esx) {
    let { start, end } = node
    const inParens = node.parent.type === 'ParenthesizedExpression'
    if (inParens) {
      chunks[node.parent.start] = ''
      chunks[node.parent.end - 1] = ''
      start = node.parent.start
      end = node.parent.end - 1
    }
    if (node.parent.type === 'CallExpression') {
      if (isRenderToString(node.parent)) {
        chunks[node.parent.start + source(node.parent.callee).length] = ''
        chunks[node.parent.end - 1] = ''
      }
    }
    const matches = new Set()
    var inlineRegistrations = ''
    const rootScopeComponents = []
    if (components.size > 0) {
      let index = 0
      const nodes = []
      const declarations = []
      let lastRootScopeNode = null
      for (const c of components) {
        let p = node
        const ref = mappings[c] || c
        const path = ref.match(PROPERTIES_RX).map((p) => {
          return p.replace(/^['|"|`]|['|"|`]$/g, '')
        }) || []
        do {
          if (p === null) break
          if (p.type === 'BlockStatement' || p.type === 'Program') {
            for (const n of p.body) {
              let found = false
              const [ name ] = path
              if (n.type === 'VariableDeclaration') {
                for (const d of n.declarations) {
                  found = (hasVar(d, name) && n) ||
                    (d.init && d.init.params && findArg(d.init.params, name))

                  if (found) break
                }
              } else if (n.type === 'FunctionDeclaration' && n.params.length) {
                found = findArg(n.params, name)
              }
              if (found) {
                if (!matches.has(ref)) {
                  nodes[index] = found
                  declarations[index] = declarations[index] || []
                  declarations[index].push(c)
                  matches.add(ref)
                }
                break
              }
            }
            if (nodes[index]) index += 1
          }
        } while (p = p.parent)
      }

      for (var i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        const cmps = declarations[i]
        for (const cmp of cmps) {
          if (node.parent.type !== 'Program') {
            inlineRegistrations += /:/.test(cmp) ?
              `._r(${cmp.replace(':', ',')})` :
              `._r("${cmp}", ${cmp})`
          } else {
            if (lastRootScopeNode) {
              if (node.end > lastRootScopeNode.end) {
                lastRootScopeNode = node
                rootScopeComponents.push(cmp)
              } else {
                rootScopeComponents.unshift(cmp)
              }
            } else {
              lastRootScopeNode = node
              rootScopeComponents.unshift(cmp)
            }
          }
        }
      }
      if (lastRootScopeNode) {
        const { end } = lastRootScopeNode
        const pos = end - 1
        if (chunks[end] === '\n') chunks[pos] += '\n'
        chunks[pos] += `esx.register({ ${rootScopeComponents.join(', ')} })`
        chunks[pos] += eol
      }
      components.clear()
    }

    chunks[start] = tag + inlineRegistrations + ' `' + chunks[start]
    const lastElPos = reverseSeek(chunks, end, />$/)
    const blockEnd = inParens ? end - 1 : lastElPos > -1 ? lastElPos : end
    chunks[blockEnd] = chunks[blockEnd] + '`'

  }

  function isserFactory ({ key, mod, method }) {
    return (node) => {
      const { callee, type } = node
      if (type !== 'CallExpression') return false
      const expr = callee.type !== 'ParenthesizedExpression'
        ? callee
        : (callee.expression.type !== 'SequenceExpression'
            ? callee.expression
            : callee.expression.expressions[callee.expression.expressions.length - 1]
        )
      const directCall = expr.type === 'MemberExpression' &&
        expr.property && expr.property.name === method &&
        expr.object && expr.object.callee &&
        expr.object.callee.name === 'require' &&
        expr.object.arguments && expr.object.arguments[0] &&
        expr.object.arguments[0].value === mod

      const methodCall = expr.type === 'MemberExpression' &&
        references[key].has(expr.object.name) &&
        expr.property.name === method

      const functionCall = references[method].has(callee.name)

      const babelDefaultInteropCall = expr.type === 'MemberExpression' &&
        expr.object.type === 'MemberExpression' &&
        references[key].has(expr.object.object.name) &&
        expr.object.property.name === 'default' &&
        expr.property.name === method

      return directCall || methodCall || functionCall || babelDefaultInteropCall
    }
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
    return properties.map(({ key, value }) => {
      const v = value.type === 'Literal' && typeof value.value !== 'boolean'
        ? `"${value.value}"`
        : `\${${source(value)}}`
      const k = key.value || key.name
      return `${k}=${v}`
    }).join(' ')
  }

  function walk (node, parent, fn) {
    if (node === null) return
    node.parent = parent
    const keys = Object.keys(node)
    for (var i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (key === 'parent') continue
      const child = node[key]
      if (Array.isArray(child)) {
        const childKeys = Object.keys(child)
        for (var c = 0; c < childKeys.length; c++) {
          walk(child[childKeys[c]], node, fn)
        }
      } else if (child && child instanceof Node) {
        walk(child, node, fn)
      }
    }

    fn(node)
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
}

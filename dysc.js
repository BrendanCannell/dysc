export {
  MakeVariableProxy as vars,
  MakeVariable as Var,
  MakeScope as Scope
}

let getSymbols = Object.getOwnPropertySymbols
let STACK = Symbol('dysc/stack')
let VARS = Symbol('dysc/isScope')

function MakeVariable(name = "<anonymous dynamic variable>") {
  let symbol = Symbol(name)
  let stack = []
  Object.defineProperty(get, 'name', {value: name})
  Object.assign(get, {
    [Symbol.toPrimitive]: () => symbol,
    [STACK]: stack
  })
  return get

  function get() {
    let l = stack.length
    if (l === 0)
      throw Error("No value found for dynamic variable: " + name)
    return stack[l - 1]
  }
}

function MakeScope(varOrVars) {
  let vars = {}
  collect(vars, varOrVars)
  let symbols = getSymbols(vars)
  Bind.let = Let
  Bind.bind = Bind
  Bind[VARS] = vars
  return Bind

  function Bind(fn) {
    let saved = Copy(vars, symbols)
    return function Bound() {
      WindMany(vars, saved, symbols)
      try {
        var result = fn.apply(null, arguments)
      } catch (e) {
        UnwindMany(vars, saved, symbols)
        throw e
      }
      UnwindMany(vars, saved, symbols)
      return result
    }
  }

  function Let(assignments, fn) {
    let symbols = getSymbols(assignments)
    ValidateAssignments(vars, assignments, symbols)
    Wind(vars, assignments, symbols)
    try {
      var result = fn()
    } catch (e) {
      Unwind(vars, assignments, symbols)
      throw e
    }
    Unwind(vars, assignments, symbols)
    return result
  }
}

function collect(vars, varOrVars) {
  let vs = varOrVars
  if (isVariable(vs))
    vars[vs] = vs
  else if (isScope(vs))
    collect(vars, getSymbols(vs[VARS]).map(symbol => vs[VARS][symbol]))
  else if (isIterable(vs))
    for (let v of vs)
      collect(vars, v)
  else
    throw TypeError("Expected (iterable of) dynamic variable or scope: " + vs.toString())
  
  function isVariable(x) {
    return x && x[STACK]
  }
  function isScope(x) {
    return x && x[VARS]
  }
  function isIterable(x) {
    return x && typeof x[Symbol.iterator] === 'function'
  }
}

function Wind(vars, assignments, symbols) {
  for (let s of symbols)
    vars[s][STACK].push(assignments[s])
}

function Unwind(vars, assignments, symbols) {
  for (let s of symbols)
    vars[s][STACK].pop()
}

function WindMany(vars, assignments, symbols) {
  for (let s of symbols)
    pushAll(vars[s][STACK], assignments[s])
}
let pushAll = Array.prototype.push.apply.bind(Array.prototype.push)

function UnwindMany(vars, assignments, symbols) {
  for (let s of symbols)
    vars[s][STACK].splice(-assignments[s].length)
}

function ValidateAssignments(vars, assignments, assignmentSymbols) {
  for (let stringKey in assignments)
    throw Error("Expected dynamic variable key but found string: " + stringKey)
  for (let symbol of assignmentSymbols)
    if (!vars[symbol])
      throw Error("Unknown dynamic variable: " + symbol.toString())
}

function Copy(vars, symbols) {
  let copy = {}
  for (let s of symbols)
    copy[s] = vars[s][STACK].slice()
  return copy
}

function MakeVariableProxy() {
  return new Proxy({}, handler)
}
let handler = {
  get(_, name) {
    return MakeVariable(name)
  }
}
/*
 * A "simple" NodeJS REPL for a custom CLI app using NodeJS's own repl module
 *  (https://nodejs.org/api/repl.html) with custom commands, autocomplete for
 *  custom commands, persistent command history & "command history compression"
 *  (won't keep multiple instances in a row of the same command in the history)
 *
 * Author: l3l_aze <at> Yahoo! (dot) com
 */

'use strict'

const fs = require('fs')
const path = require('path')
const platform = require('os').platform()

const name = 'lil-repl'
const debug = platform !== 'android' ? require('./customDebug.js')(name) : require('debug')(name)

// Custom command setup
const fullCommands = {
  'clear': 'clear the screen',
  'quit': 'Exit the REPL',
  'exit': 'Exit the REPL'
}
const commands = Object.keys(fullCommands)

// Create REPL
const repl = require('repl')
const server = repl.start({
  prompt: 'test-repl>',
  terminal: true,         // Set to true to enable command history
  ignoreUndefined: true
})

function parseCommandLine () {
  let args = process.argv.slice(2)
  let options = {
    uniqueHistory: [ 'u', 'Only sve unique history', 'boolean', false ],
    debug: [ 'd', 'Debug mode', 'boolean', false ],
    multilineErrors: [ 'm', 'Show regular multi-line errors with stack strace', 'boolean', false ],
    saveAllCommands: [ 'a', 'Save failed commands too', 'boolean' false ],
    historyFile: [ 'h', 'Command history file', 'path', '.node_repl_history' ],
    historyLimit: [ 'l', 'Command history limit', 'number', 1000 ]
  }
  let i

  debug(`args: [ ${args.join(', ')} ]`)

  for (i = 0; i < args.length; i++) {
    switch (args[ i ]) {
      case '--unique-history': // Only keep unique history
      case '-u':
    }
  }

  return options
}

// Setup REPL
function init() {
  if (process.env.DEBUG) {
    process.stdout.write('\n') // So The next debug line doesn't split into two lines, and doesn't start on the prompt line
  }

  debug('Intializing %s', name)
  const replHistoryFile = path.join('.node_repl_history')

  let options = parseCommandLine()

  server.eval = customEval
  server.completer = customAutocomplete

  // Save command history when exiting
  server.on('exit', () => {
    // server.lines = commands used in current session
    let data = server.lines
    let current = loadHistory(replHistoryFile)
    let lastLine
    let line

    debug('Closing %s...saving history', name)

    // Do not try to save history when there have been no commands run
    if (data.length > 0) {

      debug('Session history: %s', data.length)
      debug('Ollllld history: %s', current.length)


      data = data.concat(current)

      // "Command History Compression"
      // Remove multiple instances in a row of the exact same command in history
      //  and re-write the history file with the new, slightly better, compressed version.
      data = data.filter(line => {

        if (lastLine === undefined) {
          lastLine = line

          return true
        } else if (line !== lastLine) {
          lastLine = line

          return true
        }

        lastLine = undefined
        return false
      })

      debug('Minified history %s', data.length)

      fs.writeFileSync(replHistoryFile, data.join('\n') + '\n')
    }

    process.exit()
  })

  // Obviously we don't want to try to load non-existent history.
  if (fs.existsSync(replHistoryFile)) {
    debug(`Found ${replHistoryFile}`)

    loadHistory(replHistoryFile)
      .map(line => server.history.push(line))
  }

  debug('%s ready', name)

  // Otherwise the last debug call there leaves the user at a non-prompt which will change when arrow up/down is pressed.
  if (process.env.DEBUG) {
    process.stdout.write(server._prompt)
  }
}

// Custom 'eval' for REPL, to handle custom commands
const customEval = function customEval (cmd, callback) {
  let result
  cmd = cmd.trim()

  // Calling eval with an empty line below in the default case will cause it to be saved in command history.
  if (cmd === '') {
    return undefined
  }

  switch(cmd) {
    case 'clear':
      process.stdout.cursorTo(0, 0) // Move to top line of terminal
      process.stdout.clearLine()
      process.stdout.clearScreenDown()
      server.lines.push(cmd) // Save known command in history
      break

    case 'quit':
    case 'exit':
      server.lines.push(cmd) // Save command in history when successful
      server.emit('exit') // Rather than process.exit, because that will just quit the program immediately.

    default:
      // Wrapped in try/catch to prevent errors from stopping the REPL
      try {
        result = eval(cmd)

        // Print result of mathematical formulas, etc
        if (result !== undefined) {
          console.info(result)
        }

        server.lines.push(cmd) // Save command in history when successful
      } catch (err) {
        // Single-line error messages like 'ReferenceError: ls is not defined'
        console.error(err.constructor.name + ': ' + err.message)
      }
  }

  return result
}

// Autocomplete-with-tab setup
const customAutocomplete = function customAutocomplete (line, callback) { // non-async version crashes when used.
  const hits = commands.filter(c => c.indexOf(line) === 0)

  callback(null, [ hits.length > 0 ? hits : commands, line ])
}

const loadHistory = function loadHistory (file) {
  let data
  let line
  let lastLine

  data = ('' + fs.readFileSync(file))
    .split('\n')
    .filter(line => line.trim())
    .reverse()

  debug('Loaded history: %s entries', data.length)

  return data
}

init()

const colors = [
  30, // Black
  31, // Red
  32, // Green
  33, // Yellow
  34, // Blue
  35, // Magenta
  36, // Cyan
  37  // White
]

/*
 * Based on visionmedia/debug module's selectColor method from
 * https://github.com/visionmedia/debug/blob/master/src/common.js
 */
function selectColor (namespace) {
  let hash = 0x22222222
  let i

  for (i in namespace) {
    hash ^= namespace.charCodeAt(i)
    hash |= 0
  }

  return colors[ Math.abs(hash) % colors.length ]
}

function init (namespace) {
  let lastCall
  let result
  let color = `\u001B[${selectColor(namespace)}m`
  let reset = '\u001B[0m'

  function customDebug (string) {
    if (process.env.DEBUG) {
      const format = require('util').format
      const args = Array.from(arguments).slice(1)
      let diff = 0
      let now = 0

      if (lastCall === undefined) {
        lastCall = Date.now()
      }

      now = Date.now()
      diff = now - lastCall

      if (process.stdout.isTTY) {
        result = `  ${color}${typeof namespace === 'undefined' ? 'debug' : namespace}${reset} ${args.length > 0 ? format(string, ...args) : string} ${color}${format('+%dms', diff)}${reset}\n`
      } else {
        result = `  ${typeof namespace === 'undefined' ? 'debug' : namespace} ${args.length > 0 ? format(string, args) : string} ${format('+%dms', diff)}\n`
      }

      process.stdout.write(result)

      lastCall = now
    }
  }

  return customDebug
}


module.exports = init

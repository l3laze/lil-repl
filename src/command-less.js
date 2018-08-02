'use strict'

const util = require('util')
const path = require('path')

// Debug setup
const ownName = 'command-less'
const debug = require('./lil-debug.js')(ownName)

function init (pj, helpStyle) {
  let obj = {}
  let defaultPJ = {
    name: `${path.basename(process.argv[ 1 ])}`,
    version: '1.0'
  }

  pj = Object.assign(defaultPJ, pj)

  obj.help = undefined
  obj.longs = {}
  obj.shorts = {}
  obj.pj = pj
  obj.args = process.argv.slice(2)
  obj.helpStyle = helpStyle

  debug('Initializing %s for %s v%s', ownName, pj.name, pj.version)

  obj.helpPage = function makeHelp (options) {
    let helpText = util.format('  Usage %s [options]\n\n\tFlags\n\tName\t\t  Type\t\t\tDescription\n', pj.name)

    Object.keys(options).forEach(item => {
      helpText += util.format(
        '%s | %s\t' +
        (item.length < 12 ? '\t' : '') +
        '[%s]' +
        (options[ item ][ 2 ].length < 5 ? '\t' : '') +
        '\t%s (default is %s)\n',
        options[ item ][ 0 ], // short
        item, // long
        options[ item ][ 2 ], // type
        options[ item ][ 1 ], // description
        options[ item ].length > 2 ? options[ item ][ 3 ] : '', // default value, if any
      )
    })

    // debug('\n%s', helpText)

    return helpText
  }

  obj.manPage = function makeMan (options) {
    let shortEnd = this.pj.description.indexOf('.')
    let manText = util.format(
      '\t\t\t\t\t"Man Page"\n\nNAME\n\t%s - %s\n\nSYNOPSIS\n\t%sDESCRIPTION\n\t%s\n\nOPTIONS\n\t',
      this.pj.name,
      typeof this.pj.description !== 'undefined' ? this.pj.description.substring(0, shortEnd !== -1 ? shortEnd + 1 : this.pj.description.length) : '',
      util.format('%s [options]\n\n', this.pj.name),
      this.pj.description,
    )

    Object.keys(options).forEach(o => {
      manText += util.format(
        '%s | %s\t' + (o.length < 12 ? '\t' : '') +
        `${options[ o ][ 2 ]}\t` +
        ' - %s\n\t',
        options[ o ][ 0 ], // short option
        o, // long option
        options[ o ][ 1 ] // description
      )
    })

    manText += util.format('\n\nAUTHOR\n\t%s\n\n', typeof pj.author !== 'undefined' ? pj.author : 'N/A' )

    return manText
  }

  obj.getNextOption = function nextOption () {
    let val
    let key
    let count = 0 // # of tokens removed
    let start = 0 // Starting position of tokens removed
    let op = '' + this.args[ 0 ]

    /* This algorithm is designed to parse the following option formats:
     * -o
     * -o=val
     * -o=.val
     * -o=val.
     * -o=val.u
     * -o=val.ues.
     * -o=val.ues_
     * -o=val_ues_
     * -o=val_ues.
     * -option
     * -option-name
     * -option_name
     * -option=val
     * -option-name=val
     * -option_name=val
     */

    if (/^-(([a-z0-9]+)=*[\.\w\-]*[a-z0-9]+\.*)*[a-z0-9\.]+$/i.test(op)) {
      debug('Parsing short option %s', op)

      if (op.indexOf('=') !== -1) {
        // -o=val
        // debug('Found parameterized option %s', op)

        op = op.split('=')

        val = op[ 1 ]
        op = op[ 0 ].charAt(1)

        // debug('op: %s - val: %s', op, val)

        count++
      } else if (op.length > 2) {
        // -abc, -ab BUT NOT -a itself
        op = op.charAt(1)
        key = this.shorts[ op ]
        this.args[ 0 ] = '-' + this.args[ 0 ].split('').slice(2).join('')
      } else if (op.length === 2) {
        op = op.charAt(1)
        key = this.shorts[ op ]
        start++
        count++
      } else {
        console.error(`Don't recognize token format ${this.args[ 0 ]}` )
        process.exit(1)
      }

      if (typeof val === 'undefined') {
        debug('op: %s (%s)', op, this.shorts[ op ])
        if (this.parsing[ this.shorts[ op ]][ 2 ] !== 'boolean') {
          val = this.args[ 1 ]
          count++
        } else {
          if (/^true|false$/i.test(this.args[ 1 ])) {
            // If the next token is a boolean value, parse it.
            val = this.args[ 1 ]
            count++
          } else {
            // Otherwise assume the next token is not the boolan value for
            // this and use the opposite of the default value instead.
            val = !this.parsing[ this.shorts[ op ]][ 3 ] === true
          }
        }
      }
    } else if (/^--(([a-z0-9]+)=*[\.\w\-]*[a-z0-9]+\.*)*[a-z0-9\.]+$/i.test(this.args[ 0 ])) {
      debug('Parsing long option %s', op)

      if (op.indexOf('=') !== -1) {
        // --option=val
        // debug('Found parameterized option %s', op)

        op = op.split('=')

        val = op[ 1 ]
        op = op[ 0 ].slice(2)

        // debug('op: %s - val: %s', op, val)

        count++
      } else {
        // --option
        op = op.slice(2)
        key = this.longs[ op ]
        count++
      }

      if (typeof val === 'undefined') {
        // debug('op: %s (%s)', op, this.longs[ op ])

        if (this.parsing[ this.shorts[ this.longs[ op ]]][ 2 ] !== 'boolean') {
          val = this.args[ 1 ]
          count++
        } else {
          if (/^true|false$/i.test(this.args[ 1 ])) {
            // If the next token is a boolean value, parse it.
            val = this.args[ 1 ]
            count++
          } else {
            // Otherwise assume the next token is not the boolan value for
            // this and use the opposite of the default value instead.
            val = !this.parsing[ this.longs[ op ]][ 3 ] === true
          }
        }
      }
    }

    if (count > 0) {
      let parsed = this.args.splice(0, count)

      // debug('Parsed token(s): %s', parsed.join(', '))
    }

    if (typeof this.shorts[ op ] === 'undefined' && typeof this.longs[ op ] === 'undefined') {
      console.error('Unknown option %s in args %s', op, process.argv.slice(2).join(', '))
      process.exit(1)
    }

    if (typeof this.shorts[ op ] !== 'undefined') {
      op = this.shorts[ op ]
    }

    return [ op, val ]
  }

  obj.parse = function (options) {
    let key
    let val
    let opts = {}

    this.longs = {}
    this.shorts = {}
    this.parsing = options
    this.help = this.helpStyle === 'man' ?
      this.manPage(options) :
      this.helpPage(options)

    // TODO: Error when key exists already
    Object.keys(options).forEach(o => {
      this.longs[ o ] = options[ o ][ 0 ]
      this.shorts[ options[ o ][ 0 ]] = o
      opts[ o ] = undefined
    })

    /*
      debug(`Parsing: ${JSON.stringify(this.parsing, null, 2)}`)
      debug(`Longs: ${Object.keys(this.longs).join(', ')}`)
      debug(`Shorts: ${Object.keys(this.shorts).join(', ')}`)
    */

    while (this.args.length > 0) {
      [ key, val ] = this.getNextOption()

      opts[ key ] = val

      // console.info(`Args left: ${this.args.length} (${this.args.join(', ')})`)
    }

    Object.keys(options).forEach(k => {
      if (typeof opts[ k ] === 'undefined') {
        opts[ k ] = options[ k ][ 3 ]
      }
    })

    return opts
  }

  return obj
}


module.exports = init

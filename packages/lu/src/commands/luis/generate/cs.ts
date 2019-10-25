/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {CLIError, Command, flags} from '@microsoft/bf-cli-command'
import {camelCase, upperFirst} from 'lodash'
import * as path from 'path'

const LuisToCsConverter = require('./../../../parser/converters/luistocsconverter')
const file = require('./../../../utils/filehelper')
const fs = require('fs-extra')

export default class LuisGenerateCs extends Command {
  static description = 'Generate:cs generates a strongly typed C# source code from an exported (json) LUIS model.'

  static flags: flags.Input<any> = {
    in: flags.string({char: 'i', description: 'Path to the file containing the LUIS application JSON model'}),
    out: flags.string({char: 'o', description: 'Output file or folder name. If not specified stdout will be used as output', default: ''}),
    className: flags.string({description: 'Name of the autogenerated class (can include namespace)'}),
    force: flags.boolean({char: 'f', description: 'If --out flag is provided with the path to an existing file, overwrites that file', default: false}),
    help: flags.help({char: 'h', description: 'luis:generate:cs help'})

  }

  reorderEntities(app: any, name: string): void {
    if (app[name] !== null && app[name] !== undefined) {
      app[name].sort((a: any, b: any) => (a.name > b.name ? 1 : -1))
    }
  }

  async run() {
    const {flags} = this.parse(LuisGenerateCs)
    let space = 'Luis'
    let stdInput = await this.readStdin()

    const pathPrefix = path.isAbsolute(flags.in) ? '' : process.cwd()
    let app: any
    try {
      app = stdInput ? JSON.parse(stdInput as string) : await fs.readJSON(path.join(pathPrefix, flags.in))
    } catch (err) {
      throw new CLIError(err)
    }

    flags.className = flags.className || app.name
    flags.className = upperFirst(camelCase(flags.className))

    const dot_index = flags.className ? flags.className.indexOf('.') : -1
    if (dot_index !== -1) {
      space = flags.className.substr(dot_index + 1)
      flags.className = flags.className.substr(0, dot_index)
    }

    this.reorderEntities(app, 'entities')
    this.reorderEntities(app, 'prebuiltEntities')
    this.reorderEntities(app, 'closedLists')
    this.reorderEntities(app, 'regex_entities')
    this.reorderEntities(app, 'patternAnyEntities')
    this.reorderEntities(app, 'composites')

    const outputPath = flags.out ? file.validatePath(flags.out, flags.className + '.cs', flags.force) : flags.out

    this.log(
      `Generating file at ${outputPath || 'stdout'} that contains class ${space}.${flags.className}.`
    )

    await LuisToCsConverter.writeFromLuisJson(app, flags.className, space, outputPath)
  }
}

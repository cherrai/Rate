import * as R from 'ramda'
import { findNext } from './utils.js'
import { Element, Text } from 'domhandler'
import { getRows, toFieldsForDtMt } from './table-parser.js'
import { getExternals, toSchema, toZodDesc } from './schema-gen.js'
import { getAnchorText } from './anchors.js'

export const dtSolver = (anchor: Element) => {
  const schemaName = getAnchorText(anchor)
  return {
    schemaName,
    schema: R.pipe(
      findNext('table'),
      toFieldsForDtMt,
      R.map(toZodDesc),
      (zodDescs) => ({
        type: 'DT' as 'DT',
        schemaName,
        zodDescs,
        externals: [],
      }),
      getExternals,
      toSchema
    )(anchor),
  }
}

export type DtSchema = ReturnType<typeof dtSolver>

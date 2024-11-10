import * as R from 'ramda'
import { capitalize, findNext } from './utils.js'
import { Element, Text } from 'domhandler'
import { getRows, toFieldsForDtMt } from './table-parser.js'
import { Field, getExternals, toSchema, toZodDesc } from './schema-gen.js'
import { getAnchorText } from './anchors.js'
import { RETURN_TYPE_OF_BOT_METHODS } from './constants.js'

export const mtSolver = (anchor: Element) => {
  const methodName = getAnchorText(anchor)
  const schemaName = `${capitalize(methodName)}Param`
  const returnType = `${capitalize(methodName)}ReturnType`
  const methodsWithNoParams = ['getMe', 'logOut', 'close', 'getWebhookInfo', 'getForumTopicIconStickers']
  //@ts-ignore
  //TODO
  const returnTypeDesc = RETURN_TYPE_OF_BOT_METHODS[methodName] ? RETURN_TYPE_OF_BOT_METHODS[methodName] : 'True'
  const fields: Field[] = R.concat(
    [{ key: '__return_type', desc: returnTypeDesc, optional: false }] as Field[],
    R.includes(methodName)(methodsWithNoParams) ? [] : R.pipe(findNext('table'), toFieldsForDtMt)(anchor)
  )

  // Except for __return_type
  const allOptional = R.pipe(R.filter(({ optional }: Field) => !optional))(fields).length === 1

  return {
    schemaName,
    methodName,
    schema: R.pipe(
      R.map(toZodDesc),
      (zodDescs) => ({
        type: 'MT' as 'MT',
        methodName,
        schemaName,
        returnType,
        zodDescs,
        allOptional,
        externals: [],
      }),
      getExternals,
      toSchema
    )(fields),
  }
}

export type MtSchema = ReturnType<typeof mtSolver>

import * as R from 'ramda'
import { toZodDescString, unionToZodDesc } from './type-parser.js'
import { capitalize, combine } from './utils.js'
import { RETURN_TYPE_OF_BOT_METHODS } from './constants.js'

type Field = {
  key: string
  desc: string
  optional: boolean
}

type RawSchemaDT = {
  type: 'DT'
  schemaName: string
  zodDescs: ZodDesc[]
  externals: string[]
}

type RawSchemaUN = {
  type: 'UN'
  schemaName: string
  unions: string[]
}

type RawSchemaMT = {
  type: 'MT'
  methodName: string
  schemaName: string
  externals: string[]
  zodDescs: ZodDesc[]
  returnType: string
  allOptional: boolean
}

type RawSchema = RawSchemaDT | RawSchemaUN | RawSchemaMT

const toZodDesc = ({ key, desc, optional }: Field) => {
  const { zodDescStr, externals } = toZodDescString({
    desc,
    optional,
  })
  return {
    key,
    zodDescStr,
    externals,
  }
}

type ZodDesc = ReturnType<typeof toZodDesc>

const getExternals = (ctx: RawSchemaDT | RawSchemaMT): RawSchemaDT | RawSchemaMT => {
  return {
    ...ctx,
    externals: R.pipe(
      R.map((zodDesc: ZodDesc) => zodDesc.externals),
      R.flatten,
      R.filter((external) => external !== ctx.schemaName),
      R.uniq
    )(ctx.zodDescs) as string[],
  }
}

const zodImport = `import { z } from 'zod'`

const toImportsFactory = (prefix: string) =>
  R.map((external) => `import { ${external} } from '${prefix}${external}.js'`)

const toBodyPartsForDtMt = ({ schemaName, zodDescs }: RawSchemaDT | RawSchemaMT) => {
  const head = `export const ${schemaName} = z.object({`
  const body = R.pipe(
    R.filter((desc: ZodDesc) => desc.key !== '__return_type'),
    R.map((desc: ZodDesc) => R.join('')(['  ', desc.key, ': ', desc.zodDescStr, ',']))
  )(zodDescs)
  return R.flatten([head, body, '})'])
}

const toReturnTypeParts = ({ methodName, zodDescs, returnType }: RawSchemaMT) => {
  const returnTypeValue = R.pipe(
    R.filter((zodDesc: ZodDesc) => zodDesc.key === '__return_type'),
    (zodDescs: ZodDesc[]) => zodDescs[0].zodDescStr
  )(zodDescs)
  return [`export const ${returnType} = ${returnTypeValue};`]
}

const toInferParts = (schemaName: string = '') => `export type ${schemaName} = z.infer<typeof ${schemaName}>;`

const toSchemaForMT = (ctx: RawSchemaMT) => {
  const { schemaName, methodName, externals, returnType, allOptional } = ctx
  const fetchImport = `import { myFetch, FetchOptions } from '../my-fetch.js'`
  const imports = R.concat([zodImport, fetchImport], toImportsFactory('../../udts/')(externals))
  const body = toBodyPartsForDtMt(ctx)
  const returns = toReturnTypeParts(ctx)
  const infer = R.map(toInferParts)([schemaName, returnType])

  const method = [
    `export const ${methodName} =`,
    `  (injection: FetchOptions) => (params: ${schemaName}${
      allOptional ? ` = {}` : ''
    }, fetchOptions?: FetchOptions) =>`,
    `    myFetch<${returnType}>()({`,
    `      _botMethod: '${methodName}',`,
    `      axiosRequestConfig: {`,
    `        params,`,
    `        ...injection.axiosRequestConfig,`,
    `        ...fetchOptions?.axiosRequestConfig,`,
    `      },`,
    `      ...injection,`,
    `      ...fetchOptions,`,
    `    })`,
  ]
  return combine([imports, body, returns, infer, method])
}

const toSchemaForDT = (ctx: RawSchemaDT) => {
  const imports = R.concat([zodImport], toImportsFactory('./')(ctx.externals))
  const body = toBodyPartsForDtMt(ctx)
  const infer = [toInferParts(ctx.schemaName)]
  return combine([imports, body, infer])
}

const toSchemaForUnion = (ctx: RawSchemaUN) => {
  const { unions, schemaName } = ctx
  const imports = R.concat([zodImport], toImportsFactory('./')(unions))
  const body = [`export const ${schemaName} = ${unionToZodDesc(unions)}`]
  const infer = [toInferParts(schemaName)]
  return combine([imports, body, infer])
}

const toSchema = (ctx: RawSchema) =>
  (<(ctx: RawSchema) => string>(
    (<unknown>(ctx.type === 'DT' ? toSchemaForDT : ctx.type === 'MT' ? toSchemaForMT : toSchemaForUnion))
  ))(ctx)

export { Field, toZodDesc, ZodDesc, getExternals, toSchema }

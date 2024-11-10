import * as R from 'ramda'
import { MtSchema } from './mt-solver.js'
import { combine } from './utils.js'

// const header = [``]
// const apiCaller = (mt: MtSchema)

export const getApiCallerSrc = (mts: MtSchema[]) => {
  const imports = [
    `import { YContext } from './core.js'`,
    ...R.map(({ methodName }: MtSchema) => `import { ${methodName} } from './api-lists/${methodName}.js'`)(mts),
  ]
  const body = [
    `const _ApiCaller = (token: string) => ({`,
    ...R.map((mt: MtSchema) => `  ${mt.methodName}: ${mt.methodName}({ _token: token }),`)(mts),
    `})`,
  ]
  const footer = [
    `type ApiCallerReturnType = ReturnType<typeof _ApiCaller>`,
    ``,
    `function ApiCaller(token: string): ApiCallerReturnType`,
    `function ApiCaller(ctx: YContext<any>): ApiCallerReturnType`,
    ``,
    `function ApiCaller(arg: string | YContext<any>) {`,
    `  return typeof arg === 'object' ? _ApiCaller(arg.token) : _ApiCaller(arg)`,
    `}`,
    ``,
    `export { ApiCaller }`
  ]

  return combine([imports, body, footer])
}

import { join } from 'path'
import * as R from 'ramda'
import * as I from 'fp-ts/lib/IO.js'
import { type Schema } from './main.js'
import { map } from 'fp-ts/lib/Array.js'
import { writeFileSync, existsSync } from 'fs'
import * as Console from 'fp-ts/lib/Console.js'
import { flow, pipe } from 'fp-ts/lib/function.js'

export const canWrite = (outFile: string) => process.env['FORCE'] === '1' || !existsSync(outFile)

export const toFullWD = (prefix: string) => join(process.env['OUT_DIR'] as string, prefix)

export const writeToFileSingle = flow(
  I.of<{ prefix: string; filename: string; content: string }>,
  I.bind('outFile', (schema) => () => join(toFullWD(schema.prefix), `${schema.filename}.ts`)),
  I.tap(
    ({ outFile, content }) =>
      () =>
        canWrite(outFile) &&
        (() => {
          console.log(`Writing to file ${outFile}`)
          writeFileSync(outFile, content)
        })()
  ),
  I.map(() => {})
)

export type Transformer<K extends Schema> = (original: K) => Parameters<typeof writeToFileSingle>[0]

export const writeToFile = <K extends Schema>(transformer: Transformer<K>) => map(flow(transformer, writeToFileSingle))
export const writeAll = <K extends Schema>(ctx: {
  schemas: K[]
  transformer: Transformer<K>
  prefix: string
  description: string
}) =>
  pipe(
    I.Do,
    I.tap(
      pipe(
        ctx.schemas,
        writeToFile(ctx.transformer),
        map((f: I.IO<void>) => f()),
        () => () => () => {}
      )
    )
  )

export const writeApiCaller = R.tap((src: string) => {
  const apiCallerFile = toFullWD('api/api-caller.ts')
  canWrite(apiCallerFile) &&
    (() => {
      console.log(`Writing to file ${apiCallerFile}`)
      writeFileSync(apiCallerFile, src)
    })()
})

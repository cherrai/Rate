import * as Rx from 'rxjs'
import * as I from 'fp-ts/lib/IO.js'
import { IO } from 'fp-ts/lib/IO.js'
import { join } from 'node:path/posix'
import * as R from 'ramda'
import * as Reader from 'fp-ts/Reader'
import { pipe, flow } from 'fp-ts/function'
import * as Console from 'fp-ts/lib/Console.js'
import { existsSync, write, writeFileSync } from 'node:fs'
import { isTable, takeBetween, getData, fmapedMap } from './utils.js'
import {
  AnchorType,
  checkAnchor,
  checkAnchorNegated,
  findAnchor,
  getAnchorText,
  getAnchorType,
  getAnchors,
} from './anchors.js'
import axios, { AxiosResponse } from 'axios'
import { parseDocument, ElementType } from 'htmlparser2'
import { filter, getElementById, getElementsByTagName } from 'domutils'
import { AnyNode, Document, Element, Text } from 'domhandler'
import { toZodDescString } from './type-parser.js'
import { DtSchema, dtSolver } from './dt-solver.js'
import { mtSolver, MtSchema } from './mt-solver.js'
import { UnSchema, unSolver } from './un-solver.js'
import { writeToFile, writeAll, writeApiCaller } from './writer.js'
import { getApiCallerSrc } from './api-caller.js'
/**
 * Envs:
 * OUT_DIR FORCE
 */
export type Schema = DtSchema | MtSchema | UnSchema

const main: IO<void> = () => {
  Rx.from(axios.get('https://core.telegram.org/bots/api'))
    .pipe(
      Rx.map((axiosResponse: AxiosResponse) => {
        const fetchHtml = (response: AxiosResponse) => response.data as string
        const docs = R.pipe(fetchHtml, (html: string) => parseDocument(html))(axiosResponse)
        const anchors = R.pipe(getAnchors, R.dropWhile(checkAnchorNegated('getting-updates')))(docs)
        const anchorTypeEnum = [AnchorType.DataType, AnchorType.Method, AnchorType.Union]
        const ignore = ['InputFile', 'sendMediaGroup', 'Message', 'MaybeInaccessibleMessage', 'GiveawayCompleted']
        const anchorFilterFactory = (anchorType: AnchorType) =>
          R.filter(
            (anchor: Element) => getAnchorType(anchor) === anchorType && !R.includes(getAnchorText(anchor))(ignore)
          )
        const anchorsFiltered = R.zipWith(
          R.call,
          R.map(anchorFilterFactory)(anchorTypeEnum),
          R.repeat(anchors, anchorTypeEnum.length)
        ) as Element[][]

        return <[DtSchema[], MtSchema[], UnSchema[]]>(
          R.zipWith(R.call, fmapedMap<Element, Schema>()([dtSolver, mtSolver, unSolver]), anchorsFiltered)
        ) // Q.E.D
      }),

      Rx.filter(() => process.env['OUT_DIR'] !== undefined),

      Rx.tap(([dts, mts, uns]) => {
        const dtTransformer = (dt: DtSchema) => ({ prefix: '/udts', filename: dt.schemaName, content: dt.schema })
        const mtTransformer = (mt: MtSchema) => ({
          prefix: '/api/api-lists',
          filename: mt.methodName,
          content: mt.schema,
        })
        process.env['DT'] === '1' &&
          writeAll({
            schemas: [...dts, ...uns],
            transformer: dtTransformer,
            prefix: '/udts',
            description: 'UDTs',
          })()
        process.env['MT'] === '1' &&
          writeAll({
            schemas: mts,
            transformer: mtTransformer,
            prefix: '/api/api-lists',
            description: 'APIs',
          })()

        process.env['AC'] === '1' && R.pipe(getApiCallerSrc, writeApiCaller)(mts)
      })
    )
    .subscribe()
}

main()

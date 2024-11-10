import * as R from 'ramda'
import { checkAnchorNegated } from './anchors.js'
import { parseDocument, ElementType } from 'htmlparser2'
import { filter, getElementsByTagName } from 'domutils'
import { AnyNode, Document, Element, Text } from 'domhandler'

const isTable = (node: Element) => {
  return node?.attribs?.class === 'table'
}
const takeBetween = (start: string, end: string) =>
  R.pipe(R.dropWhile(checkAnchorNegated(start)), R.takeWhile(checkAnchorNegated(end)))

const getData = (node: Element | Text): string => {
  if (node.type === ElementType.Text) return node.data
  else return R.pipe(R.map(getData), R.join(''))(node.children as (Element | Text)[])
}

const mapIndexed = R.addIndex(R.map)

const findNext = (tagName: string) => (anchor: Element) => {
  return R.pipe(
    R.dropWhile((x: Element) => x !== anchor.parentNode),
    R.filter((x: Element) => x.tagName === tagName),
    R.head<Element>
  )(anchor.parentNode?.parentNode?.children as Element[]) as Element
}

function fmapedMap<P, K>() {
  return R.map<(x: P) => K, (x: P[]) => K[]>(R.map)
}

const combine: (parts: string[][]) => string = R.reduce(
  (left: string, right: string[]) =>
    right.length ? (left === '' ? R.join('\n', right) + '\n' : left + '\n' + R.join('\n', right) + '\n') : left,
  ''
)

const capitalize = (origin: string) => `${R.toUpper(origin[0])}${R.slice(1, Infinity)(origin)}`

export { checkAnchorNegated, isTable, takeBetween, getData, mapIndexed, findNext, fmapedMap, combine, capitalize }

import * as R from 'ramda';
import { getData } from './utils.js';
import { getElementsByTagName } from 'domutils';
import { Element, Text } from 'domhandler';
import { Field } from './schema-gen.js';

const findNextTable = (anchor: Element) => {
  return R.pipe(
    R.dropWhile((x: Element) => x === anchor),
    R.filter(isTable),
    R.head<Element>
  )(anchor.parentNode?.parentNode?.children as Element[]) as Element;
};

export function getRows<K extends string[][]>(table: Element) {
  return R.pipe(
    (table) => getElementsByTagName('tbody', table)[0], //tbody
    (tbody) => getElementsByTagName('tr', tbody), // tr[]
    R.map(
      R.pipe(
        (tr) => getElementsByTagName('td', tr), //td[]
        R.map(R.pipe((td) => td.children[0] as Text | Element, getData))
      )
    )
  )(table) as K;
}

export const toFieldsForDtMt: (table: Element) => Field[] = R.pipe(
  getRows<[string, string, string][]>,
  R.map((row) => ({
    key: row[0],
    desc: row[1],
    optional: row[2] === 'Optional',
  }))
);

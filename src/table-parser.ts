import * as R from 'ramda';
import { getData } from './utils.js';
import { getElementsByTagName } from 'domutils';
import { Element, Text } from 'domhandler';
import { Field } from './schema-gen.js';
import assert from 'node:assert/strict';

export function getRows<K extends string[][]>(table: Element) {
  assert(table.tagName === 'table');
  return R.pipe(
    (table) => getElementsByTagName('tbody', table)[0], //tbody
    (tbody) => getElementsByTagName('tr', tbody), // tr[]
    R.map(
      R.pipe(
        (tr) => getElementsByTagName('td', tr), //td[]
        R.map(getData)
      )
    )
  )(table) as K;
}

export const toFieldsForDtMt: (table: Element) => Field[] = R.pipe(
  getRows<[string, string, string][]>,
  R.map((row) => ({
    key: row[0],
    desc: row[1],
    optional: R.startsWith('Optional')(row[2]),
  }))
);

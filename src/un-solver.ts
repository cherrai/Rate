import * as R from 'ramda';
import { Element } from 'domhandler';
import { findNext } from './utils.js';
import { getUnions } from './ul-parser.js';
import { getAnchorText } from './anchors.js';
import { toSchema } from './schema-gen.js';

export const unSolver = (anchor: Element) => {
  const schemaName = getAnchorText(anchor);
  const unions = R.pipe(findNext('ul'), getUnions)(anchor);
  return {
    schemaName,
    schema: toSchema({
      type: 'UN',
      externals: unions,
      unions: unions,
      schemaName,
    }),
  };
};

export type UnSchema = ReturnType<typeof unSolver>;

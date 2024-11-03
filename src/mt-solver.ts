import * as R from 'ramda';
import { findNext } from './utils.js';
import { Element, Text } from 'domhandler';
import { getRows, toFieldsForDtMt } from './table-parser.js';
import { getExternals, toSchema, toZodDesc } from './schema-gen.js';
import { getAnchorText } from './anchors.js';

export const mtSolver = (anchor: Element) => {
  const methodName = getAnchorText(anchor);
  const schemaName = ((str: string) => `${R.toUpper(str[0])}${R.slice(1, Infinity)(str)}Param`)(methodName);
  return {
    schemaName,
    methodName,
    schema: R.pipe(
      findNext('table'),
      toFieldsForDtMt,
      R.map(toZodDesc),
      (zodDescs) => ({
        schemaName,
        zodDescs,
        externals: [],
      }),
      getExternals,
      toSchema
    )(anchor),
  };
};

export type MtSchema = ReturnType<typeof mtSolver>;

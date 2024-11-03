import * as R from 'ramda';
import { Element } from 'domhandler';
import { getElementsByTagName } from 'domutils';
import assert from 'node:assert/strict';
import { getData } from './utils.js';

export const getUnions = (ul: Element) => {
  const lis = getElementsByTagName('li', ul);
  return R.map(getData)(lis);
};


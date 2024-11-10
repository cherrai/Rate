import * as R from 'ramda';
import { filter } from 'domutils';
import { Element, AnyNode, Document, Text } from 'domhandler';
import { ElementType } from 'htmlparser2';
import { getData } from './utils.js';

enum AnchorType {
  Title,
  Union,
  DataType,
  Method,
  Other,
}

function HigherNot<P, K>(f: (u: P) => (v: K) => boolean) {
  return (u: P) => (v: K) => !f(u)(v);
}
const checkAnchor = (name: string) => (elem: Element) => elem?.attribs?.name === name;
const checkAnchorNegated = HigherNot(checkAnchor);

const isAnchors = (elem: AnyNode) => elem.type === ElementType.Tag && elem.attribs['class'] === 'anchor';

const getAnchors = (dom: Document) => filter(isAnchors, dom) as Element[];

const findAnchor = (name: string) =>
  R.pipe(R.filter(checkAnchor(name)), R.head<Element>) as (anchors: Element[]) => Element;

const getAnchorText = (anchor: Element) => getData(anchor.nextSibling as Element | Text);

const getAnchorType = (anchor: Element): AnchorType => {
  const anchorText = getAnchorText(anchor);
  return (anchor?.parentNode as Element)?.tagName === 'h3'
    ? AnchorType.Title
    : (anchor?.parentNode?.next?.next?.next?.next as Element)?.tagName === 'ul'
    ? AnchorType.Union
    : anchorText.match(/^[a-z]/)
    ? AnchorType.Method
    : !anchorText.match(' ')
    ? AnchorType.DataType
    : AnchorType.Other;
};

export { checkAnchor, checkAnchorNegated, isAnchors, getAnchors, findAnchor, getAnchorText, getAnchorType, AnchorType };

import { Observable, from, mergeMap, toArray, map } from 'rxjs';
import { List } from 'immutable';
import axios, { AxiosResponse } from 'axios';
import * as htmlparser2 from 'htmlparser2';
import * as R from 'ramda';

const source: Observable<AxiosResponse> = from(
  axios.get('https://core.telegram.org/bots/api#inputpaidmedia')
);

const fetchHtml = (response: AxiosResponse) => response.data as string;

type HtmlOpenTag = {
  type: 'open';
  tag: string;
  attr: {};
};

type HtmlText = {
  type: 'text';
  text: string;
};

type HtmlCloseTag = {
  type: 'close';
};

type HtmlNodeRaw = HtmlOpenTag | HtmlText | HtmlCloseTag;

//pipe mergeMap
const toSplits = (html: string) =>
  new Observable<HtmlNodeRaw>((observer) => {
    const parser = new htmlparser2.Parser({
      onopentag: (tag, attr) =>
        observer.next({
          type: 'open',
          tag,
          attr,
        }),
      ontext: (text) =>
        observer.next({
          type: 'text',
          text,
        }),
      onclosetag: (name) =>
        observer.next({
          type: 'close',
        }),
    });
    parser.write(html);
    parser.end();
    observer.complete();
  });

//pipe toArray
type HtmlNodeNormal = {
  type: 'node';
  tag: string;
  attr: {};
  children: HtmlNode[];
  parent: HtmlNodeNormal | null;
};
type HtmlNodeText = {
  type: 'text';
  text: string;
  parent: HtmlNodeNormal;
};
type HtmlNode = HtmlNodeNormal | HtmlNodeText;

type Acc = {
  result: HtmlNodeNormal;
  pointer: HtmlNodeNormal;
};

const toDom = (rawNodes: HtmlNodeRaw[]) => {
  const root: HtmlNodeNormal = {
    type: 'node',
    tag: 'root',
    attr: {},
    children: [],
    parent: null,
  };

  let newPointer: HtmlNodeNormal;
  return R.reduce<HtmlNodeRaw, Acc>(
    ({ result, pointer }, curr) => {
      (curr.type === 'text'
        ? () => {
            pointer.children.push({
              type: 'text',
              text: (curr as HtmlText).text,
              parent: pointer,
            });
            newPointer = pointer;
          }
        : curr.type === 'open'
        ? () => {
            const newNode: HtmlNodeNormal = {
              type: 'node',
              tag: curr.tag,
              attr: curr.attr,
              parent: pointer,
              children: [],
            };
            pointer.children.push(newNode);
            newPointer = newNode;
          }
        : () => (newPointer = pointer.parent as HtmlNodeNormal))();

      return {
        result,
        pointer: newPointer,
      };
    },
    {
      result: root,
      pointer: root,
    },
    rawNodes
  ).result;
};

from(source)
  .pipe(
    map(fetchHtml),
    mergeMap<string, Observable<HtmlNodeRaw>>(toSplits),
    toArray(),
    map(toDom)
  )
  .subscribe(console.log);

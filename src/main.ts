import { from, map, tap } from 'rxjs';
import { IO, as } from 'fp-ts/IO';
import * as R from 'ramda';
import { isTable, takeBetween, getData, fmapedMap } from './utils.js';
import { AnchorType, checkAnchor, checkAnchorNegated, getAnchorType, getAnchors } from './anchors.js';
import axios, { AxiosResponse } from 'axios';
import { parseDocument, ElementType } from 'htmlparser2';
import { filter, getElementById, getElementsByTagName } from 'domutils';
import { AnyNode, Document, Element, Text } from 'domhandler';
import { toZodDescString } from './type-parser.js';
import { DtSchema, dtSolver } from './dt-solver.js';
import { mtSolver, MtSchema } from './mt-solver.js';

const main: IO<void> = () => {
  from(axios.get('https://core.telegram.org/bots/api#inputpaidmedia'))
    .pipe(
      map((axiosResponse: AxiosResponse) => {
        const fetchHtml = (response: AxiosResponse) => response.data as string;

        const docs = R.pipe(fetchHtml, (html: string) => parseDocument(html))(axiosResponse);
        //const contents = (getElementById('dev_page_content', docs) as Element).children;
        const anchors = R.pipe(getAnchors, R.dropWhile(checkAnchorNegated('getting-updates')))(docs);
        const anchorTypeEnum = [AnchorType.DataType, AnchorType.Method];

        const anchorFilterFactory = (anchorType: AnchorType) =>
          R.filter((anchor: Element) => getAnchorType(anchor) === anchorType);

        const anchorsFiltered = R.zipWith(
          R.call,
          R.map(anchorFilterFactory)(anchorTypeEnum),
          R.repeat(anchors, anchorTypeEnum.length)
        ) as Element[][];

        type Schema = DtSchema | MtSchema;
        return <[DtSchema[], MtSchema[]]>(
          R.zipWith(R.call, fmapedMap<Element, Schema>()([dtSolver, mtSolver]), anchorsFiltered)
        ); // Q.E.D
      }),
      tap(([dts, mts]) => {
        console.log(dts[0].schema);
        console.log(mts[0].schema);
      })
    )
    .subscribe();
};

main();
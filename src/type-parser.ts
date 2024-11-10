import * as R from 'ramda';
import { mapIndexed } from './utils.js';

export const unionToZodDesc = R.reduce(
  (left: string, right: string) => (left === '' ? right : `${left}.or(${right})`),
  ''
);

export const toZodDescString = (type: { desc: string; optional: boolean }) => {
  type ArrayDT = {
    type: 'array';
    wraps: DT;
  };
  type AtomicDT = {
    type: 'atomic';
    external: boolean;
    name: string;
    int: boolean;
    literal: boolean;
    basic: boolean;
  };
  type DT = ArrayDT | AtomicDT;
  type Ctx = {
    dts: DT[];
    optional: boolean;
  };

  const ctx: Ctx = {
    dts: [],
    optional: type.optional,
  };

  const { desc, optional } = type;

  // Literal Test
  const literalTest = (dt: AtomicDT): AtomicDT => {
    const LITERALS = ['True'] as const;
    type LiteralTypes = (typeof LITERALS)[number];
    const LITERALS_MAP: Record<LiteralTypes, string> = {
      True: 'true',
    };
    const literal = R.includes(dt.name)(LITERALS);
    return {
      ...dt,
      name: literal ? `z.literal(${LITERALS_MAP[dt.name as LiteralTypes]})` : dt.name,
      literal,
    };
  };

  //Basic Type Test
  const basicTypeTest = (dt: AtomicDT) => {
    const BASIC_TYPES = ['Integer', 'String', 'Boolean', 'Float'] as const;
    type BasicTypes = (typeof BASIC_TYPES)[number];
    const BASIC_TYPES_MAP: Record<BasicTypes, string> = {
      Boolean: 'boolean',
      String: 'string',
      Float: 'number',
      Integer: 'number',
    };
    const basic = R.includes(dt.name)(BASIC_TYPES);
    return {
      ...dt,
      basic,
      name: basic ? BASIC_TYPES_MAP[dt.name as BasicTypes] : dt.name,
    };
  };

  // External Test
  const externalTest = (dt: AtomicDT) => ({
    ...dt,
    external: !(dt.basic || dt.literal),
  });

  // Int Test
  const intTest = (dt: AtomicDT): AtomicDT => ({
    ...dt,
    int: dt.name === 'Integer',
  });

  // Analyzer
  const analyzer = (desc: string): DT => {
    const result = desc.match(/(?<=^Array of )[\s\S]*/);
    return result
      ? {
          wraps: analyzer(result[0]),
          type: 'array',
        }
      : R.pipe(
          literalTest,
          basicTypeTest,
          externalTest,
          intTest
        )({
          external: false,
          
          name: desc,
          int: false,
          type: 'atomic',
          literal: false,
          basic: false,
        });
  };

  // Divider
  const divider = (ctx: Ctx): Ctx => ({
    ...ctx,
    dts: R.pipe(R.split(' or '), R.map(analyzer))(desc),
  });

  const toZodDescFromDT = (dt: DT): string =>
    dt.type === 'atomic'
      ? R.join('')([dt.external || dt.literal ? dt.name : `z.${dt.name}()`, dt.int ? '.int()' : ''])
      : R.join('')([toZodDescFromDT(dt.wraps), '.array()']);

  const toZodDescFromOrigin = ({ dts, optional }: Ctx): string =>
    R.join('')([R.pipe(R.map(toZodDescFromDT), unionToZodDesc)(dts), optional ? '.optional()' : '']);

  const getExternalsFromDT = (dt: DT): string[] =>
    dt.type === 'atomic' ? (dt.external ? [dt.name] : []) : getExternalsFromDT(dt.wraps);

  const getExternalsFromOrigin = ({ dts }: Ctx): string[] =>
    R.pipe(R.map(getExternalsFromDT), R.reduce<string[], string[]>(R.concat, []))(dts);

  return R.pipe(divider, (ctx) => ({
    zodDescStr: toZodDescFromOrigin(ctx),
    externals: getExternalsFromOrigin(ctx),
  }))(ctx);
};

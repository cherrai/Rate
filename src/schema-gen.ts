import * as R from 'ramda';
import { toZodDescString } from './type-parser.js';

type Field = {
  key: string;
  desc: string;
  optional: boolean;
};

type RawSchema = {
  schemaName: string;
  zodDescs: ZodDesc[];
  externals: string[];
};

const toZodDesc = ({ key, desc, optional }: Field) => {
  const { zodDescStr, externals } = toZodDescString({
    desc,
    optional,
  });
  return {
    key,
    zodDescStr,
    externals,
  };
};

type ZodDesc = ReturnType<typeof toZodDesc>;
const getExternals = (ctx: RawSchema): RawSchema => {
  const { zodDescs } = ctx;
  return {
    ...ctx,
    externals: R.pipe(
      R.map((zodDesc: ZodDesc) => zodDesc.externals),
      R.filter((external) => external !== ctx.schemaName),
      R.reduce(R.concat, []),
      R.uniq
    )(zodDescs) as string[],
  };
};

const toSchema = (ctx: RawSchema) => {
  const { schemaName, zodDescs, externals } = ctx;

  const importParts = R.map((external) => `import { ${external} } from './${external}.js';`)(externals);

  const bodyParts = R.flatten([
    `export const ${schemaName} = z.object({`,
    R.map((desc: ZodDesc) => R.join('')(['  ', desc.key, ': ', desc.zodDescStr, ',']))(zodDescs),
    '});',
  ]);
  const inferParts = [`export type ${schemaName} = z.infer<typeof ${schemaName}>;`, '\n'];
  return R.join('\n')([
    ...importParts,
    ...(importParts.length ? [''] : []),
    ...bodyParts,
    ...(bodyParts.length ? [''] : []),
    ...inferParts,
  ]);
};

export { Field, toZodDesc, ZodDesc, getExternals, toSchema };

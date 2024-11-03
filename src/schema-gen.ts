import * as R from 'ramda';
import { toZodDescString, unionToZodDesc } from './type-parser.js';

type Field = {
  key: string;
  desc: string;
  optional: boolean;
};

type RawSchemaDT = {
  type: 'DT';
  schemaName: string;
  zodDescs: ZodDesc[];
  externals: string[];
};

type RawSchemaUN = {
  type: 'UN';
  schemaName: string;
  unions: string[];
  externals: string[];
};

type RawSchema = RawSchemaDT | RawSchemaUN;

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
const getExternals = (ctx: RawSchemaDT): RawSchemaDT => {
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
  const { schemaName, externals } = ctx;

  const importParts = R.map((external) => `import { ${external} } from './${external}.js';`)(externals);

  const bodyParts =
    ctx.type === 'DT'
      ? R.flatten([
          `export const ${schemaName} = z.object({`,
          R.map((desc: ZodDesc) => R.join('')(['  ', desc.key, ': ', desc.zodDescStr, ',']))(ctx.zodDescs),
          '});',
        ])
      : [`export const ${schemaName} = ${unionToZodDesc(ctx.unions)};`];

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

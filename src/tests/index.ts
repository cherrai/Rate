import { toZodDescString } from '../type-parser.js'
import { from, map, tap } from 'rxjs'

const cases = [
  {
    desc: 'Integer or User or Message',
    optional: true,
  },
  {
    desc: 'Array of User or Array of Message',
    optional: true,
  },
]

from(cases).pipe(map(toZodDescString), tap(console.log)).subscribe()

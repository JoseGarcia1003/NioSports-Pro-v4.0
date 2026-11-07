// Canonical JSON (RFC 8785 subset): object keys sorted by UTF-16 code units, no
// whitespace, numbers and strings in ECMAScript JSON form. The same value always
// yields the same bytes, in Node and in any browser, which is what makes a hash
// over it reproducible by anyone.
export function canonicalize(value) {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean': return value ? 'true' : 'false';
    case 'string': return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError('Non-finite numbers cannot be sealed');
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
    case 'object': {
      if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
      if (value instanceof Date) throw new TypeError('Dates must be ISO strings before sealing');
      const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
      return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
    }
    default: throw new TypeError(`Cannot seal a value of type ${typeof value}`);
  }
}

// Fast, dependency-free implementation of the csv-reader 1.0.0 readCsv contract.
// Fields are assembled from source slices; only escaped quotes and normalized CRs
// need fragments, so ordinary input does not incur per-character string building.
export function run(input) {
  const text = String(input.text);
  const hasHeader = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;
  let recordLine = 1;
  let recordRow = null;

  function addError(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  // Read an unquoted field (or the junk after a closed quoted field). A CR not
  // followed by LF is discarded, but still reported at the point it is met.
  function readUnquoted(prefix = '') {
    let start = pos;
    let pieces = null;
    let added = 0;

    while (pos < text.length) {
      const c = text.charCodeAt(pos);
      if (c === 44 || c === 10 || c === 13) {
        if (c === 13 && text.charCodeAt(pos + 1) !== 10) {
          if (pieces === null) pieces = [];
          if (pos > start) pieces.push(text.slice(start, pos));
          added += pos - start;
          addError('stray_cr');
          pos++;
          start = pos;
          continue;
        }
        if (pos > start) added += pos - start;
        let suffix;
        if (pieces === null) {
          suffix = text.slice(start, pos);
        } else {
          if (pos > start) pieces.push(text.slice(start, pos));
          suffix = pieces.join('');
        }
        const value = prefix.length === 0 ? suffix : (suffix.length === 0 ? prefix : prefix + suffix);
        if (c === 44) {
          pos++;
          return { value, ended: 1, added };
        }
        if (c === 10) {
          pos++;
          line++;
          return { value, ended: 2, added };
        }
        pos += 2;
        line++;
        return { value, ended: 2, added };
      }
      pos++;
    }

    if (pos > start) added += pos - start;
    let suffix;
    if (pieces === null) {
      suffix = text.slice(start, pos);
    } else {
      if (pos > start) pieces.push(text.slice(start, pos));
      suffix = pieces.join('');
    }
    return {
      value: prefix.length === 0 ? suffix : (suffix.length === 0 ? prefix : prefix + suffix),
      ended: 0,
      added,
    };
  }

  function readQuoted() {
    const opening = pos;
    const openingLine = line;
    let contentStart = pos + 1;
    let pieces = null;
    let value;
    let closed = false;
    pos++;

    while (pos < text.length) {
      const c = text.charCodeAt(pos);
      if (c === 34) {
        if (text.charCodeAt(pos + 1) === 34) {
          if (pieces === null) pieces = [];
          if (pos > contentStart) pieces.push(text.slice(contentStart, pos));
          pieces.push('"');
          pos += 2;
          contentStart = pos;
          continue;
        }
        if (pieces === null) value = text.slice(contentStart, pos);
        else {
          if (pos > contentStart) pieces.push(text.slice(contentStart, pos));
          value = pieces.join('');
        }
        pos++;
        closed = true;
        break;
      }
      if (c === 13) {
        if (pieces === null) pieces = [];
        if (pos > contentStart) pieces.push(text.slice(contentStart, pos));
        pieces.push('\n');
        line++;
        pos += text.charCodeAt(pos + 1) === 10 ? 2 : 1;
        contentStart = pos;
        continue;
      }
      if (c === 10) line++;
      pos++;
    }

    if (!closed) {
      // A non-closed opening quote is literal; reread the field as unquoted.
      pos = opening + 1;
      line = openingLine;
      addError('unterminated_quote');
      return readUnquoted('"');
    }

    if (pos >= text.length) return { value, ended: 0 };
    const next = text.charCodeAt(pos);
    if (next === 44) {
      pos++;
      return { value, ended: 1 };
    }
    if (next === 10) {
      pos++;
      line++;
      return { value, ended: 2 };
    }
    if (next === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line++;
      return { value, ended: 2 };
    }

    // Text after the closing quote is retained literally through the next
    // delimiter. quote_junk is based on retained characters, not dropped CRs.
    const junk = readUnquoted(value);
    if (junk.added > 0) addError('quote_junk');
    return junk;
  }

  while (true) {
    // Empty physical lines are not records. Lone CRs are handled as field text.
    while (pos < text.length) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos++;
        line++;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line++;
      } else break;
    }
    if (pos >= text.length) break;

    recordLine = line;
    recordRow = hasHeader && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === 34;
      field = quoted ? readQuoted() : readUnquoted();
      fields.push(field.value);
    } while (field.ended === 1);

    // A line consisting only of discarded lone CRs has no record.
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (hasHeader && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }

  return { columns: hasHeader ? (columns ?? []) : null, rows, errors };
}

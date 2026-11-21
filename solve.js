// A faster drop-in for make.fun's csv-reader 1.0.0: run(input) returns {columns, rows, errors}
// exactly as the reference does, reading the text left to right by the same broken-row policy,
// but with scans and slices instead of one character at a time.
//
// The policy, restated: a U+FEFF at the very start is dropped; a record ends at LF or CRLF and a
// line left with no characters is no record; outside a quoted field a CR not followed by LF is
// dropped (stray_cr); a field opening with a quote runs to the next quote that is not doubled,
// "" inside it one quote, and each CRLF or lone CR inside it read as LF; what follows its closing
// quote up to the next comma or line break is appended as it stands (quote_junk); a quote that
// never closes is a literal character and the text after it is read again as unquoted
// (unterminated_quote); a quote inside an unquoted field is literal; fields stay strings;
// columns is the first record when header is true, else null; rows are padded (short_row) or cut
// (long_row) to the first record's width; errors carry the line the record starts on and its row.

const COMMA = 1;
const LINE_BREAK = 2;
const END = 3;

const QUOTE = 34;
const COMMA_CODE = 44;
const LF = 10;
const CR = 13;
const BOM = 0xFEFF;

// The next position of a comma, a line break or a CR at or after `from`, or the text length.
function nextBreak(text, from) {
  const a = text.indexOf(',', from);
  const b = text.indexOf('\n', from);
  const c = text.indexOf('\r', from);
  let best = text.length;
  if (a >= 0 && a < best) best = a;
  if (b >= 0 && b < best) best = b;
  if (c >= 0 && c < best) best = c;
  return best;
}

function countLines(text) {
  let count = 0;
  let i = text.indexOf('\n');
  while (i >= 0) {
    count += 1;
    i = text.indexOf('\n', i + 1);
  }
  return count;
}

/** The reading of one CSV input, {text, header}: {columns, rows, errors}. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0;
  if (n > 0 && text.charCodeAt(0) === BOM) pos = 1;
  let line = 1;

  // Clean text — no quote and no CR anywhere — takes the split path: whole lines, then fields.
  if (text.indexOf('"') < 0 && text.indexOf('\r') < 0) {
    let lineStart = pos;
    let lineNo = 1;
    let first = true;
    while (lineStart <= n) {
      let lineEnd = text.indexOf('\n', lineStart);
      if (lineEnd < 0) lineEnd = n;
      if (lineEnd > lineStart) {
        const fields = [];
        let fieldStart = lineStart;
        while (true) {
          const comma = text.indexOf(',', fieldStart);
          if (comma < 0 || comma > lineEnd) {
            fields.push(text.slice(fieldStart, lineEnd));
            break;
          }
          fields.push(text.slice(fieldStart, comma));
          fieldStart = comma + 1;
        }
        if (width < 0) width = fields.length;
        if (header && first) {
          columns = fields;
          first = false;
        } else {
          const row = rows.length;
          if (fields.length < width) {
            errors.push({ code: 'short_row', line: lineNo, row, fields: fields.length });
            while (fields.length < width) fields.push('');
          } else if (fields.length > width) {
            errors.push({ code: 'long_row', line: lineNo, row, extra: fields.splice(width) });
          }
          rows.push(fields);
        }
      }
      if (lineEnd >= n) break;
      lineStart = lineEnd + 1;
      lineNo += 1;
    }
    return { columns: header ? (columns ?? []) : null, rows, errors };
  }

  let recordLine = 1;
  let recordRow = null;

  // Reads unquoted characters from pos onto `value` up to the next comma or line break.
  function readUnquoted(value) {
    let added = 0;
    while (pos < n) {
      const runStart = pos;
      let i = pos;
      while (i < n) {
        const c = text.charCodeAt(i);
        if (c === COMMA_CODE || c === LF || c === CR) break;
        i += 1;
      }
      if (i > runStart) {
        value += text.slice(runStart, i);
        added += i - runStart;
        pos = i;
        if (pos >= n) break;
      }
      const code = text.charCodeAt(pos);
      if (code === COMMA_CODE) {
        pos += 1;
        return { value, ended: COMMA, added };
      }
      if (code === LF) {
        pos += 1;
        line += 1;
        return { value, ended: LINE_BREAK, added };
      }
      // A CR: CRLF ends the record, a lone CR is dropped and recorded.
      if (text.charCodeAt(pos + 1) === LF) {
        pos += 2;
        line += 1;
        return { value, ended: LINE_BREAK, added };
      }
      errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
      pos += 1;
    }
    return { value, ended: END, added };
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let value = '';
    pos += 1;
    let closed = false;
    while (pos < n) {
      let i = pos;
      let sawCr = false;
      let sawLf = false;
      while (i < n) {
        const c = text.charCodeAt(i);
        if (c === QUOTE) break;
        if (c === CR) sawCr = true;
        else if (c === LF) sawLf = true;
        i += 1;
      }
      if (i >= n) break;
      let segment = text.slice(pos, i);
      if (sawCr) {
        segment = segment.replace(/\r\n?/g, '\n');
        line += countLines(segment);
      } else if (sawLf) {
        line += countLines(segment);
      }
      value += segment;
      const q = i;
      pos = q;
      if (text.charCodeAt(q + 1) === QUOTE) {
        value += '"';
        pos = q + 2;
        continue;
      }
      pos = q + 1;
      closed = true;
      break;
    }
    if (!closed) {
      // The quote never closes: a literal character, and the text after it read again as unquoted.
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      return readUnquoted('"');
    }
    if (pos >= n) return { value, ended: END, added: 0 };
    const code = text.charCodeAt(pos);
    if (code === COMMA_CODE) {
      pos += 1;
      return { value, ended: COMMA, added: 0 };
    }
    if (code === LF) {
      pos += 1;
      line += 1;
      return { value, ended: LINE_BREAK, added: 0 };
    }
    if (code === CR && text.charCodeAt(pos + 1) === LF) {
      pos += 2;
      line += 1;
      return { value, ended: LINE_BREAK, added: 0 };
    }
    const junk = readUnquoted(value);
    if (junk.added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
    return junk;
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const code = text.charCodeAt(pos);
      if (code === LF) {
        pos += 1;
        line += 1;
      } else if (code === CR && text.charCodeAt(pos + 1) === LF) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === QUOTE;
      field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
    } while (field.ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record.
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
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
  return { columns: header ? (columns ?? []) : null, rows, errors };
}

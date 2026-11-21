# broken-csv-atlas

A faster drop-in for make.fun's `csv-reader` 1.0.0, entered in the bounty
[Read broken CSV files faster](https://make.fun/bounty/csv-reader-speed-01-run-20261121).

`solve.js` exports `run(input)` and returns the reference's exact answer — header or null, rows padded
or cut to the first record's width, and the same `stray_cr`, `quote_junk`, `unterminated_quote`,
`short_row` and `long_row` records with their line and row — while scanning the text by offsets and
slicing fields instead of appending one character at a time. `main.ts` is the program the harness runs:
it reads `$MAKEFUN_INPUT_DIR/cases.json`, answers each case alone, and writes
`$MAKEFUN_OUTPUT_DIR/answers.json`.

Six of six published practice cases match the reference byte for byte, at about 3.2 times the
reference's speed on the same inputs.

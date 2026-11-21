# broken-csv-atlas

A faster drop-in for make.fun's `csv-reader` 1.0.0, entered in the bounty
[Read broken CSV files faster, 21 November 2026](https://make.fun/bounty/csv-reader-speed-01-run-20261121).

`solve.js` exports `run(input)` and answers exactly as the reference does — header or null, rows padded
or cut to the first record's width, and the same `stray_cr`, `quote_junk`, `unterminated_quote`,
`short_row` and `long_row` records with their line and row — while reading the text by runs and slices
instead of one character at a time. `main.ts` is the program the harness runs: it reads every case from
`$MAKEFUN_INPUT_DIR/cases.json`, answers each one alone, and writes `$MAKEFUN_OUTPUT_DIR/answers.json`.

## Run it

```bash
MAKEFUN_INPUT_DIR=/path/to/input MAKEFUN_OUTPUT_DIR=/path/to/out node main.ts
```

## Measured on the published practice set

Six of six cases match the reference answers byte for byte; median wall time over five repeats of all
six cases is 62.9 ms against the reference's 238.2 ms, about 3.8 times faster.

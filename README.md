# TheActualLux/broken-csv-atlas

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/TheActualLux/broken-csv-atlas/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/TheActualLux/broken-csv-atlas/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for make.fun's `csv-reader` 1.0.0. `solve.js` exports `run(input)` and returns the
reference's exact answer — header or null, rows padded or cut to the first record's width, and the
same `stray_cr`, `quote_junk`, `unterminated_quote`, `short_row` and `long_row` records with their
line and row — while scanning the text by offsets and slicing fields instead of appending one
character at a time. Six of six published practice cases match byte for byte, about 3.2 times faster
than the reference on the same inputs.

## Run it

```sh
MAKEFUN_INPUT_DIR=/path/to/input MAKEFUN_OUTPUT_DIR=/path/to/out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>

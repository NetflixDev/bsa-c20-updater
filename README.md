# BSA C2.0 Builder Template Updater

## Usage

- Script for updating multiple C2.0 Builder Templates using Build Source Assembler
- Currently builds serially for more consistent results
- Builder Templates should be in one directory

## CLI Arguments

```
bsa-c20-update <path-to-templates> [other CLI options]
```

- first: builder templates path
- `-m`/`--match`: `minimatch` pattern for specifying certain templates
  - sets `minimatch`'s `matchBase` option as true
- `--reinstall`: reinstalls build/front-end `node_modules`
- `--dry`: only lists selected templates, doesn't run build requests


# BSA C2.0 Builder Template Updater

## Background

This is a script for updating multiple C2.0 Builder Templates using Build Source Assembler. By installing this script via npm, it installs the following two binaries:

- `bsa-c20-update` - automates sending build requests to Build Source Assembler for multiple build templates
- `bt-redist-push` - bash script which iterates through each build template and does the following:
  - runs the `c20` npm script to redistribute the `src` files
  - thru git, commits all the changes with the given commit message then pushes to `master`

## Installation

1. Clone this repo
2. Then `cd` into the repo then run `npm install --global .` to install the command line binaries

## Usage

1. Run the Build Source Assembler app at localhost:4200
2. Have one designated directory for clones of all the build templates
3. `cd` into this directory of build templates
4. Run `bsa-c20-update` in this directory to send a build request to Build Source Assembler for each template
  - this process can take a while so be patient
  - see below for additional CLI arguments 
5. After the `bsa-c20-update` process finishes, run `bt-redist-push [commit msg]` in this same directory of build templates  
  - `[commit msg]` is the commit message that gets applied to this latest update for all the build templates
  - this also takes a bit so find a nice activity to pass the time
6. AFter `bt-redist-push` finishes, the build templates are updated on GitHub. All that's left to do is navigate to the Sources page of C2.0 to trigger a GitHub cache update

## CLI Arguments

```
bsa-c20-update <path-to-templates> [other CLI options]
```

- first: builder templates path
- `-m`/`--match`: `minimatch` pattern for specifying certain templates
  - sets `minimatch`'s `matchBase` option as true
- `--reinstall`: reinstalls build/front-end `node_modules`
- `--dry`: only lists selected templates, doesn't run build requests


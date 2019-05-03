#!/usr/bin/env node
const argv = require("minimist")(process.argv.slice(2));
const fsPr = require("fs").promises;
const path = require("path");
const os = require("os");
const fetch = require("node-fetch");
const cp = require("child_process");

const { cmdLog, cmdErrorLog, colors, chainPromises } = require("./lib/helpers");

const BSA_API_PATH = "http://localhost:4200/api"
const BSA_PREVIEW_PATH = `${BSA_API_PATH}/preview?zip=false`;
const BSA_BSIDS_PATH = `${BSA_API_PATH}/bsids`;
const BSA_BUILD_TIMEOUT = 18000 // 5 mins
const POLL_INTERVAL = 1000

async function main(btPath, reinstall, parallel) {
  const btRepos = await _getBtRepos(btPath);
  if (reinstall) await _reinstallBtSrcDirs(btRepos, btPath, parallel);
  const units = _buildBsaUnits(btRepos, btPath);
  const bsids = await _makeBsaBuildRequest({ units });
  console.log(
    colors.fg.Green,
    "\nBSA Build Request made w/ following repos:\n"
  );
  btRepos.forEach(repo => {
    console.log(`- ${repo}`);
  });
  console.log(colors.Reset);
  //  TODO: notify when BSA done w/ each repo (use /api/bsids)
  //  await _pollForBsaCompletion(bsids)
}

async function _getBtRepos(btPath) {
  try {
    const files = await fsPr.readdir(btPath);
    return files.filter(file => /^bt-ER-\d+x\d+.+$/.test(file));
  } catch (err) {
    throw err;
  }
}

async function _reinstallBtSrcDirs(btRepos, btPath, parallel = false) {
  const repoPaths = btRepos.map(repo => path.resolve(btPath, repo));
  const reinstallPromiseCreators = repoPaths.map(repoPath => {
    const cmd = `reinstall ${repoPath} src/node_modules`;
    return () =>
      new Promise((resolve, reject) => {
        const modulePath = path.dirname(require.main.filename);
        const childProc = cp.spawn(`${modulePath}/lib/reinstall`, [
          path.resolve(repoPath, "src")
        ]);
        childProc.on("message", cmdLog);
        childProc.on("error", cmdErrorLog);
        childProc.on("close", code => {
          if (code === 0) {
            console.log(colors.fg.Green, `${cmd} - complete`, colors.Reset);
            resolve();
          } else {
            const err = `${cmd} - exited w/ ${code}`;
            console.log(colors.fg.Red, err, colors.Reset);
            process.exit(1);
            reject(err);
          }
        });
      });
  });
  parallel
    ? await Promise.all(reinstallPromiseCreators.map(creator => creator()))
    : await chainPromises(reinstallPromiseCreators)();
}

async function _makeBsaBuildRequest(body) {
  try {
    const res = await fetch(BSA_PREVIEW_PATH, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" }
    });
    const json = await res.json()
    return json.bsids
  } catch (err) {
    throw err;
  }
}

async function _pollForBsaCompletion(bsids) {
  const pollPromise = new Promise((resolve, reject) => {
    setInterval(() => {
      const bsidResponse = await fetch(BSA_BSIDS_PATH)
      // TODO: if bsid complete based on bsid endpoint response
      // notify
    }, POLL_INTERVAL)
  })
}


function _extractRepoSize(repoName) {
  const match = /\d+x\d+/.exec(repoName);
  return match && match[0];
}

function _buildBsaUnits(btRepos, btPath) {
  const sizes = btRepos.map(_extractRepoSize);
  return sizes.map((size, idx) => {
    const btRepo = btRepos[idx];
    return {
      name: "src",
      build_size: size,
      build_source: {
        build_source_path: `./c20-builder-${size}/`
      },
      build_source_options: {
        stub_paths: []
      },
      output: path.resolve(btPath, btRepo),
      filters: {}
    };
  });
}

//

const btRelPath = argv._[0];
const reinstall = argv.reinstall;
const parallel = argv.parallel;

if (!btRelPath) {
  throw new Error(
    "Please provide a path to a directory that contains the C2.0 Build Template Repos"
  );
}

main(path.resolve(btRelPath), !!reinstall, !!parallel);

#!/usr/bin/env node
const argv = require("minimist")(process.argv.slice(2), {
  boolean: ["dry", "parallel"]
});
const fsPr = require("fs").promises;
const path = require("path");
const os = require("os");
const fetch = require("node-fetch");
const cp = require("child_process");
const minimatch = require("minimatch");

const {
  progressLog,
  cmdLog,
  cmdErrorLog,
  colors,
  chainPromises
} = require("./lib/helpers");

const BSA_API_PATH = "http://localhost:4200/api";
const BSA_PREVIEW_PATH = `${BSA_API_PATH}/preview?zip=false`;
const BSA_BSIDS_PATH = `${BSA_API_PATH}/bsids`;
const BSA_BUILD_TIMEOUT = 7200000; // 2 mins in ms
const POLL_INTERVAL = 1000;
const CREATIVE_SERVER_LIMIT = 5;

function uniq(arr) {
  return arr.filter((item, index) => arr.indexOf(item) === index);
}

async function main({ btPath, repos, reinstall, parallel, btMatch, dry }) {
  try {
    let btRepos =
      (repos.length && repos.map(repo => path.resolve(btPath, repo))) ||
      (await _getBtRepos(btPath));
    if (btMatch) {
      btRepos = btRepos.filter(repo => {
        return minimatch(repo, btMatch, {
          matchBase: true
        });
      });
    }
    btRepos = uniq(btRepos);

    if (dry) {
      console.log(
        colors.fg.Green,
        `\n${dry ? "Would rebuild" : "Rebuilding"} following repos:\n`
      );
      btRepos.forEach(repo => {
        console.log(`- ${repo}`);
      });
      console.log(colors.Reset);
      return;
    }

    const units = _buildBsaUnits(btRepos, btPath);
    const bsids = await _buildFromBsa(units, reinstall);
    console.log(
      colors.fg.Green,
      "\nBSA Build Request made w/ following repos:\n"
    );
    btRepos.forEach(repo => {
      console.log(`- ${repo}`);
    });
    console.log(colors.Reset);
    process.exit(0);
  } catch (err) {
    throw err;
    process.exit(1);
  }
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

async function _buildFromBsa(units, reinstall) {
  // split up units based on CS limit
  const reqBodies = [];
  // const splitLen = Math.ceil(CREATIVE_SERVER_LIMIT / 2);
  const splitLen = 1;
  for (let i = 0; i < units.length; i += splitLen) {
    reqBodies.push({
      units: units.slice(i, i + splitLen)
    });
  }
  let extraQueryParams = "";
  if (reinstall) {
    const reinstallLevel = reinstall === "top" ? "top" : "build";
    extraQueryParams += `&reinstall=${reinstallLevel}`;
  }
  const bsaBuilds = reqBodies.map((body, i) => () => {
    progressLog(`Sending BSA Request ${i}`);
    return fetch(BSA_PREVIEW_PATH + extraQueryParams, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" }
    })
      .then(() => _pollForBsaCompletion(i))
      .then(() => {
        progressLog(`BSA Request ${i} complete`);
      })
      .catch(err => {
        throw err;
      });
  });

  // await Promise.all(bsaBuilds.map(bsaBuild => bsaBuild()));

  const promise = chainPromises(bsaBuilds)();
  await promise;
}

function _pollForBsaCompletion(id) {
  let intervalId;
  const pollPromise = new Promise((resolve, reject) => {
    intervalId = setInterval(() => {
      progressLog(`Polling for request ${id}`);
      fetch(BSA_BSIDS_PATH)
        .then(res => {
          return res.json();
        })
        .then(json => {
          // resolve if response object is empty, i.e.
          if (!Object.keys(json).length) {
            clearInterval(intervalId);
            resolve();
          }
        })
        .catch(err => {
          clearInterval(intervalId);
          process.exit(1);
          reject(err);
        });
    }, POLL_INTERVAL);
  });
  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      clearInterval(intervalId);
      reject(new Error(`BSA Request ${id} timed out`));
    }, BSA_BUILD_TIMEOUT);
  });
  return Promise.race([pollPromise, timeout]).catch(err => {
    throw err;
  });
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
        build_source_path: `./c20-builder/c20-builder-${size}/`
      },
      build_source_options: {
        stub_paths: []
      },
      output: path.resolve(btPath, btRepo),
      filters: {}
    };
  });
}

// main execution

const repos = argv._;
const btRelPath = argv.p || argv.path || path.resolve(process.cwd());
const btMatch = argv.m || argv.match || null;
const reinstall = argv.reinstall;
const parallel = argv.parallel;
const dry = !!argv.dry;

if (!btRelPath) {
  throw new Error(
    "Please provide a path to a directory that contains the C2.0 Build Template Repos"
  );
}

main({
  btPath: path.resolve(btRelPath),
  repos,
  reinstall,
  parallel: !!parallel,
  btMatch,
  dry
});

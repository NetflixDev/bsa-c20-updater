#!/usr/bin/env node
const argv = require("minimist")(process.argv.slice(2));
const fsPr = require("fs").promises;
const path = require("path");
const os = require("os");
const fetch = require("node-fetch");
const cp = require("child_process");
const util = require('util')
const rimraf = require('rimraf')
const exec = util.promisify(cp.exec);

async function reinstall(src) {
  process.chdir(src)  
  const nodeModulesPath = path.resolve(process.cwd(), 'node_modules')  
  await new Promise((resolve, reject) => {
    rimraf(nodeModulesPath, err => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
  const { stdout, stderr } = await exec('npm install')

  if (stdout) {
    cmdLog(cmd, stdout)
  }

  if (stderr) {
    cmdLog(cmd, stderr)
  }
}

reinstall(argv._[0])

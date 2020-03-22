const path = require('path')
const fs = require('fs')
const assert = require('assert')
const downloadFile = require('./downloadFile')
const toPromise = require('./toPromise')

module.exports = async function downloadDir(dir, relativePath, destRootDir) {
  try {
    if (!dir.directory) {
      delete dir.storage
      delete dir.children
      assert(dir.directory, 'not a directory')
    }
    assert(dir.name != null, 'downloadDir: name is required')
    const dirPath = path.join(relativePath, dir.name.replace('/', '_'))
    const destDirPath = path.join(destRootDir, dirPath)
    await toPromise((cb) => fs.mkdir(destDirPath, cb)).catch(err => {
      if (err.code === 'EEXIST') return
      throw err
    })
    console.log(`downloadDir: mkdir ${dirPath}`)
    if (!dir.children) {
      console.warn(`downloadDir: no children ${dirPath}`)
      return
    }
    const downloadPromises = dir.children.map((child) =>
      child.directory
        ? downloadDir(child, dirPath, destRootDir)
        : downloadFile(child, dirPath, destRootDir)
    )
    await Promise.all(downloadPromises).catch(err => {
      err.alreadyLogged = true
    })
    console.log(`downloadDir: success ${dirPath}`)
  } catch(err) {
    if (!err.alreadyLogged)
      console.error(`downloadDir: error ${err.message}`, {
        relativePath,
        dir
      })
    throw err
  }
}

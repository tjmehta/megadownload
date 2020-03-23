const path = require('path')
const fs = require('fs')
const assert = require('assert')
const AsyncQueue = require('./AsyncQueue')

const MAX_CONCURRENT = 10
const MAX_NO_DATA_DURATION = 30000

const asyncQueue = new AsyncQueue(MAX_CONCURRENT)
const downloadingFiles = new Set()
const intervalId = setInterval(() => {
  console.log('\nDOWNLOADING FILES {')
  downloadingFiles.forEach((file) => {
    console.log('  ', file)
  })
  console.log('}\n')
  setTimeout(() => {
    if (downloadingFiles.size === 0) clearInterval(intervalId)
  }, 15000)
}, 10000)

module.exports = async function downloadFile(file, relativePath, destRootDir, failCount = 0) {
  try {
    assert(file.name != null, 'name is required')
    const filePath = path.join(relativePath, file.name.replace('/', '_'))
    const destFilePath = path.join(destRootDir, filePath)
    await asyncQueue.push(() => new Promise((resolve, reject) => {
      downloadingFiles.add(filePath)
      fs.stat(destFilePath, (err, stats) => {
        if (err && err.code != 'ENOENT') return void reject(err)
        if (stats && stats.size >= file.size) {
          console.warn(`downloadFile: already downloaded ${filePath}`)
          return void resolve()
        }
        const stream = file.download()
        const timerId = null
        stream.on('error', (err) => {
          if (timerId != null) clearTimeout(timerId)
          if (err.code === 'HPE_INVALID_CONSTANT') {
            console.warn(`downloadFile: file skipped ${filePath}`)
            return void resolve()
          }
          reject(err)
        })
        const writeFileStream = fs.createWriteStream(destFilePath)
        stream
          .pipe(writeFileStream)
          .on('error', (err) => {
            if (timerId != null) clearTimeout(timerId)
            reject(err)
          })
          .on('data', (data) => {
            if (timerId != null) clearTimeout(timerId)
            timerId = setTimeout(() => {
              stream.unpipe(writeFileStream)
              downloadFile(file, relativePath, destRootDir, failCount + 1).catch(reject).then(resolve)
            }, MAX_NO_DATA_DURATION)
          })
          .on('finish', () => {
            if (timerId != null) clearTimeout(timerId)
            resolve()
          })
      })
    }).finally(() => {
      downloadingFiles.delete(filePath)
    }))
    console.log(`downloadFile: success ${filePath}`)
  } catch(err) {
    console.error(`downloadFile: error ${err.message}`, {
      filePath: path.join(relativePath, file.name.replace('/', '_'))
    })
    // should retry at end..
    return downloadFile(file, relativePath, destRootDir)
  }
}

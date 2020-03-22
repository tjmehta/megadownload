const mega = require('megajs')
const assert = require('assert')
const downloadDir = require('./downloadDir')

const NODE_TYPE_DRIVE = 2

async function main() {
  const email = process.argv[2]
  assert(email, 'email is required')
  const password = process.argv[3]
  assert(password, 'password is required')
  const downloadPath = process.argv[4]
  assert(downloadPath, 'downloadPath is required')
  const storage = await new Promise((resolve, reject) => {
    const storage = new mega.Storage({
      email,
      password,
    }, (err) => {
      if (err) return void reject(err)
      resolve(storage)
    })
  })

  let rootDir = null
  for (let key in storage.files) {
    const file = storage.files[key]
    if (file.type === NODE_TYPE_DRIVE) {
      rootDir = file
    }
  }
  // const rootDir = {directory: true, name: 'yolo', children: []}

  assert(rootDir, 'rootDir not found')
  await downloadDir(rootDir, '', downloadPath)
  console.log('SUCCESS')
}

main().catch(err => {
  console.error('ERROR!')
  process.nextTick(() => {
    if (err.code === 'HPE_INVALID_CONSTANT') {
      console.log(err.rawPacket.toString())
    }
    throw err
  })
})

process.on('uncaughtException', (err) => {
  console.error('uncaughtException', { err })
  if (err.message.test(/mega server wait/)) return
  console.log(Date.now())
  throw err
})

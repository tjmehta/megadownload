module.exports = async function toPromise(task) {
  return new Promise((resolve, reject) => {
    task((err, result) => {
      if (err) return void reject(err)
      resolve(result)
    })
  })
}

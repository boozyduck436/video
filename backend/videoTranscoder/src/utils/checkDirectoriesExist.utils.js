import fs from 'fs'
import path from 'path'

export const checkDirectoriesExist = () => {
  // Define directories that need to exist
  const directories = [
    path.resolve('./tmp'),
    path.resolve('./tmp/input'),
    path.resolve('./tmp/output'),
  ]

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      console.log(`Directory ${dir} does not exist. Creating...`)
      fs.mkdirSync(dir, { recursive: true }) // Create the directory and any missing parent directories
    }
  })
}

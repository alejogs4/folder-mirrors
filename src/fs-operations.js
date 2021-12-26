const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { promisify } = require('util');
const { log } = require('./utils');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const removeFile = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

function existDirectory(directory) {
  return new Promise((resolve) => {
    fs.access(directory, (error) => {
      resolve(error ? false : true);
    });
  });
}

function existFile(filePath) {
  return new Promise((resolve) => {
    fs.access(filePath, fs.F_OK, (error) => {
      resolve(error ? false : true);
    });
  });
}

function getAllDirectoryWithoutFile(directory) {
  const [, ...allPath] = directory.split('/').reverse();
  return allPath.reverse().join('/');
}

function getFileSource(directory) {
  const [filename, lastDirectory] = directory.split('/').reverse();
  return `${lastDirectory}/${filename}`;
}

async function synchronizeTwoFiles(sourceDirectory, destinationDirectory, sourceFile) {
  const existsSourceDirectory = await existDirectory(sourceDirectory);
  const existsDestinationDirectory = await existDirectory(destinationDirectory);

  if (!existsSourceDirectory || !existsDestinationDirectory) {
    throw new Error("Some of the directories doesn't exists");
  }

  const sourceFileDirectory = path.join(sourceDirectory, sourceFile);
  const destinationFileDirectory = path.join(destinationDirectory, sourceFile);

  const existFileInDestination = await existFile(destinationFileDirectory);
  const sourceFileContent = await readFile(sourceFileDirectory, {
    encoding: 'utf8',
  });

  if (existFileInDestination) {
    const destinationFileContent = await readFile(destinationFileDirectory, {
      encoding: 'utf8',
    });

    const hashedSourceFile = crypto.createHash('sha256').update(sourceFileContent).digest('hex');
    const hashedDestinationFile = crypto.createHash('sha256').update(destinationFileContent).digest('hex');

    if (hashedSourceFile !== hashedDestinationFile) {
      await writeFile(destinationFileDirectory, new Uint8Array(Buffer.from(sourceFileContent)));
      log.modified(`File ${getFileSource(destinationFileDirectory)} modified`);
    }
    return;
  }

  await mkdir(getAllDirectoryWithoutFile(destinationFileDirectory), {
    recursive: true,
  });
  await writeFile(destinationFileDirectory, new Uint8Array(Buffer.from(sourceFileContent)));
  log.created(`File ${getFileSource(destinationFileDirectory)} created`);
}

async function removeMirrorFile(destinationDirectory, sourceFile) {
  const destinationFileDirectory = path.join(destinationDirectory, sourceFile);
  const existDestinationFileDirectory = await existFile(destinationFileDirectory);
  const removeFileOperation = existDestinationFileDirectory ? removeFile(destinationFileDirectory) : Promise.resolve();
  await removeFileOperation;

  log.removed(`File ${getFileSource(destinationFileDirectory)} removed`);
}

function removeDirectory(targetDirectory) {
  const existsRemovedDirectory = fs.existsSync(targetDirectory);

  if (!existsRemovedDirectory) return;
  const files = fs.readdirSync(targetDirectory);

  files.forEach((filename) => {
    const completePath = path.join(targetDirectory, filename);
    const { isDirectory } = fs.statSync(completePath);

    if (isDirectory) {
      removeDirectory(completePath);
    } else {
      fs.unlinkSync(completePath);
      log.removed(`File ${getFileSource(completePath)} removed \n`);
    }
  });

  fs.rmdirSync(targetDirectory);
  log.removed(`Directory ${targetDirectory} removed \n`);
}

module.exports = {
  synchronizeTwoFiles,
  removeMirrorFile,
  removeDirectory,
};

const os = require('os');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module

console.log('Platform:', os.platform());
console.log('CPU:', os.cpus()[0].model);
console.log('Total Memory:', os.totalmem());

// Path module
console.log('Joined path:', path.join('/path/to', 'sample-files', 'folder', 'file.txt'));

// fs.promises API
const sampleFile = path.join(__dirname, "sample-files", "demo.txt");
const content = "Hello from fs.promises!"
const doFileOperations = async () => {
  //writing file
  try {
    const fileHandle = await fsPromises.open(sampleFile, "w");
    await fileHandle.write(content);
    await fileHandle.close();
  } catch (error) {
    console.error('Error occurred:', error);
  }
  //reading file
  try {
    const data = await fsPromises.readFile(sampleFile, "utf8");
    console.log("fs.promises read:", data);
  } catch (err) {
    console.log("An error occurred.", err);
  }


// Streams for large files- log first 40 chars of each chunk

  // create a large file for demonstration
  const largeFile = path.join(__dirname, "sample-files", "large-file.txt");
  const largeContent = "This is a line in a large file...\n".repeat(100);
  await fsPromises.writeFile(largeFile, largeContent);
  // read the large file using streams

  const readStream = fs.createReadStream(largeFile, { 
    encoding: 'utf8',
    highWaterMark: 500  // 1KB chunks
  });

  readStream.on('data', (chunk) => {
  // console.log('Chunk size:', chunk.length, 'characters');
    // Log first 40 characters of each chunk as an example
    console.log('Read chunk:', chunk.slice(0, 33));
  });

  readStream.on('end', () => {
    console.log('Finished reading large file with streams.');
  });
}
doFileOperations();
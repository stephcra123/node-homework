const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');

// Write a sample file for demonstration
const content = "Hello, async world!";
const sampleFile = path.join(__dirname, "sample-files", "sample.txt"); 

const doFileOperations = async () => {
  try {
    const fileHandle = await fsPromises.open(sampleFile, "w");
    await fileHandle.write(content);
    await fileHandle.close();
  } catch (error) {
    console.error('Error occurred:', error);
  }

  // 1. Callback style
  const callbackStyle = () => {
      fs.readFile(sampleFile, "utf8", (err, data) => {
      if (err) {
        console.log("file read Callback error:", err.message);
      } else {
        console.log("file read Callback:", data);
      }
    });
  };
    callbackStyle();
  // Callback hell example (test and leave it in comments):
  //fs.readFile(sampleFile, "utf8", (err, fileContent) => {
  //  if (err) {
  //    console.log("file read failed: ", err.message);
  //  } else {
  //    console.log("file read succeeded.  The file content is: ", fileContent);
  //  }
  //});
  //console.log("last statement");


  // 2. Promise style
  const promiseStyle = async () => {
   try {
      const data = await new Promise((resolve, reject) => {
        fs.readFile(sampleFile, "utf8", (err, data) => {
          return err ? reject(err) : resolve(data);
        });
      });
      console.log("file read promise style:", data);
    } catch (err) {
      console.log("An error occurred.", err);
   }
  };

  promiseStyle();

  // 3. Async/Await style
  const asyncStyle = async () => { // you can't use await in mainline code, so you need this
    try {
      const fileContent = await fsPromises.readFile(sampleFile, "utf8");
     console.log("file read async/await style:", fileContent);
   } catch (err) {
      console.log("A error occurred.", err);
    }
  };
  asyncStyle(); 
};
doFileOperations(); 
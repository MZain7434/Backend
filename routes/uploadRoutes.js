const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const mime = require('mime-types');

const { promisify } = require("util");
const pipelineAsync = promisify(require("stream").pipeline);


const router = express.Router();

const upload = multer();

router.post("/resume", upload.single("file"), (req, res) => {
  const { file } = req;
  const fileSizeInBytes = file.size;
  const fileSizeInKB = Math.round(fileSizeInBytes / 1024);

  // Log the file size
  console.log("File Size:", fileSizeInKB, "KB");
  if (file.mimetype != "application/pdf") {
    
    res.status(400).json({
      message: "Invalid format",
    });
  } else {
    const filename = `${uuidv4()}.pdf`;
    const filePath = `${__dirname}/../public/resume/${filename}`;

    // pipelineAsync(
    //   file.stream,
    //   fs.createWriteStream(`${__dirname}/../public/resume/${filename}`)
    // )
    //   .then(() => {
      fs.writeFile(filePath, file.buffer, (err) => {
        if (err) {
          console.error("Error saving file:", err);
          res.status(500).json({
            message: "Error saving file",
          });
        } else {
          res.send({
            message: "File uploaded successfully",
            url: `/host/resume/${filename}`,
          });
        }
      });
    }
  });

module.exports = router;

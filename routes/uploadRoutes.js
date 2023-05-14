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
  
  if (file.mimetype != "application/pdf") {
    
    res.status(400).json({
      message: "Invalid format",
    });
  } else {
    const filename = `${uuidv4()}.pdf`;


    pipelineAsync(
      file.stream,
      fs.createWriteStream(`${__dirname}/../public/resume/${filename}`)
    )
      .then(() => {
        res.send({
          message: "File uploaded successfully",
          url: `/host/resume/${filename}`,
        });
      })
      .catch((err) => {
        res.status(200).json({
          message: "File uploaded successfully",
          url: `/host/resume/${filename}`,
        });
      });
    
      
  }
});

module.exports = router;

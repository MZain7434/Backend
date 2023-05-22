const express = require("express");
const nodemailer = require('nodemailer');
const passport = require("passport");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authKeys = require("../lib/authKeys");

const User = require("../db/User");
const Candidate = require("../db/Candidate");
const Recruiter = require("../db/Recruiter");
const frontendServer = require("../routes/FrontendServer");
const router = express.Router();

router.post("/signup", async (req, res) => {
  const data = req.body;
  const email = data.email;

  async function checkEmail(email) {
    const emailExists = await User.checkIfEmailExists(email);

    if (emailExists) {
      res.status(400).json({
        message: "User already exists",
      });
      return;
    }

    let user = new User({
      email: data.email,
      password: data.password,
      type: data.type,
    });

    try {
      await user.save();
      const userDetails =
        user.type == "recruiter"
          ? new Recruiter({
              userId: user._id,
              name: data.name,
            })
          : new Candidate({
              userId: user._id,
              name: data.name,
            });

      await userDetails.save();

      const token = jwt.sign({ _id: user._id }, authKeys.jwtSecretKey);
      res.json({
        name: userDetails.name,
        type: user.type,
        token: token,
      });
    } catch (err) {
      res.status(400).json(err);
    }
  }
  await checkEmail(email);
});
router.post("/forgotpassword", async (req, res) => {
  const { email } = req.body;
  try {
    const userExists = await User.checkIfEmailExists(email);

    if (!userExists) {
      return res.status(400).json({ message: "User does not exist" });
    }

    const token = jwt.sign({ email }, authKeys.jwtSecretKey);
    const link = `${frontendServer}/resetpassword?email=${email}&token=${token}`;

    // Add code to send the link or perform further actions as needed
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'talentmatch43@gmail.com',
        pass: 'hhcrflkunevpozhk'
      }
    });
    
    var mailOptions = {
      from: 'talentmatch43@gmail.com',
      to: email,
      subject: 'Password Reset Link',
      text: link
    };
    
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
    res.json({ link:link,message: "Password reset link sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/resetpassword", async (req, res) => {
  const { password, email, token } = req.body;
  try {
    const userExists = await User.checkIfEmailExists(email);

    if (!userExists) {
      return res.status(400).json({ message: "User does not exist" });
    }
    try {
      const verify = jwt.verify(token, authKeys.jwtSecretKey);

      const encryptedPassword = await bcrypt.hash(password, 10);
      
      await User.updateOne(
        {
          email: email,
        },
        {
          $set:{
            password :encryptedPassword,
          },
        }
      );
      
      res.json({ message: "Password Reset Successfully!" });
    } catch (error) {
      res.json({ message: "Not verified!" });
    }
  } catch (error) {
    res.status(500).json({message: "Server Error. Try Later!"})
  }
});

router.post("/login", (req, res, next) => {
  passport.authenticate(
    "local",
    { session: false },
    function (err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        res.status(401).json(info);
        return;
      }
      // Token
      const token = jwt.sign({ _id: user._id }, authKeys.jwtSecretKey);
      res.json({
        token: token,
        type: user.type,
      });
    }
  )(req, res, next);
});

module.exports = router;

var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var randomize = require("randomatic");
require("dotenv").config();
var messageBird = require("messagebird")(process.env.MESSAGEBIRD_API_KEY);
var mongoose = require("mongoose");
var async = require("async");
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var cookieSession = require("cookie-session");

//SETTING COOKIE-SESSION
app.use(
  cookieSession({
    maxAge: 24 * 60 * 60 * 1000,
    keys: ["secret"],
  })
);

app.use(passport.initialize());
app.use(passport.session());

//SERIALIZIING USER
passport.serializeUser(function (user, cb) {
  cb(null, user.id);
});

//DESERIALIZING USER
passport.deserializeUser(function (id, cb) {
  admin.findById(id, function (err, user) {
    cb(err, user);
  });
});

//CONNECTING DB
const ur =
  "mongodb+srv://sswarajsamant:" +
  process.env.PASSWORD +
  "@students-s3blg.mongodb.net/kiitict";

const url = process.env.URL;

mongoose.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//ADMIN SCHEMA
var adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});

var admin = mongoose.model("admin", adminSchema);

//USER SCHEMA
var userSchema = new mongoose.Schema({
  name: String,
  roll: Number,
  phone: Number,
  laptopSno: String,
  uid: String,
  problem: String,
  sms1: Boolean,
  sms2: Boolean,
  sms3: Boolean,
  status: Boolean,
  date: String,
  time: String,
  ddate: String,
  dtime: String,
});

var user = mongoose.model("user", userSchema);

//isAuthenticated FUNCTION
function isAuthenticated(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

app.use(bodyParser.urlencoded({ extended: true }));

//PASSPORT LOCAL AUTHENTICATION
passport.use(
  new LocalStrategy(function (username, password, done) {
    admin.findOne({ username: username }, function (err, response) {
      if (err) {
        console.log(err);
        return done(err);
      }
      if (!response) {
        console.log("Incorrect username");
        return done(null, false, { message: "Incorrect Username." });
      }
      if (response.password != password) {
        console.log("Incorrect Password." + password);
        return done(null, false, { message: "Incorrect password." });
      }
      console.log("Successfull");
      return done(null, response);
    });
  })
);

//GET REQUESTS

//HOME ROUTE
app.get("/", function (req, res) {
  // admin.create({ username: "admin", password: "admin" }, function(err, admin) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     console.log(admin);
  //   }
  // });

  res.render("home.ejs");
});

//STATUS ROUTE
app.get("/status", function (req, res) {
  res.render("status.ejs");
});

//COMPLAINT ROUTE
// app.get("/complaint", function(req, res) {
//   var duplicate = true;
//   var uid = "";

//   while (duplicate === true) {
//     uid = randomize("A0", 7);
//     user.find({ uid: uid }, function(err, respon) {
//       if (err) {
//         console.log(err);
//       } else {
//         if (respon.length > 0) {
//           console.log("Uid already exists");
//           duplicate = true;
//         } else {
//           duplicate = false;
//           continue finding;
//           break;
//         }
//       }
//     });
//   }
//   finding: user.find({ uid: uid }, function(err, res) {
//     if (err) {
//       console.log(err);
//     } else {
//       res.render("complaint.ejs", { uid: uid });
//     }
//   });
// });

app.get("/complaint", isAuthenticated, async function (req, res) {
  var cuid = "";
  var dup = 1;
  while (dup == 1) {
    cuid = randomize("A0", 8);
    var us = await user.findOne({ uid: cuid });
    if (us) {
      console.log("FOUND");
    } else {
      console.log("NOT FOUND");
      dup = 0;
    }
  }
  res.render("complaint.ejs", { uid: cuid });
});

//REGISTERED SECCESSFULLY ROUTE
app.get("/complaintReg/:uid", isAuthenticated, function (req, res) {
  var uid = req.params.uid;
  console.log("Complaint Resgistered Successfully : " + uid);
  res.render("complaintReg.ejs", { uid: uid });
});

//ADMIN LOGIN ROUTE
app.get("/login", function (req, res) {
  if (req.user) {
    res.redirect("/admin");
  } else {
    res.render("adminLogin.ejs");
  }
});

//ADMIN LOGOUT ROUTE
app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

//ADMIN HOME ROUTE
app.get("/admin", isAuthenticated, function (req, res) {
  res.render("admin.ejs");
});

//DELIVER ROUTE
app.get("/admin/deliver/:uid", isAuthenticated, function (req, res) {
  var uid = req.params.uid;
  var dnt = new Date();
  var dd = dnt.toISOString().slice(0, 10);
  var dt = dnt.getHours() + ":" + dnt.getMinutes() + ":" + dnt.getSeconds();
  user.findOneAndUpdate(
    { uid: uid },
    { $set: { status: true, ddate: dd, dtime: dt } },
    function (err, resp) {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/admin/open");
      }
    }
  );
});

//SEND SMS ROUTE
app.get("/admin/sendsms/:uid/:phone/:sno/:no", isAuthenticated, function (
  req,
  res
) {
  var uid = req.params.uid,
    phone = "+91" + req.params.phone,
    sno = req.params.sno,
    no = req.params.no;
  var msg =
    "Hey, Your Laptop with Serial number- " +
    sno +
    " and Unique Id-" +
    uid +
    " is ready for pickup from KIIT ICT.";
  var par = {
    originator: process.env.ORIGINATOR,
    recipients: [phone],
    body: msg,
  };
  messageBird.messages.create(par, function (err, response) {
    if (err) {
      console.log(err);
      res.redirect("/allProb");
    } else {
      console.log(response);
      var update;
      if (no == 1) {
        update = { sms1: true };
      } else if (no == 2) {
        update = { sms2: true };
      } else if (no == 3) {
        update = { sms3: true };
      }
      user.findOneAndUpdate({ uid: uid }, { $set: update }, function (
        err,
        resp
      ) {
        if (err) {
          console.log(err);
        } else {
          res.redirect("/admin/open");
        }
      });
    }
  });
});

//ADMIN OPEN REQUESTS ROUTE
app.get("/admin/open", isAuthenticated, function (req, res) {
  user.find({}, function (err, user) {
    if (err) {
      console.log(err);
    } else {
      res.render("adminOpen.ejs", { user: user });
      console.log("Users found " + user);
    }
  });
});

//ADMIN CLOSED REQUESTS ROUTE
app.get("/admin/closed", isAuthenticated, function (req, res) {
  user.find({}, function (err, user) {
    if (err) {
      console.log(err);
    } else {
      res.render("adminClosed.ejs", { user: user });
      console.log("Users found " + user);
    }
  });
});

//SEARCH ROUTE
app.get("/allProb", isAuthenticated, function (req, res) {
  user.find({}, function (err, user) {
    if (err) {
      console.log(err);
    } else {
      res.render("allProb.ejs", { user: user });
      console.log("Users found " + user);
    }
  });
});

//POST ROUTES

//REGISTERING COMPLAINT ROUTE
app.post("/complaint/:uid", isAuthenticated, function (req, res) {
  var uid = req.params.uid,
    name = req.body.name,
    roll = req.body.roll,
    phone = req.body.phon,
    laptopSno = req.body.laptopSno,
    problem = req.body.problem;

  var dateTime = new Date();
  var date = dateTime.toISOString().slice(0, 10);
  var time =
    dateTime.getHours() +
    ":" +
    dateTime.getMinutes() +
    ":" +
    dateTime.getSeconds();

  var register = {
    name: name,
    roll: roll,
    phone: phone,
    laptopSno: laptopSno,
    uid: uid,
    problem: problem,
    sms1: false,
    sms2: false,
    sms3: false,
    status: false,
    date: date,
    time: time,
  };

  user.create(register, function (err, register) {
    if (err) {
      console.log(err);
    } else {
      console.log("Complaint Registration Started : " + register);
      res.redirect("/complaintReg/" + uid);
    }
  });
});

//FINDING STATUS
app.post("/status", function (req, res) {
  var uid = req.body.uid;
  var roll = req.body.roll;
  user.findOne({ uid: uid, roll: roll }, function (err, resp) {
    if (err) {
      console.log(err);
    } else {
      res.render("showStatus.ejs", { user: resp });
    }
  });
});

//ADMIN LOGGIN IN
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/admin",
    failureRedirect: "/login",
  })
  // function (req, res) {
  //   res.redirect("/admin");
  // }
);

//HANDLING ALL WRONG REQUESTS
app.get("*", function (req, res) {
  res.render("wrong.ejs");
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server Started");
});

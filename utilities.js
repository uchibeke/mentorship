var Parse = require("./parse");

var Canvas = require("canvas")
  , fs = require("fs");

var args = process.argv.slice(2);

var Ticket = Parse.Object.extend("MentorTicket");
var User = Parse.Object.extend("MentorUser");

var reset = function() {
  Parse.User.requestPasswordReset(args[1], {
    success: function() {
      console.log("Reset email sent successfully.");
    },
    error: function(error) {
     console.log(error.message);
    }
  });
}

var passwordgen = require("./passwordgen");

// var signup = function() {
//   var user = new Parse.User();
//   user.set("email", args[1]);
//   user.set("username", args[1]);
//   user.set("password", args[2]);

//   user.signUp(null, {
//     success: function(user) {
//       console.log("User created");
//     },
//     error: function(user, error) {
//       console.log(error.message);
//     }
//   });
// };

var email   = require("emailjs");
var server  = email.server.connect({
   user:    "rpalefsk", 
   password:"Shl0m0llie7!", 
   host:    "smtp.stanford.edu", 
   ssl:     true
});

var sendEmailTo = function(mentor) {
  var p = mentor.get("passphrase");
  var name = mentor.get("name");
  var email = mentor.get("email");
  // send the message and get a callback with an error or details of the message that was sent
  server.send({
     text:    fs.readFileSync(__dirname + "/email.txt").toString().replace("{passphrase}", p), 
     from:    "Raphael Martin Palefsky-Smith <rpalefsk@stanford.edu>", 
     to:      name + " <" + email + ">",
     subject: "TreeHacks Mentor Setup",
     attachment: [
      {data:fs.readFileSync(__dirname + "/mentor.html").toString().replace("{passphrase}", p), alternative:true}
     ]

  }, function(err, message) { console.log(err || message); });
}

var signup = function() {
  var user = new User();
  user.set("email", args[1]);
  user.set("type", "mentor");
  user.set("name", args.slice(2).join(" "));
  user.set("state", "signup");
  user.set("miscellaneous", true);
  user.set("tags", []);
  user.set("workedWith", {});
  user.set("appearance", "");
  user.set("passphrase", passwordgen.randomPhrase(2));

  user.save(null, {
    success: function(user) {
      console.log("Password: " + user.get("passphrase"));
      var url = "88798f5.ngrok.com";
      console.log("Settings: " + url + "/s#" + user.id);
      var hackerNum = "+16572422537";
      var mentorNum = "+14157636867";
      console.log("Hacker number: 657-242-2537");
      console.log("Mentor number: 415-763-6867");
    },
    error: function(user, error) {
      console.log(error.message);
    }
  });
};

var clear = function() {
  var query1 = new Parse.Query(Ticket);
  var query2 = new Parse.Query(User);
  Parse.Promise.when([query1.find(), query2.find()]).then(function(tickets, users) {
    var promises = [];
    tickets.forEach(function(ticket) {
      promises.push(ticket.destroy());
    });
    users.forEach(function(user) {
      promises.push(user.destroy());
    });
    return Parse.Promise.when(promises);
  })
  .then(function() {
    console.log("everything has been cleared");
  });
}

var sponsors = [
  "Illumina (Research)",
  "Vertical Response",
  "APT",
  "iDrone",
  "MongoDB",
  "Atomiton",
  "Gun",
  "MakeSchool",
  "Google",
  "Emotiv",
  "School of H&S",
  "Stanford CS",
  "Branch Metrics",
  "Oracle",
  "Bloomberg",
  "Intel",
  "GoDaddy",
  "Moxtra",
  "Capital One",
  "D21",
  "Illumina (Enterprise Informatics)",
  "DIRECTV",
  "Dropbox",
  "Yelp",
  "Thumbtack",
  "Facebook",
  "AT&T",
  "Sift Science",
  "Counsyl",
  "Smart Things",
  "IBM",
  "Pebble",
  "Cyanogen",
  "OpenTable",
  "Slice",
  "Zayo",
  "Knight Capital Group (KCG)",
  "BrainTree",
  "KPCB",
  "HackerRank",
  "A16Z",
  "URX",
  "Citrine",
  "Intel Mashery",
  "Neurotrack",
  "Affirm",
  "Burstorm",
  "Thiel Capital",
  "NameCheap",
  "SendGrid",
  "Microsoft",
  "Apple",
  "CA Technologies",
  "Orange"
];

var generatePages = function(numPages, arg) {
  var canvas = (arg == "sponsors") ? new Canvas(3330, 2550, "pdf") : new Canvas(2550, 3300, "pdf");
  var yMargin = 225, xMargin = 100;
  var ctx = canvas.getContext("2d")


  var plotSequentially = function(x, y, texts, fonts) {
    for(var i = 0; i < texts.length; i++) {
      ctx.font = fonts[i];
      ctx.fillText(texts[i], x, y);
      var measure = ctx.measureText(texts[i]);
      x += measure.width;
    }
  }


  var plotTitles = function() {
    plotSequentially(
      xMargin, yMargin,
      ["TREE", "HACKS MENTORSHIP"], 
      ["150px AvenirNext-Regular", "150px AvenirNext-Bold"]
    );

    plotSequentially(
      xMargin, canvas.height - 125,
      ["FAQ: ", "MENTOR.TREEHACKS.COM"], 
      ["100px AvenirNext-Bold", "100px AvenirNext-Regular"]
    );

    plotSequentially(
      xMargin, canvas.height - 475,
      ["TEXT FOR HELP: ", "(657) 242-2537"], 
      ["100px AvenirNext-Bold", "100px AvenirNext-Regular"]
    );
  }


  var plotNumber = function(num) {
    var str = "" + num;
    ctx.font = "800px AvenirNext-Bold";
    var centerMeasure = ctx.measureText(str);
    var lineHeight = ctx.measureText("M").width;
    ctx.fillText(
      str,
      (canvas.width / 2) - (centerMeasure.width / 2),
      (canvas.height / 2)
    );

    plotSequentially(
      xMargin, canvas.height - 300,
      ["EXAMPLE TEXT: ", "\"" + num + " JAVASCRIPT CSS\""], 
      ["100px AvenirNext-Bold", "100px AvenirNext-Regular"]
    );
  }

  var plotBlank = function() {
    plotSequentially(
      xMargin, canvas.height - 300,
      ["EXAMPLE TEXT: ", "\"       JAVASCRIPT CSS\""], 
      ["100px AvenirNext-Bold", "100px AvenirNext-Regular"]
    );
  }

  var plotSponsor = function(sponsor) {
    console.log(sponsor);
    ctx.font = "200px AvenirNext-Bold";
    var centerMeasure = ctx.measureText(sponsor);
    var lineHeight = ctx.measureText("M").width;
    ctx.fillText(
      sponsor,
      (canvas.width / 2) - (centerMeasure.width / 2),
      (canvas.height / 2)
    );
  }

  var start = parseInt(arg);

  if (arg == "sponsors") {
    for (var i = 0; i < sponsors.length; i++) {
      plotSponsor(sponsors[i]);
      ctx.addPage();
    }
  } else {
    for(var i = 0; i < numPages; i++) {
      plotTitles();
      if (arg == "blank") {
        plotBlank();
      } else {
        plotNumber(start++);
      }
      ctx.addPage();
    }
  }


  var buf = canvas.toBuffer();
  fs.writeFileSync('out.pdf', buf);
  var exec = require('child_process').exec;
  exec("open " + __dirname + "/out.pdf", function() {
    // output is in stdout
    });
}

console.log("YO")

if (args[0] == "pdf") {
  generatePages(args[1], args[2]);
} else {
  Parse.User.logIn("master", "i hate parse")
  .then(function() {

    switch(args[0]) {
      case "clear":
        clear();
        break;
      case "signup":
        signup();
        break;
      case "reset":
        reset();
        break;
      case "email":
        var query = new Parse.Query(User);
        query.equalTo("state", "signup");
        query.find().then(function(mentors) {
          mentors.forEach(function(m) {
            sendEmailTo(m);
          })
        });
        break;
      // case "deduplicate":
      //   var query = new Parse.Query(User);
      //   query.equalTo("type", "mentor");
      //   query.find().then(function(mentors) {
      //     mentors.forEach(function(m) {
      //     })
      //   });


    }
  }, function(e) {
    console.log(e);
  });
}




var express = require("express");
var webshot = require("webshot");
var bodyParser = require("body-parser")

var twilioId = "REDACTED";
var twilioAuth = "REDACTED";
var twilio = require("twilio");
var client = twilio(twilioId, twilioAuth);

var CronJob = require('cron').CronJob;


console.log("Running in environment: ", process.env.ENVIRONMENT);


var url = process.env.ENVIRONMENT == "development" ? "http://88798f5.ngrok.com" : "http://mentor.treehacks.com";
var stripped = process.env.ENVIRONMENT == "development" ? "88798f5.ngrok.com" : "mentor.treehacks.com";

var hackerNum = "+16572422537";
var hackerSID = "PNf694e5ce3f5cf13bfabe0bf5fd259480";

var mentorNum = "+14157636867";
var mentorSID = "PNa72f8f13fa006ebf894cc224a7d28d85";

client.incomingPhoneNumbers(hackerSID).put({
  VoiceUrl: url + "/voice",
  SmsUrl: url + "/hacker",
  SmsFallbackUrl: "http://mentor.treehacks.com:3000/fallback",
  VoiceFallbackUrl: "http://mentor.treehacks.com:3000/voice"

}, function(e, r) {
  console.log("HACKER UPDATE", e);
});

client.incomingPhoneNumbers(mentorSID).put({
  VoiceUrl: url + "/voice",
  SmsUrl: url + "/mentor",
  SmsFallbackUrl: "http://mentor.treehacks.com:3000/fallback",
  VoiceFallbackUrl: "http://mentor.treehacks.com:3000/voice"
}, function(e, r) {
  console.log("MENTOR UPDATE", e);
});


var ejs = require("ejs"),
    fs = require("fs"),
    cardFile = fs.readFileSync(__dirname + "/views/card.ejs", "ascii");

var Q = require("q");

var Parse = require("./parse");
var passwordgen = require("./passwordgen");

var Ticket = Parse.Object.extend("MentorTicket");
var User = Parse.Object.extend("MentorUser");

var moment = require("moment");



// hacker states
  // none (not currently involved in anything)
  // incomplete (incomplete ticket submitted)
  // submitted (ticket was submitted)
  // inprogress (ticket was claimed and is now in progress)

// mentor states
  // signup (hasn't texted yet)
  // on (not currently involved in anything but down for notifications)
  // off (has turned texts off)
  // proposed (a ticket has been proposed to the mentor)
  // inprogress (claimed ticket, now working on it)

// ticket states
  // incomplete (still needs a seat number)
  // submitted -- hasn't been proposed to anyone yet, or has been proposed to everyone
  // proposed -- is currently being proposed to the associated mentor
  // inprogress (mentor has claimed it, and is now working on it)
  // closed (duh)
  // cancelled (duh)

var newHacker = function(number) {
  var user = new User();
  var type = "hacker";
  user.set("type", type);
  user.set("phoneNumber", number);
  user.set("username", number + "-" + type);
  user.set("state", "none");
  return user.save(null);
}

var userForNumber = function(number, type) {
  var query = new Parse.Query(User);
  query.equalTo("phoneNumber", number);
  query.equalTo("type", type);
  return query.first();
};

var mentorWithPassphrase = function(number, text) {
  var query = new Parse.Query(User);
  console.log("TEXT IS", {text: text.trim()});
  query.equalTo("passphrase", text.trim());
  query.equalTo("state", "signup");
  query.equalTo("type", "mentor");
  return query.first()
  .then(function(user) {
    if (!user) return null;

    user.set("phoneNumber", number);
    user.set("username", number + "-" + "mentor");
    user.set("state", "on");
    return user.save(null);
  });
}

var settingsUrl = function(user) {
  return stripped + "/s#" + user.id;
};

var aliases = [
 ["js", "javascript"],
 ["api", "apis"],
 ["angular", "angularjs", "angular.js"],
 ["react", "reactjs", "react.js"],
 ["ember", "emberjs", "ember.js"],
 ["node", "nodejs", "node.js"],
 ["backbone", "backbonejs", "backbone.js"],
 ["rails", "ruby on rails", "ruby-on-rails", "rubyonrails"],
 ["ios", "objective c", "objective-c", "objectivec", "iphone", "iphones", "ipad", "ipads", "apple"],
 ["ios", "swift"],
 ["oculus", "rift", "oculus rift", "oculus-rift"],
 ["mongo", "mongodb"]
];

var containsTags = function(text, tags) {
  tags = tags.map(function(t) {
    return t.toLowerCase();
  });
  text = text.toLowerCase();
  tags = tags.concat("any");
  aliases.forEach(function(list) {
    list.forEach(function(alias) {
     if (tags.indexOf(alias) != -1) {
         list.forEach(function(item) {
           if (tags.indexOf(item) == -1) {
               tags = tags.concat(item);
           }
         });
     }
   });
 });

 function escapeRegExp(str) {
   return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
 }

 var duplicates = {};

  var filtered = tags.filter(function(tag) {
    var reg = new RegExp("(^|\\s)" + escapeRegExp(tag) + "($|\\s)");
    return text.match(reg);
  })
  .filter(function(tag) {
    if (tag in duplicates) return false;
    duplicates[tag] = true;
    return true;
  });

 console.log(filtered);

 return filtered;
};



var app = express();


var parseSeat = function(s) {
  var nums = [];

  var tokens = s.split(/\s|,/);
  tokens.forEach(function(tokens) {
    var parsed = parseInt(tokens);
    if (!isNaN(parsed)) {
      nums.push(parsed);
    }
  });

  return nums;
};

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static(__dirname + "/public"));

var twilioMiddleware = function(type) {
  return function(req, res, next) {
    if (!twilio.validateExpressRequest(req, twilioAuth)) {
      return res.status(401).send("You're not twilio!");
    }

    req.text = req.body.Body.toLowerCase();

    userForNumber(req.body.From, type, req.text)
    .then(function(u) {
      if (u) {
        req.user = u;
        return next();
      }
      if (type == "hacker") {
        return newHacker(req.body.From).then(function(u) {
          req.user = u;
          return next();
        });
      }
      // type must be mentor
      return mentorWithPassphrase(req.body.From, req.text).then(function(u) {
        if (u) {
          req.user = u;
          return res.send(twiml("Hey " + u.get("name") + ", welcome to TreeHacks Mentorship! Set up your tags (and access settings -- remember to hit save!) here: " + settingsUrl(u)));
        } else {
          return res.send(twiml("Whoops, no mentor matches that passphrase. Are you sure you typed it correctly?"));
        }

      });



    }, function(e) {
      console.log(e);
      res.status(500).send(e.message);
    });
  };
};

var renderPromises = {};
var twiml = function(message) {
  return "<Response><Message>" + message + "</Message></Response>";
};

var saveAndSend = function(toSave, res, msg) {
  console.log("SAVING AND SENDING", msg);
  var promises = toSave.map(function(obj) {
    return obj.save(null);
  });
  Parse.Promise.when(promises)
  .then(function(x) {
    // console.log(x);
    res.send(twiml(msg));
  }, function(e) {
    console.log(e);
    // res.status(500).send(e.message);
  });
}

var ticketForMentor = function(mentor, state) {
  var query = new Parse.Query(Ticket);
  query.equalTo("mentor", mentor);
  query.equalTo("state", state);
  query.include("hacker");
  return query.first();
};


app.post("/mentor", twilioMiddleware("mentor"), function(req, res) {
  console.log("GOT TEXT", req.text);

  if (req.text == "off") {
    req.user.set("state", "off");
    return saveAndSend([req.user], res, "Text notifications have been turned off! Reply with literally anything to turn them back on.");
  }

  switch(req.user.get("state")) {
    case "on":
      res.send(twiml("You're not assigned to any ticket right now! Sit tight."))
      break;
    case "off":
      req.user.set("state", "on");
      return saveAndSend([req.user], res, "Text notifications have been turned back on! Get ready for some tickets!");
    case "proposed":
      ticketForMentor(req.user, "proposed").then(function(ticket) {
        var hacker = ticket.get("hacker");
        hacker.set("state", "inprogress");
        req.user.set("state", "inprogress");
        ticket.set("state", "inprogress");
        ticket.set("claimedAt", new Date());
        saveAndSend([hacker, req.user, ticket], res, "Ticket claimed - the hacker has been notified that you're on your way :) Reply again when you're done to close the ticket.");
        var apperance = req.user.get("appearance") ? " (" + req.user.get("appearance") + ") " : " ";
        client.sendMessage({
          to: hacker.get("phoneNumber"),
          from: hackerNum,
          body: req.user.get("name") + apperance + "is on the way to help! Reply with anything when y'all are finished to close the request!"
        });
      });
      break;
    case "inprogress":
      ticketForMentor(req.user, "inprogress").then(function(ticket) {
        var hacker = ticket.get("hacker");
        hacker.set("state", "none");
        req.user.set("state", "on");
        ticket.set("state", "closed");

        var old = req.user.get("workedWith");
        if (hacker.id in old) {
          old[hacker.id]++;
        } else {
          old[hacker.id] = 1;
        }
        req.user.set("workedWith", old);
        console.log("workedWith", req.user.get("workedWith"));

        ticket.set("closedAt", new Date());
        client.sendMessage({
          to: hacker.get("phoneNumber"),
          from: hackerNum,
          body: "Your mentor closed the request for you!"
        });
        saveAndSend([hacker, req.user, ticket], res, "Ticket closed. Thanks for helping out!");
      });
      break;
  }
});

var allTags = function() {
  var mentorsQ = new Parse.Query(User);
  mentorsQ.equalTo("type", "mentor");
  mentorsQ.containedIn("state", ["on", "proposed"]);
  return mentorsQ.find().then(function(mentors) {
    var tags = [];
    mentors.forEach(function(m) {
      tags = tags.concat(m.get("tags"));
    });
    return tags;
  });
};


var dispatchTicket = function(ticket, mentor) {
  var mentorsQ = new Parse.Query(User);
  mentorsQ.equalTo("type", "mentor");
  mentorsQ.containedIn("state", ["on", "proposed"]);
  mentorsQ.first().then(function(mentor) {
    ticket.set("mentor", mentor);
    ticket.set("state", "proposed");
    mentor.set("state", "proposed");
    mentor.save(null);
    ticket.save(null).then(function(ticket) {
      console.log("THIS IS TICKET ID", ticket.id);
      client.sendMessage({
        to: mentor.get("phoneNumber"),
        from: mentorNum,
        body: "Respond with literally anything in the next minute to claim this ticket! (Reply 'off' to turn these off.)",// Settings: " +settingsUrl(mentor),
        mediaUrl: url + "/image/" + ticket.id + "/card.png"
      });
    });
  });
};

var notifyMentorOfExpiry = function(ticket) {
  console.log("NOTIFYING OF EXPIRY");
  var mentor = ticket.get("mentor");
  if (!mentor) {
    console.log("THERE WAS NO MENTOR TO NOTIFY");
    return;
  } else {
    console.log("ACTUALLY GONNA NOTIFY THE MENTOR");
  }
  client.sendMessage({
    to: mentor.get("phoneNumber"),
    from: mentorNum,
    body: "Time's up! Sit tight for the next ticket."
  });
}

var assignTicket = function(mentor, ticket) {
  notifyMentorOfExpiry(ticket);
  ticket.set("mentor", mentor);
  ticket.add("proposedMentors", mentor.id);
  ticket.set("state", "proposed");
  mentor.set("state", "proposed");
  return Parse.Promise.when([ticket.save(null), mentor.save(null)])
  .then(function(ticket, mentor) {
    console.log("ASSIGNED", {t: ticket.id, m: mentor.id, sendingTo: mentor.get("phoneNumber"), url: url + "/image/" + ticket.id + "/card.png"});
    client.sendMessage({
      to: mentor.get("phoneNumber"),
      from: mentorNum,
      body: "Respond with literally anything within a minute to claim this ticket!",// Settings: " +settingsUrl(mentor),
      mediaUrl: url + "/image/" + ticket.id + "/card.png"
    });
  });
}

var unsubmitTicket = function(ticket) {
  if (!ticket.get("mentor")) {
    console.log("NO MENTOR");
    ticket.set("state", "submitted");
    ticket.get("hacker").set("state", "submitted");
    return ticket.save(null);
  }
  console.log("UNSUBMITTING");
  notifyMentorOfExpiry(ticket);
  ticket.set("state", "submitted");
  ticket.get("mentor").set("state", "on");
  return ticket.get("mentor").save().then(function() {
    ticket.get("hacker").set("state", "submitted");
    ticket.set("mentor", null);

    return ticket.save(null);
  });
};



var assignTickets = function() {
  var ticketsQ = new Parse.Query(Ticket);
  ticketsQ.containedIn("state", ["submitted", "proposed"]);
  ticketsQ.include("mentor");
  ticketsQ.include("hacker");
  ticketsQ.ascending("submittedAt");
  var mentorsQ = new Parse.Query(User);
  mentorsQ.equalTo("type", "mentor");
  mentorsQ.containedIn("state", ["on", "proposed"]);
  Parse.Promise.when([ticketsQ.find(), mentorsQ.find()])
  .then(function(tickets, mentors) {
    var alreadyMatched = {};
    tickets.forEach(function(t) {
      var suitableMentors = mentors
      .filter(function(m) {
        return !(m.id in alreadyMatched);
      })
      .filter(function(m) {
        return t.get("proposedMentors").indexOf(m.id) == -1;
      })
      .filter(function(m) {
        return containsTags(t.get("text"), m.get("tags")).length;
      })
      if (suitableMentors.length == 0) {
        console.log("BOUT TO UNSUBMIT TICKET", t.attributes);
        return unsubmitTicket(t);
      }

      var score = function(a) {
        var hackerId = t.get("hacker").id;
        return a.get("workedWith")[hackerId] || 0;
      }

      var chosenMentor = suitableMentors[0];

      suitableMentors.forEach(function(m) {
        if (score(m) > score(chosenMentor)) {
          chosenMentor = m;
        }
      });

      chosenMentor.set("state", "proposed");
      alreadyMatched[chosenMentor.id] = true;
      assignTicket(chosenMentor, t);
    });
  });
};


// var updateTickets = function() {
//   var mentorsQ = new Parse.Query(User);
//   mentorsQ.equalTo("type", "mentor");
//   mentorsQ.containedIn("state", ["on", "proposed"]);
//   var mentorsP = mentorsQ.find();
//   var ticketsQ = new Parse.Query(Ticket);
//   ticketsQ.containedIn("state", ["submitted", "proposed"]);
// }


var handleSubmission = function(ticket, text, req, res) {
  var numbers = parseSeat(req.text);
  switch (numbers.length) {
    case 0:
      ticket.set("state", "incomplete");
      req.user.set("state", "incomplete");
      return saveAndSend([ticket, req.user], res, "Before we submit your request, what's your table number?");
    case 1:
      if (venueName(numbers[0]) == "none") {
        ticket.set("state", "incomplete");
        req.user.set("state", "incomplete");
        return saveAndSend([ticket, req.user], res, "That's not a valid table number! Double check the paper on your table");
      }
      ticket.set("state", "submitted");
      ticket.set("seatNumber", numbers[0]);
      ticket.set("submittedAt", new Date());
      req.user.set("state", "submitted");
      return saveAndSend([ticket, req.user], res, "Your request has been received! We'll dispatch a mentor to table " + ticket.get("seatNumber") + " ASAP.");
      // return dispatchTicket(ticket);
    default:
      ticket.set("state", "incomplete");
      req.user.set("state", "incomplete");
      return saveAndSend([ticket, req.user], res, "What's your table number - you included more than one! Reply with just one.");
  }
};

var ticketForHacker = function(hacker, state) {
  var query = new Parse.Query(Ticket);
  query.equalTo("hacker", hacker);
  query.equalTo("state", state);
  query.include("mentor");
  return query.first();
};


// TODO HANDLE CANCELLING OF OTHERS

app.post("/hacker", twilioMiddleware("hacker"), function(req, res) {
  console.log("GOT TEXT", req.text);
  // TODO FIX CANCELLATION BUX
  if (req.text.indexOf("cancel") != -1) {
    // console.log("SUPPITY", req.user.get("state"));
    var query = new Parse.Query(Ticket);
    query.equalTo("hacker", req.user);
    query.containedIn("state", ["incomplete", "submitted", "proposed", "inprogress"]);
    query.include("mentor");
    query.first().then(function(ticket) {
      if (ticket) {
        var oldState = ticket.get("state");
        console.log("TICKET STATE", ticket.get("state"), req.user.get("state"), ticket.get("state") == req.user.get("state"));
        ticket.set("state", "cancelled");
        req.user.set("state", "none");
        var mentor = ticket.get("mentor");
        if (mentor) {
          if (oldState == "proposed" || oldState == "inprogress") {
            client.sendMessage({
              to: mentor.get("phoneNumber"),
              from: mentorNum,
              body: "The hacker cancelled their ticket! Sorry about that."
            });
          }
          // TODO SEND A NOTIFICATION TO CANCELLED MENTOR
          mentor.set("state", "on");
        }
        console.log("REPLYING");
        return saveAndSend([req.user, ticket], res, "Your request has been cancelled!");
      } else {
        req.user.set("state", "none");
        return saveAndSend([req.user], res, "You didn't have a request to cancel!");
      }
    });
    return;
  }


  switch(req.user.get("state")) {
    case "inprogress":
      ticketForHacker(req.user, "inprogress").then(function(ticket) {
        var hacker = req.user;
        var mentor = ticket.get("mentor");
        hacker.set("state", "none");
        mentor.set("state", "on");
        ticket.set("state", "closed");

        var old = mentor.get("workedWith");
        if (hacker.id in old) {
          old[hacker.id]++;
        } else {
          old[hacker.id] = 1;
        }
        mentor.set("workedWith", old);
        console.log("workedWith", mentor.get("workedWith"));

        ticket.set("closedAt", new Date());
        client.sendMessage({
          to: mentor.get("phoneNumber"),
          from: mentorNum,
          body: "The hacker closed the request for you! Thanks for helping out!"
        });
        saveAndSend([hacker, mentor, ticket], res, "Request closed. Thanks for helping out!");
      });
      break;
    case "none":
      return allTags().then(function(tags) {
        // console.log("ALLTAGS", tags, req.text, containsTags(req.text, tags));
        if (containsTags(req.text, tags).length == 0) {
          return res.send(twiml("Your request didn't match with any mentors! Try again with something more general, or use the 'any' tag to get any available mentor. And if the wifi is down or you need power, talk to a volunteer!"));
        }
        var ticket = new Ticket();
        ticket.set("hacker", req.user);
        ticket.set("text", req.text);
        ticket.set("proposedMentors", []);
        return handleSubmission(ticket, req.text, req, res);
      });
    case "incomplete":
      ticketForHacker(req.user, "incomplete").then(function(ticket) {
        if (ticket) {
          return handleSubmission(ticket, req.text, req, res);
        } else {
          console.log("COULDN'T FIND A TICKET, THIS SHOULD NEVER HAPPEN!");
        }
      });
      break;
    case "submitted":
      res.send(twiml("You've already requested help! Sit tight, or reply with 'cancel' to cancel the request."));
      break;
    default:
      console.log("GOT WEIRD STATE, THIS SHOULD NEVER HAPPEN", req.user.get("state"));
  }
});

/*
var options = {
      screenSize: {
        width: 480,
        height: 640
      },
      phantomConfig: {'ignore-ssl-errors': 'true'},
      siteType: "html"
    };
    hackerForMentor[from] = from;
    console.log("THIS IS FROM", from);
    var html = ejs.render(cardFile, {
      ticket: tickets[from],
      imageUrl: url + "/fisher.png"
    });
    renderPromises[from] = Q.nfcall(webshot, html, options);
    console.time("render");
    client.sendMessage({
      to: from,
      from: mentorNum,
      body: "(Pretend you're a mentor) Respond with literally anything in the next minute to claim this ticket!",
      mediaUrl: url + "/image/" + from + "/card.png"
    });
*/

var venueName = function(seat) {
  var mcCaw = {1: "104.90447998046875|147.7477569580078", 2: "106.28480529785156|189.1574249267578", 3: "106.28480529785156|230.56707763671875", 4: "106.28480529785156|276.1177062988281", 5: "104.90447998046875|320.28802490234375", 6: "153.21575927734375|340.99285888671875", 7: "153.21575927734375|296.8225402832031", 8: "151.83543395996094|254.03256225585938", 9: "153.21575927734375|212.62289428710938", 10: "153.21575927734375|168.4525909423828", 11: "194.62542724609375|153.26904296875", 12: "194.62542724609375|193.2983856201172", 13: "194.62542724609375|240.22933959960938", 14: "196.0057373046875|284.399658203125", 15: "194.62542724609375|327.18963623046875", 16: "241.55638122558594|313.38641357421875", 17: "241.55638122558594|271.97674560546875", 18: "230.5137939453125|225.04579162597656", 19: "234.65476989746094|180.87548828125", 20: "240.17605590820312|142.22647094726562", 21: "287.10699462890625|125.66259765625", 23: "331.2773132324219|131.1838836669922", 24: "376.82794189453125|127.04292297363281", 25: "288.4873352050781|335.4715576171875", 26: "334.0379638671875|336.8518981933594", 27: "375.4476318359375|338.2322082519531", 28: "423.7589111328125|313.38641357421875", 29: "419.617919921875|269.2160949707031", 30: "420.9982604980469|225.04579162597656", 31: "419.617919921875|176.73452758789062", 32: "419.617919921875|136.70518493652344", 33: "456.8866271972656|156.02969360351562", 34: "458.2669372558594|197.43934631347656", 35: "458.2669372558594|241.6096649169922", 36: "459.64727783203125|285.77996826171875", 37: "458.2669372558594|328.5699462890625", 38: "502.437255859375|317.5273742675781", 39: "502.437255859375|274.7373962402344", 40: "502.437255859375|227.8064422607422", 41: "503.81756591796875|186.3967742919922", 42: "505.1979064941406|142.22647094726562", 90: "389.2508544921875|258.17352294921875", 91: "390.63116455078125|215.383544921875"};

  var fisher = {43: "421.4912109375|319.7008056640625", 44: "421.4912109375|263.5019836425781", 45: "421.4912109375|210.81556701660156", 46: "421.4912109375|159.2999725341797", 47: "421.4912109375|108.95519256591797", 48: "487.0565185546875|108.95519256591797", 49: "489.39813232421875|159.2999725341797", 50: "487.0565185546875|211.9863739013672", 51: "489.39813232421875|268.1852111816406", 52: "488.2273254394531|320.8716125488281", 92: "222.45370483398438|336.0921325683594", 93: "155.71759033203125|336.0921325683594", 94: "224.79531860351562|291.60137939453125", 95: "154.54678344726562|289.259765625"};

  var tent = {53: "570.5576171875|158.5420684814453", 54: "571.95263671875|113.90186309814453", 55: "521.732421875|159.93707275390625", 56: "521.732421875|115.29686737060547", 57: "468.72216796875|159.93707275390625", 58: "472.90716552734375|119.48188781738281", 59: "428.2669677734375|159.93707275390625", 60: "426.8719482421875|115.29686737060547", 61: "379.4417419433594|162.72708129882812", 62: "378.0467529296875|115.29686737060547", 63: "327.8265075683594|159.93707275390625", 64: "329.2215270996094|118.08688354492188", 65: "277.60626220703125|159.93707275390625", 66: "276.2112731933594|115.29686737060547", 67: "228.7810516357422|159.93707275390625", 68: "228.7810516357422|116.6918716430664", 69: "178.56082153320312|159.93707275390625", 70: "178.56082153320312|118.08688354492188", 71: "181.350830078125|292.4626770019531", 72: "227.38604736328125|292.4626770019531", 73: "279.00128173828125|293.8576965332031", 74: "327.8265075683594|291.06768798828125", 75: "376.6517333984375|293.8576965332031", 76: "428.2669677734375|291.06768798828125", 77: "472.90716552734375|291.06768798828125", 78: "523.1273803710938|292.4626770019531"};

  var landau = {22: "382.23175048828125|222.7123565673828", 79: "133.9206085205078|249.2174835205078", 80: "138.1056365966797|204.5772705078125", 81: "78.120361328125|204.5772705078125", 82: "78.120361328125|252.0074920654297", 83: "440.822021484375|193.41722106933594", 84: "499.41229248046875|196.20724487304688", 85: "558.0025634765625|197.6022491455078", 86: "556.6075439453125|250.61248779296875", 87: "499.41229248046875|254.79751586914062", 88: "442.217041015625|254.79751586914062", 89: "380.8367614746094|254.79751586914062"};
  if (seat in mcCaw) return "McCaw";
  if (seat in fisher) return "Fisher";
  if (seat in tent) return "Tent";
  if (seat in landau) return "Landau";
  return "none";
}

var renderHtml = function(ticket) {
  return ejs.render(fs.readFileSync(__dirname + "/views/card.ejs", "ascii"), {
     tags: containsTags(ticket.get("text"), ticket.get("mentor").get("tags")),
     seatNumber: ticket.get("seatNumber"),
     timeOpen: moment(ticket.get("submittedAt")).fromNow(true),
     url: url,
     workedWith: ticket.get("mentor").get("workedWith")[ticket.get("hacker").id] || 0,
     venueName: venueName(ticket.get("seatNumber")),
  });
}

app.get("/image/:id/card.html", function(req, res) {
  var query = new Parse.Query(Ticket);
  query.include("mentor");
  query.get(req.params.id).then(function(ticket) {
    res.send(renderHtml(ticket));
  });

});

app.get("/s", function(req, res) {
  res.sendFile(__dirname + "/public/settings.html");
});

app.get("/settings", function(req, res) {
  res.sendFile(__dirname + "/public/settings.html");
});

app.get("/voice", function(req, res) {
  res.send("<Response><Dial>831-212-3900</Dial></Response>");
});

app.post("/voice", function(req, res) {
  res.send("<Response><Dial>831-212-3900</Dial></Response>");
});


var filterTags = function(s) {
  var tags = [];

  var tokens = s.split(/\s|,/);
  tokens.forEach(function(token) {
    var parsed = parseInt(token);
    if (isNaN(parsed)) {
      tags.push(token);
    }
  });

  return tags;
};

app.get("/image/:id/card.png", function(req, res){
  console.log("GONNA GET DAT CARD");
  res.set("Content-Type", "image/png");
  var options = {
      screenSize: {
        width: 480,
        height: 640
      },
      phantomConfig: {'ignore-ssl-errors': 'true'},
      siteType: "html"
    };
    var query = new Parse.Query(Ticket);
    query.include("mentor");
    query.include("hacker");
    query.get(req.params.id).then(function(ticket) {
      var html = renderHtml(ticket);
      // webshot("http://localhost:3000/AvenirNext-Bold/preview.html", function(err, renderStream) {
      //   renderStream.pipe(res);
      // });
      console.log("got ticket", ticket);
      webshot(html, options, function(err, renderStream) {
        console.log("RENDER ERROR", err);
        renderStream.pipe(res);
      });
    });
});


Parse.User.logIn("master", "i hate parse")
.then(function() {
  console.log("LOGGED IN AND LISTENING!");
  app.listen(process.env.ENVIRONMENT == "development" ? 3000 : 80);
  new CronJob("0 */2 * * * *", function(){
    assignTickets();
  }, null, true, "America/Los_Angeles");
});

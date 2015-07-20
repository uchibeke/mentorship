var express = require("express");
var app = express();

var twiml = function(message) {
  return "<Response><Message>" + message + "</Message></Response>";
};

app.get("/fallback", function(req, res) {
  res.send(twiml("The mentorship system is having trouble right now! Don't worry, we're on it!"));
});

app.post("/fallback", function(req, res) {
  res.send(twiml("The mentorship system is having trouble right now! Don't worry, we're on it!"));
});

app.get("/voice", function(req, res) {
  res.send("<Response><Dial>831-212-3900</Dial></Response>");
});

app.post("/voice", function(req, res) {
  res.send("<Response><Dial>831-212-3900</Dial></Response>");
});

app.listen(3000);
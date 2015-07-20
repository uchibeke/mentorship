

Parse.initialize("AfM79brCkxAAkvQQ08dxphlbogFcfzjH4hobqTVi", "0ZgrGABY3e6L5MwIEIZBOFmvcy4avmiWvGrc4fLv");
var User = Parse.Object.extend("MentorUser");

var id = location.hash.slice(1);

var handleError = function(e) {
  alert("Error: " + e.message);
};

var query = new Parse.Query(User);

var userP = query.get(id);

var setNameLabel = function() {
  var name = $("#name").val() || "(your name)";
  var appearance = $("#appearance").val() ? "(" + $("#appearance").val() + ")" : "";
  $("#namelabel").text(name + " " + appearance + " is on the way...");
};

$("#name").bind("propertychange change click keyup input paste", setNameLabel);
$("#appearance").bind("propertychange change click keyup input paste", setNameLabel);

userP.then(function(user) {
  $("#name").val(user.get("name"));
  $("#name").attr("placeholder", "Chuck Norris");

  $("#appearance").val(user.get("appearance"));

  setNameLabel();



  $("#enabled-on").prop("checked", user.get("state") != "off");
  $("#enabled-off").prop("checked", user.get("state") == "off");


  $("#miscellaneous-on").prop("checked", user.get("miscellaneous"));
  $("#miscellaneous-off").prop("checked", !user.get("miscellaneous"));

  console.log();

  var defaultTags = [
    "java",
    "hardware",
    "design",
    "business",
    "bio",
    "biotech",
    "oculus",
    "arduino",
    "raspberry pi",
    "swift",
    "r",
    "javascript",
    "c#",
    "php",
    "android",
    "jquery",
    "python",
    "html",
    "c++",
    "ios",
    "mysql",
    "css",
    "sql",
    "asp.net",
    "objective-c",
    ".net",
    "iphone",
    "ruby-on-rails",
    "c",
    "ruby",
    "sql-server",
    "arrays",
    "ajax",
    "regex",
    "xml",
    "json",
    "asp.net-mvc",
    "wpf",
    "linux",
    "django",
    "database",
    "r",
    "eclipse",
    "vb.net",
    "angularjs",
    "facebook",
    "twitter",
    "gun",
    "drones",
    "data science",
    "machine learning",
    "mongo",
    "xcode",
    "dropbox", 
    "sendgrid",
    "oauth"
  ];

  console.log(user.get("tags"));

  var allTags = user.get("tags").concat(defaultTags).map(function(t) { return {text: t, id: t}});

  $("#tags").select2({
    tags: true,
    data: allTags
  });

  $("#tags").val(user.get("tags")).trigger("change");


  // $("#tags").select2({data: tags});
}, handleError);

$("#save").click(function(e) {
  e.preventDefault();
  userP.then(function(user) {
    user.set("name", $("#name").val());
    user.set("appearance", $("#appearance").val());
    if (!(user.get("name").trim())) {
      alert("Name can't be empty!");
      return;
    }
    user.set("tags", $("#tags").val() || []);
    user.set("state", $("#enabled-on").prop("checked") ? "on" : "off");
    user.set("miscellaneous", $("#miscellaneous-on").prop("checked"));
    $("#save").text("Saving...");
    return user.save();
  }, handleError)
  .then(function(u) {
    if (!u) return;
    setTimeout(function() {
      $("#save").text("Saved!");
    }, 1000);
    setTimeout(function() {
      $("#save").text("Save");
    }, 2000);
  }, handleError);
});
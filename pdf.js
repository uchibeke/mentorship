var Canvas = require('canvas')
  , canvas = new Canvas(2550, 3300, 'pdf')
  , ctx = canvas.getContext('2d')
  , fs = require('fs');

var yMargin = 225, xMargin = 100;

var plotSequentially = function(x, y, texts, fonts) {
  for(var i = 0; i < texts.length; i++) {
    ctx.font = fonts[i];
    ctx.fillText(texts[i], x, y);
    var measure = ctx.measureText(texts[i]);
    x += measure.width;
  }
}

// ctx.font = "150px AvenirNext-Regular";
// ctx.fillText("TREE", xMargin, yMargin);
// var measure = ctx.measureText("TREE");
// ctx.font = "150px AvenirNext-Bold";
// ctx.fillText("HACKS MENTORSHIP", xMargin + measure.width, yMargin);

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

plotNumber(123);
// plotBlank();
var buf = canvas.toBuffer();
fs.writeFileSync('out.pdf', buf);
console.log("YO");

var hackerNum = "Hacker Number: (657) 242-2537";

var mentorNum = "Mentor Number: (415) 763-6867";

$("#number").text(hackerNum);

$("#sup").on("toggled", function (event, tab) {
  var text = tab.data("number") == "hacker" ? hackerNum : mentorNum;
  $("#number").text(text);
});
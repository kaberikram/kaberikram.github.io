// Mouse move do something
$(document).on("mousemove", function (ev) {
  var mouseX = ev.originalEvent.pageX;
  var mouseY = ev.originalEvent.pageY;

  // go through all images work out angles

  $("img").each(function () {
    var imgX = $(this).position().left + 70;
    var imgY = $(this).position().top + 70;

    var diffX = mouseX - imgX;
    var diffY = mouseY - imgY;

    var radians = Math.atan2(diffY, diffX);

    var angle = (radians * 180) / Math.PI;

    $(this).css("transform", "rotate(" + angle + "deg)");
  });
});


// every 3 seconds change arrow

var count = 0
var images = ["eyes-01.svg", "eyes-02.svg", "eyes-03.svg"]


setInterval(function () {

    count = count + 1

    count = count % images.length

    var image = images[count]

    $("img").attr("src", image)


}, 1000)
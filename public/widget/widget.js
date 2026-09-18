/*
  WINNING EDGE PARTNERS — MEMBER SPOTLIGHT WIDGET
  ================================================
  Renders a small card with the Winning Edge Partners badge, a rotating
  "member spotlight" and a link to the hub. One line to embed:

    <div id="winning-edge-widget"></div>
    <script src="https://winningedgepartners.com/widget/widget.js" async></script>

  The spotlight list is read from /widget/members.json on the hub, so it
  updates for every member site automatically — nobody ever touches
  their site again.
*/
(function () {
  var HUB = "https://winningedgepartners.com"; // hub domain
  var mount = document.getElementById("winning-edge-widget");
  if (!mount) return;

  var card = document.createElement("div");
  card.style.cssText = "font-family:Arial,Helvetica,sans-serif;max-width:260px;border:1px solid #e2e2e2;border-left:5px solid #C8102E;border-radius:8px;padding:14px 16px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.07);";
  card.innerHTML =
    '<div style="font-size:11px;letter-spacing:1px;color:#666;">PROUD PARTNER</div>' +
    '<div style="font-size:16px;font-weight:bold;color:#C8102E;margin:2px 0 1px;">Winning Edge Partners</div>' +
    '<div style="font-size:11px;color:#333;margin-bottom:10px;">Spring Hill, Florida &middot; Trusted Local Businesses</div>' +
    '<div id="we-spot" style="font-size:12px;color:#444;border-top:1px solid #eee;padding-top:8px;min-height:30px;">Loading member spotlight&hellip;</div>' +
    '<a href="' + HUB + '" style="display:inline-block;margin-top:8px;font-size:12px;color:#1B2A4A;font-weight:bold;text-decoration:none;">Meet all our trusted businesses &rarr;</a>';
  mount.appendChild(card);

  // Anonymous install ping: records only this site's domain name on the hub,
  // so the network can see which member sites have the widget active.
  // No visitor data is collected or sent.
  try {
    var h = (location.hostname || "").toLowerCase();
    if (
      h &&
      h !== "localhost" &&
      h !== "127.0.0.1" &&
      h.indexOf("winningedgepartners.com") === -1 &&
      h.indexOf(".vercel.app") === -1
    ) {
      fetch(HUB + "/api/widget-ping?h=" + encodeURIComponent(h)).catch(function () {});
    }
  } catch (e) {}

  function show(members) {
    if (!members || !members.length) { document.getElementById("we-spot").style.display = "none"; return; }
    var i = Math.floor(Math.random() * members.length);
    function render() {
      var m = members[i % members.length];
      document.getElementById("we-spot").innerHTML =
        '<span style="color:#888;">Member spotlight:</span><br><a href="' + HUB + m.url +
        '" rel="nofollow" style="color:#C8102E;font-weight:bold;text-decoration:none;">' + m.name +
        '</a> <span style="color:#666;">&middot; ' + m.category + "</span>";
      i++;
    }
    render();
    setInterval(render, 6000);
  }

  try {
    fetch(HUB + "/widget/members.json").then(function (r) { return r.json(); }).then(show)
      .catch(function () { document.getElementById("we-spot").style.display = "none"; });
  } catch (e) { document.getElementById("we-spot").style.display = "none"; }
})();

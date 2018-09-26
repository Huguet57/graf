var s, graf;

function xhr(method, url, params, callback) {
  var http = new XMLHttpRequest();
  if (method == "POST") {
    http.open(method, url, true);
  } else {
    if (params != "") {
      http.open(method, url+"?"+params, true);
    } else {
      http.open(method, url, true);
    }
  }
	http.onload = function() {
    if(this.status != 200) {
      console.warn("Attention, status code "+this.status+" when loading via xhr url "+url);
    }
    callback(this.responseText, this.status);
  };
  if (method == "POST") {
    http.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    http.send(params);
  } else {
    http.send();
  }
}

function altSearchBar() {
  if (document.querySelector(".md-google-search__metacontainer").style.display == "none") {
    document.querySelector(".md-google-search__metacontainer").style.display = "block";
  } else {
    document.querySelector(".md-google-search__metacontainer").style.display = "none";
    document.querySelector(".autocomplete-container").style.display = "none";
  }
}

var seq = [38, 38, 40, 40, 37, 39, 37, 39, 65, 66, 13];
var cur = 0;

function justdoit() {
  s.graph.nodes().forEach(function(n) {
    switch(n.color) {
      case "#d61c08":
      n.color = "#0159aa";
      break;

      case "#0159aa":
      n.color = "#0ca80a";
      break;

      case "#0ca80a":
      n.color = "#d61c08";
      break;
    }
  });

  s.refresh();
  setTimeout(justdoit, 333);
}

var dialog = {
  fill: function(data, text, html=false) {
    var el = document.querySelectorAll("*[data-fill=\""+data+"\"]");
    for (var i in el) {
      if (html === true) {
        el[i].innerHTML = text;
      } else {
        el[i].innerText = text;
      }
    }
  },
  show: function(id, neighbors) {
    var neighbors = Object.values(neighbors);

    this.fill("name", graf.nodes[id].name);
    this.fill("year", graf.nodes[id].year);
    this.fill("sex", graf.nodes[id].sex);
    this.fill("id", "#"+id);
    this.fill("n-edges", neighbors.length);

    var list = "";
    neighbors.forEach(function (a) {
      list += "<li><b>"+graf.nodes[id].name+" - "+a.label+":</b> "+(graf.edges[id+"_"+a.id] ? graf.edges[id+"_"+a.id].votes : graf.edges[a.id+"_"+id].votes)+" vots</li>";
    });
    this.fill("edges", list, true);

    if (window.innerWidth > 700) {
      document.querySelector("#dialog").style.display = "block";
      document.querySelector("#backdrop-container").style.display = "block";
    } else {
      document.querySelector("#summary-dialog").style.display = "block";
    }
  },
  close: function() {
    document.querySelector("#dialog").style.display = "none";
    document.querySelector("#summary-dialog").style.display = "none";
    document.querySelector("#backdrop-container").style.display = "none";

    s.graph.nodes().forEach(function(n) {
      n.color = n.originalColor;
    });

    s.graph.edges().forEach(function(e) {
      e.color = "#fff";
    });

    s.refresh();
  },
  max: function() {
    document.querySelector("#summary-dialog").style.display = "none";
    document.querySelector("#dialog").style.display = "block";
  },
  min: function() {
    document.querySelector("#dialog").style.display = "none";
    document.querySelector("#summary-dialog").style.display = "block";
  }
};

function init() {
  sigma.classes.graph.addMethod("neighbors", function(nodeId) {
    var k,
        neighbors = {},
        index = this.allNeighborsIndex[nodeId] || [];

    for (k in index) {
      neighbors[k] = this.nodesIndex[k];
    }

    return neighbors;
  });

  s = new sigma({
    renderers: [{
      container: "graf",
      type: "webgl"
    }],
    settings: {
      defaultEdgeColor: "#fff",
      edgeColor: "default",
      defaultLabelColor: "#fff",
      autoRescale: false,
      zoomMax: 10,
      //enableEdgeHovering: true,
      font: "Roboto",
      labelThreshold: 5
    }
  });

  xhr("GET", "api.php", "action=getgraf", function(responseText, status) {
    graf = JSON.parse(responseText);

    console.log(graf);

    for (var i in graf.nodes) {
      var ncolor = (graf.nodes[i].sex == "F" ? "#d61c08" : (graf.nodes[i].sex == "M" ? "#0159aa" : "#0ca80a"));

      s.graph.addNode({
        id: graf.nodes[i].id,
        label: graf.nodes[i].name,
        x: graf.nodes[i].x,
        y: graf.nodes[i].y,
        size: 10,
        color: ncolor,
        originalColor: ncolor
      });
    }

    for (var i in graf.edges) {
      s.graph.addEdge({
        id: i,
        source: graf.edges[i].a,
        target: graf.edges[i].b,
        size: Math.min(4, Math.max((7/(2*Math.pow(20, 2)))*Math.pow(graf.edges[i].votes, 2) + 1/2, 0.5))
      });
    }

    s.bind('clickNode', function(e) {
      var nodeId = e.data.node.id,
          toKeep = s.graph.neighbors(nodeId);
      //toKeep[nodeId] = e.data.node;

      s.graph.nodes().forEach(function(n) {
        if (toKeep[n.id] || n.id == nodeId) {
          n.color = n.originalColor;
        } else {
          n.color = '#333';
        }
      });

      s.graph.edges().forEach(function(e) {
        if ((e.source == nodeId || e.target == nodeId) && (toKeep[e.source] || toKeep[e.target])) {
          e.color = '#fff';
        } else {
          e.color = '#333';
        }
      });

      s.refresh();

      dialog.show(nodeId, toKeep);
    });

    document.querySelector("#quit-dialog").addEventListener("click", dialog.close);
    document.querySelector("#quit2-dialog").addEventListener("click", dialog.close);
    document.querySelector("#max-dialog").addEventListener("click", dialog.max);
    document.querySelector("#min-dialog").addEventListener("click", dialog.min);

    document.querySelector("#zoomin").addEventListener("click", function() {
      s.camera.goTo({
        ratio: Math.max(s.camera.settings("zoomMin"), s.camera.ratio / Math.sqrt(2))
      });
    });

    document.querySelector("#zoomout").addEventListener("click", function() {
      s.camera.goTo({
        ratio: Math.min(s.camera.settings("zoomMax"), s.camera.ratio * Math.sqrt(2))
      });
    });

    document.addEventListener("keydown", function() {
      if (event.key == "f" && event.target.getAttribute("id") != "search-input") altSearchBar();
      if (event.which == seq[cur]) {
        if (cur < seq.length) {
          ++cur;
          if (cur == seq.length) {
            justdoit();
          }
        }
      } else cur = 0;
    })
    document.querySelector("#search").addEventListener("click", altSearchBar);

    if (window.innerWidth > 700) altSearchBar();

    s.refresh();
    autocomplete(document.querySelector("#search-input"), graf.nodes, "search");
  });
}

function cameraGoto(nodeX, nodeY) {
	sigma.misc.animation.camera( s.camera,
	  { x: nodeX, y: nodeY, ratio: 1 },
	  { duration: s.settings('animationsTime') || 300 }
	);
}

window.addEventListener("load", init);

var w = 1280 - 80,
    h = 800 - 180,
    x = d3.scale.linear().range([0, w]),
    y = d3.scale.linear().range([0, h]),
    color = d3.scale.category20c(),
    profitColorScale = d3.scale.linear()
        .range(['#888899', 'darkgreen']) // or use hex values
        .domain([0.03, 0.08]),
    volumeColorScale = d3.scale.linear()
        .range(['#888899', 'darkgreen']) // or use hex values
        .domain([0, 100]),
    pvalueColorScale = d3.scale.linear()
        .range(['#888899', 'darkgreen']) // or use hex values
        .domain([0.0, 0.1]),
    maturityColorScale = d3.scale.linear()
        .range(['#888899', 'darkgreen']) // or use hex values
        .domain([0.6, 1.0]),
    headerHeight=16,
    transitionDuration=500,
    root,svg, pairsData,
    node;

var treemap = d3.layout.treemap()
    .round(false)
    .mode("squarify")
    .size([w, h])
    .sticky(true)
    .padding([headerHeight , 2, 1, 2])
    .value(function(d) { return d.volume; });

function loadData(){
    axios.get('https://script.google.com/macros/s/AKfycbx9SdPrEpE3Y11G_McySe9x569mdbaUK_0jrT6KKbDt1r0-W20sgBv3Csw6AAm_QC7p/exec')
        .then(function (response) {
            pairsData = response.data;
            getData()
        })
}

function getData() {

    let data = pairsData;
    let groupedChildren = {}
    let groupby = d3.select("#select-groupby").property("value")
    let timeframe = d3.select("#select-timeframe").property("value")
    let correlation = d3.select("#select-correlation").property("value")
    for (let i=0;i<data.length;i++){
        if (((timeframe=="any") || (timeframe==data[i].timeframe))
            &&
            ((correlation=="any") || (correlation==data[i].correlation)))  {

            if (!groupedChildren[data[i][groupby]]) {
                groupedChildren[data[i][groupby]] = []
            }
            groupedChildren[data[i][groupby]].push(data[i])
        }
    }
    let children = []
    for (var key in groupedChildren) {
        children.push({name: key, children: groupedChildren[key]})
    }
    console.log("ChangeData", groupby)
    root = {name: "Pairs"+Math.random()*10, children: children }
    //svg.datum(data).call(UpdateTreeMap)
    UpdateTreeMap()

}

loadData()


function UpdateTreeMap() {

//d3.json("https://script.google.com/macros/s/AKfycbwKHu9VMwxV5who045XKtReBlAcGQmQ9gynmHOHHzEH02jiOIl3xVzuN-3NE1lKyZRG/exec", function(data) {
//  node = root = data;
    d3.select('.chart').remove()

    treemap = d3.layout.treemap()
        .round(false)
        .mode("squarify")
        .size([w, h])
        .sticky(true)
        .padding([headerHeight , 2, 1, 2])
        .value(function(d) { return d3.select("#select-size").property("value")=="volume" ? d.volume : d.profit; });

    svg = d3.select("#chart").append("div")
        .attr("class", "chart")
        .style("width", w + "px")
        .style("height", h + "px")
        .append("svg:svg")
        .attr("width", w)
        .attr("height", h)
        .append("svg:g")
        .attr("transform", "translate(.5,.5)");

    var parents = treemap.nodes(root)
        .filter(function(d) { return d.children; });

    var parentCells = svg.selectAll("g.tmcell.tmparent")
        .data(parents).enter().append("svg:g")
        .attr("class", "tmcell tmparent")
        .attr("transform", function(d) {
            console.log(d.name, d.x, d.y)
            return "translate(" + d.x + "," + d.y + ")";
        })
        .append("g") //svg
        .attr("class", "tmclip")
        .attr("width", function(d) {
            return Math.max(0.01, d.dx);
        })
        .attr("height", function(d) {
            return Math.max(0.01, d.dy);
        });

    parentCells.append("rect")
        .attr("width", function(d) {
            return Math.max(0.01, d.dx);
        })
        //.attr("height", headerHeight)
        .attr("height", function(d) {
            return Math.max(0.01, d.dy);
        })
        .attr("class", "tmRect tmheaderBackground")

    parentCells.append('text')
        .attr("class", "tmlabel")
        .attr("transform", "translate(3, 13)")
        .attr("width", function(d) {
            return Math.max(0.01, d.dx);
        })
        .attr("height", headerHeight)
        .text(function(d) {
            return d.name;
        });


    var nodes = treemap.nodes(root)
        .filter(function(d) { return !d.children; });

    var cell = svg.selectAll("g.tmcell.cell")
        .data(nodes)
        .enter().append("svg:g")
        .attr("class", "tmcell cell")
        .attr("transform", function(d) { return "translate(" + d.x + "," + (d.y) + ")"; })
        .on("click", function(d) { return zoom(node == d.parent ? root : d.parent); });

    cell.append("svg:rect")
        .attr("class", "child-rect")
        .attr("width", function(d) { return d.dx - 1; })
        .attr("height", function(d) { return d.dy - 1; })
    //.style("fill", function(d) { return profitColorScale(d.profit); });
    setColorScale()

    cell.append("svg:text")
        .attr("class", "chlabel")
        .attr("x", function(d) { return d.dx / 2; })
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("color", "white")
        .text(function(d) { return d.name + ' ' + Math.round(d.profit * 1000)/10 + '%'; })
        .style("opacity", function(d) { d.w = this.getComputedTextLength(); return d.dx > d.w ? 1 : 0; });


//    zoom(node);

    addTooltip();
}


d3.select(window).on("click", function() { zoom(root); });

d3.select("#select-size").on("change", function() {
    treemap.value(this.value == "volume" ? volume : profit).nodes(root);
    zoom(node);
});


d3.select("#select-color").on("change", function() {
    switch (this.value) {
        case "profit":
            svg.selectAll(".child-rect").style("fill", function(d) { return profitColorScale(d.profit) });
            break;
        case "volume":
            svg.selectAll(".child-rect").style("fill", function(d) { return volumeColorScale(d.volume) });
            break;
        case "pvalue":
            svg.selectAll(".child-rect").style("fill", function(d) { return pvalueColorScale(d.pvalue) });
            break;
        case "maturity":
            svg.selectAll(".child-rect").style("fill", function(d) { return maturityColorScale(d.maturity) });
            break;
    }
});

function setColorScale(){
    switch (d3.select("#select-color").property("value")) {
        case "profit":
            svg.selectAll(".child-rect").style("fill", function(d) { return profitColorScale(d.profit) });
            break;
        case "volume":
            svg.selectAll(".child-rect").style("fill", function(d) { return volumeColorScale(d.volume) });
            break;
        case "pvalue":
            svg.selectAll(".child-rect").style("fill", function(d) { return pvalueColorScale(d.pvalue) });
            break;
        case "maturity":
            svg.selectAll(".child-rect").style("fill", function(d) { return maturityColorScale(d.maturity) });
            break;
    }
}

d3.select("#select-groupby").on("change", function() {
    getData();
});

d3.select("#select-timeframe").on("change", function() {
    getData();
});

d3.select("#select-correlation").on("change", function() {
    getData();
});

function volume(d) {
    return d.volume;
}

function profit(d) {
    return d.profit
}

function zoom(d) {
    //this.treemap
    //       .padding([headerHeight , 2, 1, 2]);

    var kx = w / d.dx, ky = h / d.dy;
    x.domain([d.x, d.x + d.dx]);
    y.domain([d.y, d.y + d.dy]);

    var t = svg.selectAll("g.tmcell").transition()
        .duration(d3.event.altKey ? 7500 : 750)
        .attr("transform", function(d) {
            return "translate(" + x(d.x) + "," + y(d.y) + ")";
        });


    t.select("rect")
        .attr("width", function(d) { return kx * d.dx - 1; })
        .attr("height", function(d) { return ky * d.dy - 1; })

    t.select(".chlabel")
        .attr("x", function(d) { return kx * d.dx / 2; })
        .attr("y", function(d) { return ky * d.dy / 2; })
        .style("opacity", function(d) { return kx * d.dx > d.w ? 1 : 0; });

    node = d;
    d3.event.stopPropagation();
}

function addTooltip(){
    var tip = d3.tip()
        .attr("class", "d3-tip")
        .html(function(d){
        })

    cell = svg.selectAll(".cell")
    cell.call(tip)
    cell.on("mouseover", tip.show)
    cell.on("mouseout", tip.hide)
}
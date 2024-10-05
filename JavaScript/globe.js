// Set the dimensions and create SVG element
const width = 600, height = 600;
const svg = d3.select("#globe-container").append("svg")
  .attr("width", width)
  .attr("height", height);

// Define projection and path generator
const projection = d3.geoOrthographic() // Globe projection
  .scale(300)
  .translate([width / 2, height / 2])
  .clipAngle(90);

const path = d3.geoPath().projection(projection);

// Create graticule (grid lines on the globe)
const graticule = d3.geoGraticule();

// Load and render the globe (land)
d3.json("https://d3js.org/world-110m.v1.json").then(world => {
  const land = topojson.feature(world, world.objects.land);

  svg.append("path")
    .datum({ type: "Sphere" }) // Sphere for the globe's outline
    .attr("d", path)
    .attr("fill", "#ADD8E6") // Light blue for the oceans
    .attr("stroke", "#000");

  svg.append("path")
    .datum(graticule)
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#ccc"); // Gray lines for the graticule

  svg.append("path")
    .datum(land)
    .attr("d", path)
    .attr("fill", "#228B22") // Green for the land
    .attr("stroke", "#000");

  // Drag functionality
  const drag = d3.drag()
    .on("drag", (event) => {
      const rotate = projection.rotate();
      const k = 0.5; // Speed of rotation
      projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
      svg.selectAll("path").attr("d", path); // Re-render the paths with new rotation
    });

  svg.call(drag); // Enable dragging
});

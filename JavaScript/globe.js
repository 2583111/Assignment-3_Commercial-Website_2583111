const width = 800;
const canvas = document.querySelector("#globe");
const context = canvas.getContext("2d");

// Projection setup
const projection = d3.geoOrthographic().precision(0.2);
const path = d3.geoPath(projection, context);
const sphere = { type: "Sphere" };

// Function to calculate height and scale projection to fit canvas width
function fitGlobeToWidth() {
  const [[x0, y0], [x1, y1]] = d3.geoPath(projection.fitWidth(width, sphere)).bounds(sphere);
  const dy = Math.ceil(y1 - y0);
  const l = Math.min(Math.ceil(x1 - x0), dy);
  projection.scale(projection.scale() * (l - 1) / l).precision(0.2);
  return dy;
}

// Load the topojson and initialize the globe rendering
Promise.all([
  d3.json("path/to/land-50m.json"),  // Replace with actual file path
  d3.json("path/to/land-110m.json")  // Replace with actual file path
]).then(([land50, land110]) => {
  const land50Topo = topojson.feature(land50, land50.objects.land);
  const land110Topo = topojson.feature(land110, land110.objects.land);
  
  const height = fitGlobeToWidth();
  canvas.height = height;

  // Enable dragging and rotation
  d3.select(canvas)
    .call(drag(projection)
      .on("drag.render", () => render(land110Topo))
      .on("end.render", () => render(land50Topo)))
    .call(() => render(land50Topo));
  
  render(land50Topo);
});

// Render function for the globe and land
function render(land) {
  context.clearRect(0, 0, width, canvas.height);
  
  // Draw the sphere (ocean background)
  context.beginPath();
  path(sphere);
  context.fillStyle = "#1f2c39";  // Ocean color
  context.fill();
  context.strokeStyle = "#fff";   // Globe outline
  context.stroke();

  // Draw the land
  context.beginPath();
  path(land);
  context.fillStyle = "#f1f1f1";  // Land color
  context.fill();
  context.stroke();
}

// Drag function (using versor for smooth rotation)
function drag(projection) {
  let v0, q0, r0, a0, l;

  function pointer(event, that) {
    const t = d3.pointers(event, that);
    if (t.length !== l) {
      l = t.length;
      if (l > 1) a0 = Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]);
      dragstarted.apply(that, [event, that]);
    }
    if (l > 1) {
      const x = d3.mean(t, p => p[0]);
      const y = d3.mean(t, p => p[1]);
      const a = Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]);
      return [x, y, a];
    }
    return t[0];
  }

  function dragstarted({ x, y }) {
    v0 = versor.cartesian(projection.invert([x, y]));
    q0 = versor(r0 = projection.rotate());
  }

  function dragged(event) {
    const v1 = versor.cartesian(projection.rotate(r0).invert([event.x, event.y]));
    const delta = versor.delta(v0, v1);
    let q1 = versor.multiply(q0, delta);

    const p = pointer(event, this);
    if (p[2]) {
      const d = (p[2] - a0) / 2;
      const s = -Math.sin(d);
      const c = Math.sign(Math.cos(d));
      q1 = versor.multiply([Math.sqrt(1 - s * s), 0, 0, c * s], q1);
    }

    projection.rotate(versor.rotation(q1));
    render();
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged);
}
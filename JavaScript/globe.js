// Select the canvas element and set up a 2D context
const canvas = document.getElementById('globe');
const context = canvas.getContext('2d');

// Set up the projection for the globe (orthographic projection)
const projection = d3.geoOrthographic()
    .scale(300) // Scale of the globe
    .translate([canvas.width / 2, canvas.height / 2]) // Center it on the canvas
    .rotate([0, -30]); // Initial rotation

// Path generator for the projection
const path = d3.geoPath(projection, context);

// Sphere for the globe outline
const sphere = { type: 'Sphere' };

// Load and draw the globe
d3.json('https://d3js.org/world-50m.v1.json').then(world => {
    const land = topojson.feature(world, world.objects.land);
    drawGlobe(land);
    enableDrag(land);
});

// Function to draw the globe
function drawGlobe(land) {
    context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

    // Draw the sphere (globe outline)
    context.beginPath();
    path(sphere);
    context.fillStyle = '#ddeeff';
    context.fill();

    // Draw the landmass
    context.beginPath();
    path(land);
    context.fillStyle = '#0055aa'; // Land color
    context.fill();

    // Draw the outline of the globe
    context.beginPath();
    path(sphere);
    context.strokeStyle = '#333';
    context.stroke();
}

// Function to enable drag rotation
function enableDrag(land) {
    let lastX, lastY, rotation = projection.rotate();

    // Add a 'mousedown' event listener
    canvas.addEventListener('mousedown', function(event) {
        lastX = event.pageX;
        lastY = event.pageY;

        // Add mousemove and mouseup events for dragging
        canvas.addEventListener('mousemove', mouseMoved);
        canvas.addEventListener('mouseup', mouseUp);
    });

    // Function for mouse move (rotate globe)
    function mouseMoved(event) {
        const dx = event.pageX - lastX;
        const dy = event.pageY - lastY;

        rotation[0] += dx * 0.5;
        rotation[1] -= dy * 0.5;
        projection.rotate(rotation);

        drawGlobe(land);

        lastX = event.pageX;
        lastY = event.pageY;
    }

    // Function to stop dragging on mouseup
    function mouseUp() {
        canvas.removeEventListener('mousemove', mouseMoved);
        canvas.removeEventListener('mouseup', mouseUp);
    }
}
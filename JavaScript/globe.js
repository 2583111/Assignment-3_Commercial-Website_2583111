const width = 800, height = 800;
const svg = d3.select("#globe-container").append("svg")
  .attr("width", width)
  .attr("height", height);

const projection = d3.geoOrthographic()
  .scale(400)
  .translate([width / 2, height / 2])
  .clipAngle(90)
  .rotate([0, -20]); // Focus on Northern Hemisphere

const path = d3.geoPath().projection(projection);

// Define color scale based on AQI index values (1 to 5)
const colorScale = d3.scaleOrdinal()
  .domain([1, 2, 3, 4, 5])
  .range(["#00FF00", "#FFFF00", "#FFA500", "#FF4500", "#8B0000"]); // Good -> Very Poor

// Define API keys and base URLs
const lineApiKey = 'b3c050faaf739dc9f1bfbace6d9e9b9e';
const lineGeoapifyKey = '92518de6e3a148fba8d948aecc4786cf';
const lineApiUrl = (lat, lon) => `HTTPS://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${lineApiKey}`;
const lineGeoapifyUrl = (lat, lon) => `HTTPS://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${lineGeoapifyKey}`;

const spinner = d3.select("body").append("div")
  .attr("class", "loading-spinner")
  .style("display", "none");

// Create tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("display", "none")
  .style("position", "absolute")
  .style("background", "#fff")
  .style("border", "1px solid #ccc")
  .style("padding", "10px")
  .style("pointer-events", "none")
  .style("z-index", "10");

// Throttling variables
let lineCurrentRequests = 0;
const lineMAX_REQUESTS_PER_MINUTE = 60; // Adjust based on API limits
const lineREQUEST_INTERVAL = 1000 * 60 / lineMAX_REQUESTS_PER_MINUTE; // Time interval between requests
const lineRequestQueue = []; // Queue for pending requests
let lineRequestTimer = null; // Timer for processing requests

// Load and render the simplified globe (with less detail)
d3.json("https://d3js.org/world-110m.v1.json").then(world => {
  const land = topojson.feature(world, world.objects.land);
  const countries = topojson.feature(world, world.objects.countries).features;
  const borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b); // Country borders

  // Draw the globe's sphere (outline)
  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("d", path)
    .attr("fill", "#ADD8E6")
    .attr("stroke", "#000")
    .attr("stroke-width", 1.5);

  // Draw graticule (latitude and longitude lines)
  const graticule = d3.geoGraticule().step([30, 30]); // Fewer lines with larger steps
  svg.append("path")
    .datum(graticule)
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#ccc");

  // Draw landmass (simplified, without small islands)
  svg.append("path")
    .datum(land)
    .attr("d", path)
    .attr("fill", "#228B22")
    .attr("stroke", "#000")
    .attr("stroke-width", 1.5);

  // Draw country borders
  svg.append("path")
    .datum(borders)
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#888")
    .attr("stroke-width", 1.5);

  // Fetch and render air quality data for each country
  svg.selectAll(".country")
    .data(countries)
    .enter().append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("stroke", "#FFF")
    .attr("stroke-width", 1)
    .attr("fill", "#ccc")
    .each(function(d) {
      const centroid = d3.geoCentroid(d);
      const [lon, lat] = centroid;

      // Show spinner while loading data
      spinner.style("display", "block");

      // Add the request to the queue
      lineRequestQueue.push({ lat, lon, pathElement: d3.select(this) });
      processLineQueue(); // Process the queue
    })
    .on("mouseover", (event, d) => {
      // Darken country on hover
      d3.select(event.target).attr("fill", "#555");
      tooltip.style("display", "block")
        .html(`AQI: ${d.aqi || "No Data"}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mousemove", event => {
      tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", (event, d) => {
      // Reset country color on mouse out
      d3.select(event.target).attr("fill", d.aqi ? colorScale(d.aqi) : "#ccc");
      tooltip.style("display", "none");
    })
    .on("click", function(event, d) {
      const centroid = d3.geoCentroid(d);
      const [lon, lat] = centroid;

      // Fetch country name using Geoapify API
      fetchCountryName(lat, lon).then(countryName => {
        // Fetch extended AQI information from the OpenWeather API
        fetchExtendedAQIInfo(lat, lon).then(extendedAQIInfo => {
          const aqiStatus = getAQIStatus(d.aqi);
          // Update tooltip with country name, AQI, and status
          tooltip.style("display", "block")
            .html(
              `<strong>Country:</strong> ${countryName}<br>
              <strong>AQI:</strong> ${d.aqi || "No Data"}<br>
              <strong>Status:</strong> ${aqiStatus}<br>
              <strong>Additional Info:</strong> ${extendedAQIInfo || "No additional data available"}`
            )
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        });
      });
    });

  // Function to get AQI status based on AQI level
  function getAQIStatus(aqi) {
    switch (aqi) {
      case 1: return "Good";
      case 2: return "Moderate";
      case 3: return "Unhealthy for Sensitive Groups";
      case 4: return "Unhealthy";
      case 5: return "Very Unhealthy";
      default: return "No Data";
    }
  }

  // Function to fetch extended AQI information
  async function fetchExtendedAQIInfo(lat, lon) {
    const url = lineApiUrl(lat, lon);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const aqiDetails = data.list[0].components;
      return `
        PM2.5: ${aqiDetails.pm2_5 || "N/A"} µg/m³<br>
        PM10: ${aqiDetails.pm10 || "N/A"} µg/m³<br>
        CO: ${aqiDetails.co || "N/A"} µg/m³<br>
        NO: ${aqiDetails.no || "N/A"} µg/m³<br>
        SO2: ${aqiDetails.so2 || "N/A"} µg/m³<br>
        O3: ${aqiDetails.o3 || "N/A"} µg/m³`;
    } catch (error) {
      console.error('Error fetching extended AQI info:', error);
      return null;
    }
  }

  // Function to fetch air pollution data for a given location (lat, lon)
  async function fetchAirQuality(lat, lon) {
    const url = lineApiUrl(lat, lon);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.list[0].main.aqi; // Return AQI level (1-5)
    } catch (error) {
      console.error('Error fetching air quality data:', error);
      return null;
    }
  }

  // Function to fetch country name using Geoapify
  async function fetchCountryName(lat, lon) {
    const url = lineGeoapifyUrl(lat, lon);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.features[0]?.properties?.country || "Unknown"; // Return country name
    } catch (error) {
      console.error('Error fetching country name:', error);
      return null;
    }
  }

  // Function to process the request queue
  function processLineQueue() {
    // If there are no more requests or if we're currently at max capacity, return
    if (lineRequestQueue.length === 0 || lineCurrentRequests >= lineMAX_REQUESTS_PER_MINUTE) return;

    // Process the next request in the queue
    const { lat, lon, pathElement } = lineRequestQueue.shift(); // Get the next request
    lineCurrentRequests++;

    // Show spinner while loading data
    spinner.style("display", "block");

    // Fetch air quality data for the country's location
    fetchAirQuality(lat, lon).then(aqi => {
      // Hide spinner once data is loaded
      spinner.style("display", "none");
      lineCurrentRequests--;

      // Color the country based on AQI index
      pathElement.attr("fill", aqi ? colorScale(aqi) : "#ccc");
      pathElement.datum().aqi = aqi; // Store AQI in datum

      // Re-process the queue after a delay
      if (!lineRequestTimer) {
        lineRequestTimer = setTimeout(() => {
          lineRequestTimer = null; // Clear the timer
          processLineQueue(); // Process the queue again
        }, lineREQUEST_INTERVAL);
      }
    });

    // Continue processing the queue
    processLineQueue();
  }

  // Function to rotate the globe
  function rotateGlobe(event) {
    const rotate = projection.rotate();
    const k = 0.5; // Speed of rotation

    // Adjust rotation based on drag movement
    projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);

    // Redraw paths
    svg.selectAll("path").attr("d", path);

    // Hide the tooltip if the globe is being rotated
    tooltip.style("display", "none");
  }

  // Drag functionality for rotating the globe
  const drag = d3.drag().on("drag", rotateGlobe);
  svg.call(drag);
});
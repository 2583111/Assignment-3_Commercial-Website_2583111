// Set the dimensions for the scatter plot
const scatterWidth = 800, scatterHeight = 400;
const scatterMargin = { top: 20, right: 30, bottom: 50, left: 50 };

// Define API keys and base URLs
const scatterApiKey = 'b3c050faaf739dc9f1bfbace6d9e9b9e';
const scatterGeoapifyKey = '92518de6e3a148fba8d948aecc4786cf';
const scatterApiUrl = (lat, lon) => `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${scatterApiKey}`;
const scatterGeoapifyUrl = (lat, lon) => `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${scatterGeoapifyKey}`;

// Throttling variables for request queue
const SCATTER_MAX_REQUESTS_PER_MINUTE = 60;
const SCATTER_REQUEST_INTERVAL = 1000 * 60 / SCATTER_MAX_REQUESTS_PER_MINUTE;
let scatterCurrentRequests = 0;
const scatterRequestQueue = [];
let scatterRequestTimer = null;

// Placeholder for AQI data
let scatterAqiData = [];

// Fetch the world map and country data using TopoJSON
d3.json("https://d3js.org/world-110m.v1.json").then(world => {
  const countries = topojson.feature(world, world.objects.countries).features;

  // Initialize the queue for fetching AQI data
  countries.forEach(country => {
    const centroid = d3.geoCentroid(country);
    const [lon, lat] = centroid;

    // Add the request to the queue for AQI data
    scatterRequestQueue.push({ countryName: country.properties.name, lat, lon });
  });

  processScatterQueue(); // Start processing the request queue
});

// Function to process the request queue
function processScatterQueue() {
  if (scatterRequestQueue.length === 0 || scatterCurrentRequests >= SCATTER_MAX_REQUESTS_PER_MINUTE) return;

  // Process the next request in the queue
  const { countryName, lat, lon } = scatterRequestQueue.shift();
  scatterCurrentRequests++;

  fetchScatterAirQuality(lat, lon).then(aqi => {
    scatterCurrentRequests--;
    scatterAqiData.push({ country: countryName, aqi });

    // Once data is fetched, render the scatter plot
    if (scatterRequestQueue.length === 0) {
      renderScatterPlot(scatterAqiData); // Render the graph after fetching all data
    }

    // Re-process the queue after a delay
    if (!scatterRequestTimer) {
      scatterRequestTimer = setTimeout(() => {
        scatterRequestTimer = null;
        processScatterQueue(); // Continue processing the queue
      }, SCATTER_REQUEST_INTERVAL);
    }
  });

  processScatterQueue(); // Continue processing the next request
}

// Function to fetch AQI data for given lat, lon
async function fetchScatterAirQuality(lat, lon) {
  const url = scatterApiUrl(lat, lon);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.list[0].main.aqi; // Return AQI value (1-5)
  } catch (error) {
    console.error('Error fetching air quality data:', error);
    return null;
  }
}

// Function to render the scatter plot
function renderScatterPlot(data) {
  // Remove any existing graph (to refresh)
  d3.select("#linegraph-container").selectAll("*").remove();

  // Create SVG element
  const svg = d3.select("#linegraph-container").append("svg")
    .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
    .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
    .append("g")
    .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

  // Set scales
  const xScale = d3.scaleBand()
    .domain(data.map(d => d.country))
    .range([0, scatterWidth])
    .padding(0.1);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.aqi)])
    .nice() // Rounds up the y-axis values for better readability
    .range([scatterHeight, 0]);

  // Add x-axis
  svg.append("g")
    .attr("transform", `translate(0, ${scatterHeight})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  // Add y-axis
  svg.append("g")
    .call(d3.axisLeft(yScale));

  // Add points for scatter plot
  svg.selectAll(".scatter-point")
    .data(data)
    .enter().append("circle")
    .attr("class", "scatter-point")
    .attr("cx", d => xScale(d.country) + xScale.bandwidth() / 2)
    .attr("cy", d => yScale(d.aqi))
    .attr("r", 5)
    .attr("fill", "steelblue");

  // Add tooltips
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("display", "none")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("padding", "10px");

  svg.selectAll(".scatter-point")
    .on("mouseover", (event, d) => {
      tooltip.style("display", "block")
        .html(`Country: ${d.country}<br>AQI: ${d.aqi}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mousemove", event => {
      tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("display", "none");
    });
}
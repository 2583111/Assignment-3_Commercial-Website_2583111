// Set the dimensions for the line plot
const lineWidth = 800, lineHeight = 400;
const lineMargin = { top: 20, right: 30, bottom: 50, left: 50 };

//  API keys and base URLs
const lineApiKey = 'b3c050faaf739dc9f1bfbace6d9e9b9e'; 
const lineApiUrl = (lat, lon, date) => 
    `http://api.openweathermap.org/data/2.5/air_pollution/history?lat=${lat}&lon=${lon}&start=${date.start}&end=${date.end}&appid=${lineApiKey}`;

// Throttling variables for request queue
const LINE_MAX_REQUESTS_PER_MINUTE = 10; // Reduced number of requests to avoid hitting rate limits
const LINE_REQUEST_INTERVAL = 1000 * 60 / LINE_MAX_REQUESTS_PER_MINUTE; // Space out requests
let lineCurrentRequests = 0;

let lineAqiData = [];

// Function to fetch historical data for Johannesburg over a few years
function fetchHistoricalData() {
    const today = Math.floor(Date.now() / 1000); // Current time in seconds since Unix epoch
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    const yearsBack = 5; // Fetch data from the last 5 years

    // Coordinates for Johannesburg, South Africa
    const johannesburg = { lat: -26.2041, lon: 28.0473 };

    // Loop through each year and fetch AQI data
    for (let i = 0; i < yearsBack; i++) {
        const endDate = today - (i * oneYearInSeconds);
        const startDate = endDate - oneYearInSeconds; // Data for 1 year
        const yearLabel = new Date(endDate * 1000).getFullYear(); // Convert epoch to year

        fetchLineAirQuality(johannesburg.lat, johannesburg.lon, { start: startDate, end: endDate })
            .then(aqi => {
                if (aqi !== null) {
                    lineAqiData.push({ year: yearLabel, aqi });
                }
                // Once all data is fetched, render the plot
                if (i === yearsBack - 1) {
                    renderLinePlot(lineAqiData);
                }
            });
    }
}

// Fetch air quality data for given lat, lon, and date range with retry logic for 429 errors
async function fetchLineAirQuality(lat, lon, date) {
    const url = lineApiUrl(lat, lon, date);
    lineCurrentRequests++;

    try {
        const response = await fetch(url);
        if (response.status === 429) {
            console.warn('Rate limit hit, retrying in 60 seconds...');
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 60 seconds before retrying
            return fetchLineAirQuality(lat, lon, date); // Retry the request
        }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        lineCurrentRequests--;

        // Assuming the data structure contains historical readings
        return data.list.map(entry => entry.main.aqi).reduce((sum, aqi) => sum + aqi, 0) / data.list.length; // Average AQI
    } catch (error) {
        console.error('Error fetching air quality data:', error);
        lineCurrentRequests--;
        return null;
    }
}

// Start fetching historical data
fetchHistoricalData();

// Function to render the line plot
function renderLinePlot(data) {
    d3.select("#linegraph-container").selectAll("*").remove();

    // Create SVG element
    const svg = d3.select("#linegraph-container").append("svg")
        .attr("width", lineWidth + lineMargin.left + lineMargin.right)
        .attr("height", lineHeight + lineMargin.top + lineMargin.bottom)
        .append("g")
        .attr("transform", `translate(${lineMargin.left},${lineMargin.top})`);

    // Set scales
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.year)) // Use actual years for x-axis
        .range([0, lineWidth])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, 5]) // Cap y-axis at 5 for AQI values
        .nice() // Rounds up the y-axis values for better readability
        .range([lineHeight, 0]);

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0, ${lineHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // Add y-axis
    svg.append("g")
        .call(d3.axisLeft(yScale));

    // Add points for line plot
    svg.selectAll(".line-point")
        .data(data)
        .enter().append("circle")
        .attr("class", "line-point")
        .attr("cx", d => xScale(d.year) + xScale.bandwidth() / 2)
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

    svg.selectAll(".line-point")
        .on("mouseover", (event, d) => {
            tooltip.style("display", "block")
                .html(`Year: ${d.year}<br>AQI: ${d.aqi}`)
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
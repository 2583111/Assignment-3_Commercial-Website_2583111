function createAQILegend() {
  const legendData = [
    { level: 1, color: "#00FF00", status: "Good" },
    { level: 2, color: "#FFFF00", status: "Moderate" },
    { level: 3, color: "#FFA500", status: "Unhealthy for Sensitive Groups" },
    { level: 4, color: "#FF4500", status: "Unhealthy" },
    { level: 5, color: "#8B0000", status: "Very Unhealthy" },
  ];

  // Append the legend to the aqi-legend-container instead of the body
  const legendContainer = d3.select("#aqi-legend-container")
    .attr("class", "aqi-legend");

  legendData.forEach(d => {
    const legendItem = legendContainer.append("div")
      .attr("class", "legend-item");

    legendItem.append("div")
      .attr("class", "legend-color")
      .style("background-color", d.color);

    legendItem.append("span")
      .text(`AQI Level ${d.level}: ${d.status}`);
  });
}

// Call the function to create the legend
createAQILegend();
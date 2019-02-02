"use strict";
// DOM elements
var textArea;
var totalLengthArea;
var totalAreaArea;
var lengths;
var totalLength;
var areas;
var totalArea;
var linesLengthPattern = /[L,l]ength\s+=?\s*(\d+\.?\d*)/g;
var hatchAreaPattern = /[A]rea\s*(\d+\.?\d*)/g;
/**
 * Main Function
 */
function main() {
    console.log("Welcome to AutoList");
    // Initalize variables
    totalLength = 0.0;
    // Get DOM elements
    textArea = document.getElementById('input-textarea');
    totalLengthArea = document.getElementById('output-total-length');
    totalAreaArea = document.getElementById('output-total-area');
    // Adding event listeners to the text area
    textArea.addEventListener('input', function () { return textAreaOnInput(); });
}
/**
 * Function that sets the values for the areas and lengths
 */
function textAreaOnInput() {
    lengths = parseString(textArea.value, linesLengthPattern);
    if (lengths.length > 0)
        totalLengthArea.value = lengths.reduce(sum).toFixed(3) + ' m';
    else if (lengths.length === 0)
        totalLengthArea.value = "Total Length";
    areas = parseString(textArea.value, hatchAreaPattern);
    if (areas.length > 0)
        totalAreaArea.value = areas.reduce(sum).toFixed(3);
    else if (areas.length === 0)
        totalAreaArea.value = "Total Area";
}
/**
 * General sum reduction formula
 */
var sum = function (a, b) { return a + b; };
/**
 * return a list of matches from a string given a regex pattern
 */
function parseString(text, re) {
    var match;
    var matches = new Array();
    while (match = re.exec(text)) {
        matches.push(parseFloat(match[1]));
    }
    return matches;
}

"use strict"

// DOM elements
var textArea : HTMLTextAreaElement;
var totalLengthArea : HTMLTextAreaElement;
var totalAreaArea : HTMLTextAreaElement;

var lengths:Array<number>;
var totalLength:number;

var areas:Array<number>;
var totalArea:number;

var linesLengthPattern:RegExp = /[L,l]ength\s+=?\s*(\d+\.?\d*)/g;
var hatchAreaPattern:RegExp = /[A]rea\s*(\d+\.?\d*)/g

/**
 * Main Function
 */
function main()
{
    console.log("Welcome to AutoList")

    // Initalize variables
    totalLength = 0.0;
    

    // Get DOM elements
    textArea = document.getElementById('input-textarea') as HTMLTextAreaElement;
    totalLengthArea = document.getElementById('output-total-length') as HTMLTextAreaElement;
    totalAreaArea = document.getElementById('output-total-area') as HTMLTextAreaElement;

    // Adding event listeners to the text area
    textArea.addEventListener('input', () => textAreaOnInput());
}

/**
 * Function that sets the values for the areas and lengths
 */
function textAreaOnInput()
{
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
const sum = (a:number, b:number):number => a + b;

/**
 * return a list of matches from a string given a regex pattern
 */
function parseString(text:string, re: RegExp) : Array<number>
{
    var match:RegExpMatchArray;
    var matches:Array<number> = new Array<number>();

    while(match = re.exec(text) as RegExpMatchArray)
    {
        matches.push(parseFloat(match[1]));
    }
    return matches;
}
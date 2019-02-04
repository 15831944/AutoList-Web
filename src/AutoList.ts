"use strict"

/**
 * AutoList.ts
 * By: Adam Renaud
 * Created on: 2019-02-03
 * 
 * AutoList is an application that is used to extract information from
 * the List command in AutoCAD
 * 
 * 
 */

// DOM elements
var textArea : HTMLTextAreaElement;
var totalLengthArea : HTMLTextAreaElement;
var totalAreaArea : HTMLTextAreaElement;
var tableDiv: HTMLDivElement;
var currentTable : HTMLTableElement;
var downloadButton: HTMLButtonElement;

// Other Globals
var lengths:Array<number>;
var areas:Array<number>;
var BlockList:Array<Block>;

// Regex patterns
var linesLengthPattern:RegExp = /[L,l]ength\s+=?\s*(\d+\.?\d*)/g;
var hatchAreaPattern:RegExp = /[A]rea\s*(\d+\.?\d*)/g
var textPattern:RegExp = /(text|Contents:)\s*(.*)/g

// For some reason because of the \ char this needed to created
// using the Regex constructor
var mTextFormatting:RegExp = new RegExp("(.*;)(.*)}")

/**
 * Main Function
 * 
 * This function runs when the application starts up
 */
function main()
{
    // Welcome sent to the console
    console.log("Welcome to AutoList")

    // Get DOM elements
    textArea = document.getElementById('input-textarea') as HTMLTextAreaElement;
    totalLengthArea = document.getElementById('output-total-length') as HTMLTextAreaElement;
    totalAreaArea = document.getElementById('output-total-area') as HTMLTextAreaElement;
    tableDiv = document.getElementById('table-div') as HTMLDivElement;
    
    // Set up the download button
    downloadButton = document.getElementById('download-button') as HTMLButtonElement;
    downloadButton.style.display = 'none';

    // Adding event listeners to the text area
    textArea.addEventListener('input', () => textAreaOnInput());
    downloadButton.addEventListener('click', () => downloader("blocks.csv", BlockstoCsv(BlockList)));
}

/**
 * Function that is called everytime that the input event
 * is fired on the text area input element. This function will update
 * all of the other fields of the application
 */
function textAreaOnInput()
{
    // Get the lengths of all the lines, polyline and arcs that are in the
    // string that is in the text area
    lengths = GetObjects(textArea.value, linesLengthPattern);

    // Set the value of the total length text area
    if (lengths.length > 0)
        totalLengthArea.value = lengths.reduce(sum).toFixed(3) + ' m';

    // If there was not length objects to be extracted then
    // reset the value of the text area total length output
    else if (lengths.length === 0)
        totalLengthArea.value = "";

    // Get the area of all hatches and place them into this array
    areas = GetObjects(textArea.value, hatchAreaPattern);

    // If there is atleast one area object calculate the total area
    // and display it in the total area textarea
    if (areas.length > 0)
        totalAreaArea.value = `${areas.reduce(sum).toFixed(3)} m² (${(areas.reduce(sum)/10000).toFixed(3)} ha)`;

    // If there are not area objects then reset the value of the
    // total area textarea
    else if (areas.length === 0)
        totalAreaArea.value = "";

    // Read in the blocks from the text
    var blocks = getBlocks(textArea.value);

    if (blocks.length > 0)
    {
        var oldtable:HTMLTableElement = currentTable;

        // Update the table
        currentTable = updateTable(blocks);

        // If there is no table then we need to append one
        if (tableDiv.childElementCount === 0)
            tableDiv.appendChild(currentTable);
        
        // if there is already a table there, replace that table 
        // with an updated one
        else
            tableDiv.replaceChild(currentTable, oldtable);
        
        // Now that there is at least one block in the list
        // enable the download button
        downloadButton.style.display = 'block';
        BlockList = blocks;
    }

    // If there are no blocks in the list and we are displaying
    // the table and the download button remove them
    if (blocks.length === 0 && tableDiv.childElementCount > 0)
    {
        tableDiv.removeChild(currentTable);
        downloadButton.style.display = 'none';
    }
}

/**
 * General sum reduction formula
 */
const sum = (a:number, b:number):number => a + b;

/**
 * return a list of matches from a string given a regex pattern
 * Note that the objects that are being returned are converted to
 * floats
 * 
 * Returns: An Array<Number> of matches
 */
function GetObjects(text:string, re: RegExp) : Array<number>
{
    var match:RegExpMatchArray;
    var matches:Array<number> = new Array<number>();

    while(match = re.exec(text) as RegExpMatchArray)
    {
        // Convert to a float and push onto the array
        matches.push(parseFloat(match[1]));
    }
    return matches;
}

/**
 * return a list of matches from a string given a regex pattern.
 * This function is used for types that are strings. Unline the other
 * get function this function will not convert anything to a float before
 * it is pushed onto the return array
 * 
 * g: Is the group that the desired text is in within the regex
 * 
 * Returns: An Array<string> of matches
 */
function GetText(text:string, re: RegExp, g:number) : Array<string>
{
    var match:RegExpMatchArray;
    var matches:Array<string> = new Array<string>();

    while(match = re.exec(text) as RegExpMatchArray)
    {
        // Push the string in group g to the array
        matches.push(match[g]);
    }
    return matches;
}

/**
 * Function that creates a list of blocks from input text
 * 
 * Returns: An Array<Block> that contains all of the blocks from the
 * textarea string
 */
function getBlocks(inputText:string): Array<Block>
{
    var blockList = new Array<Block>();

    // Get all of the objects
    var textObjects: Array<string> = GetText(inputText, textPattern, 2);
    var lengthObject: Array<number> = GetObjects(inputText, linesLengthPattern);
    var areaObjects: Array<number> = GetObjects(inputText, hatchAreaPattern);

    /**
     * Order validation pattern controls when the next block should be built and pushed
     * to the array.
     */
    const orderValidationPattern = /(LINE|LWPOLYLINE|HATCH|TEXT|MTEXT|ARC)/g;
    var matches = GetText(inputText, orderValidationPattern, 0);

    // Indexes for the objcts
    var textIndex = 0;
    var lineIndex = 0;
    var areaIndex = 0;

    // Default values for the current objects
    // Note that current text should be null and therefore
    // cannot be assigned to the type string
    var currentText = null;
    var currentLength:number = 0.0;
    var currentArea:number = 0.0;

    // Loop that builds the blocks and pushes them onto the array
    for (var matchIndex = 0; matchIndex < matches.length; ++matchIndex)
    {
        var currentMatch = matches[matchIndex];
        
        // Get the Current Text
        if (textIndex < textObjects.length && currentText == null && (currentMatch == "TEXT" || currentMatch == "MTEXT"))
        {
            currentText = textObjects[textIndex++];

            // There is some additional parsing required for
            // MTEXT in order to remove formatting that AutoCAD adds on
            if (currentMatch == "MTEXT")
            {
                var text = currentText.match(/;*(.*)}*/) as RegExpMatchArray;
                currentText = text[1];
            }
            continue;
        }
        
        // Get the current length
        if (lineIndex < lengthObject.length && (currentMatch == "LWPOLYLINE" || currentMatch == "LINE" || currentMatch == "ARC"))
        {
            currentLength += lengthObject[lineIndex++];
            continue;
        }
        
        // Get the current area
        if (areaIndex < areaObjects.length && currentMatch == "HATCH")
        {
            currentArea += areas[areaIndex++];
            continue;
        }

        // Build condition
        if (textIndex < textObjects.length && currentText != null && (currentMatch == "TEXT" || currentMatch == "MTEXT"))
        {
            // MTEXT parsing to remove additional formatting
            if (currentText != null && mTextFormatting.test(currentText))
            {
                var text = currentText.match(mTextFormatting) as RegExpMatchArray;
                currentText = text[2];
            }

            // Add the current block to the return list
            blockList.push(new Block(currentText, currentLength, currentArea));

            // Reset the current objects to their defaults
            currentText = textObjects[textIndex++];
            currentLength = 0.0;
            currentArea = 0.0;
        }
    }

    // Add the last block from the list
    if (blockList.length < textObjects.length)
    {
        // Additional Parsing required for mtext
        if (currentText != null && mTextFormatting.test(currentText))
        {
            var text = currentText.match(mTextFormatting) as RegExpMatchArray;
            currentText = text[2];
        }

        // Push the final block onto the array
        blockList.push(new Block(currentText as string, currentLength, currentArea));
    }

    return blockList;
}

/**
 * Creates an updated table element from an array of blocks
 * 
 * blocks: The Array of blocks that will be turned into a table element
 * 
 * Returns: A table element where each row represents a block 
 */
function updateTable(blocks:Array<Block>) : HTMLTableElement
{
    // Create the table and set attributes
    var table = document.createElement('table');
    table.setAttribute('class', "table");

    // Create the header and the body
    var header = document.createElement('thead');
    var body = document.createElement('tbody');

    // Headers
    // Block ID
    var h1 = document.createElement('th');
    h1.textContent = "Block ID";
    header.appendChild(h1);

    // Frontage or length of the block
    var h2 = document.createElement('th');
    h2.textContent = "Frontage";
    header.appendChild(h2);

    // Area of the block in square meters
    var h3 = document.createElement('th');
    h3.textContent = "Area (m²)"
    header.appendChild(h3);

    // Area of the block in hectares
    var h4 = document.createElement('th');
    h4.textContent = "Area (Ha)"
    header.appendChild(h4);

    // Area of the block in Acres
    var h5 = document.createElement('th');
    h5.textContent = "Area (Ac)"
    header.appendChild(h5);

    // create the rows for the body of the table
    blocks.forEach((block) => {

        // The current row
        var row = document.createElement('tr');

        // The cells for this row
        var IDcell = document.createElement('td');
        var Frontagecell = document.createElement('td');
        var AreaMCell = document.createElement('td');
        var AreaHaCell = document.createElement('td');
        var AreaAcCell = document.createElement('td');
        
        // Assign values to the cells
        IDcell.textContent = block.Id;
        Frontagecell.textContent = block.Frontage.toFixed(3);
        AreaMCell.textContent = block.AreaM.toFixed(3);
        AreaHaCell.textContent = block.AreaHa.toFixed(3);
        AreaAcCell.textContent = block.AreaAc.toFixed(3);

        // Append the cells to the row
        row.appendChild(IDcell);
        row.appendChild(Frontagecell);
        row.appendChild(AreaMCell);
        row.appendChild(AreaHaCell);
        row.appendChild(AreaAcCell);

        // Append the row to the body
        body.appendChild(row);

        // Contunue for all blocks
    });

    // Append the header and the body to the table
    table.appendChild(header);
    table.appendChild(body);

    return table;
}

/**
 * Convert the block array to a CSV String
 */
function BlockstoCsv(blocks: Array<Block>):string
{
    // Initalize the return string with the headers of the the csv file
    var returnString:string = "Block ID,Frontage,Area(m2),Area(Ha),Area(Ac)\n";

    // For each block append a string that contains the blocks information
    blocks.forEach((block) => {
        returnString = returnString
            .concat(`${block.Id},${block.Frontage},${block.AreaM},${block.AreaHa},${block.AreaAc}\n`);
    });

    return returnString;
}

/**
 * Downloader function. This function is used to create a download
 * link that is then clicked so the user can download a file
 * 
 * filename: The filename of the file that is to be downloaded
 * 
 * text: The payload of the file. This only supports text files
 * 
 * Returns: nothing
 */
function downloader(filename:string, text:string)
{
    // Create a link element
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    // Make sure that it is hidden
    element.style.display = 'none';

    // Append it to the dom
    document.body.appendChild(element);

    // Click to init the download
    element.click();

    // Clean up after we are done
    document.body.removeChild(element);
}

/**
 * Class that defines a block data structure
 */
class Block 
{
    // The Id of the block, the block name
    Id : string;

    // The fontage of a block
    Frontage : number;

    // The area of the block in square meters
    AreaM : number;

    // The area of the block in Hectares
    AreaHa : number;

    // The area of the block in Acres
    AreaAc : number;

    /**
     * Constructor for the block class
     * Note that the block must have an id but not a frontage or an area
     */
    constructor(id:string, frontage:number = 0, areaM:number = 0)
    {
        this.Id = id;
        this.Frontage = frontage;
        this.AreaM = areaM;
        this.AreaHa = areaM / 10000;
        this.AreaAc = this.AreaHa * 2.471;
    }
}

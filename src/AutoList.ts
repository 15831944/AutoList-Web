"use strict"

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

/**
 * Main Function
 */
function main()
{
    console.log("Welcome to AutoList")

    // Get DOM elements
    textArea = document.getElementById('input-textarea') as HTMLTextAreaElement;
    totalLengthArea = document.getElementById('output-total-length') as HTMLTextAreaElement;
    totalAreaArea = document.getElementById('output-total-area') as HTMLTextAreaElement;
    tableDiv = document.getElementById('table-div') as HTMLDivElement;
    
    downloadButton = document.getElementById('download-button') as HTMLButtonElement;
    downloadButton.style.display = 'none';

    // Adding event listeners to the text area
    textArea.addEventListener('input', () => textAreaOnInput());
    downloadButton.addEventListener('click', () => downloader("blocks.csv", BlockstoCsv(BlockList)));
}

/**
 * Function that sets the values for the areas and lengths
 */
function textAreaOnInput()
{
    lengths = GetObjects(textArea.value, linesLengthPattern);
    if (lengths.length > 0)
        totalLengthArea.value = lengths.reduce(sum).toFixed(3) + ' m';

    else if (lengths.length === 0)
        totalLengthArea.value = "";

    areas = GetObjects(textArea.value, hatchAreaPattern);
    if (areas.length > 0)
        totalAreaArea.value = `${areas.reduce(sum).toFixed(3)} m² (${(areas.reduce(sum)/10000).toFixed(3)} ha)`;

    else if (areas.length === 0)
        totalAreaArea.value = "";

    var blocks = getBlocks(textArea.value);
    if (blocks.length > 0)
    {
        var oldtable:HTMLTableElement = currentTable;
        currentTable = updateTable(blocks);
        if (tableDiv.childElementCount === 0)
            tableDiv.appendChild(currentTable);
        else
            tableDiv.replaceChild(currentTable, oldtable);
        
        downloadButton.style.display = 'block';
        BlockList = blocks;
    }
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
 */
function GetObjects(text:string, re: RegExp) : Array<number>
{
    var match:RegExpMatchArray;
    var matches:Array<number> = new Array<number>();

    while(match = re.exec(text) as RegExpMatchArray)
    {
        matches.push(parseFloat(match[1]));
    }
    return matches;
}

/**
 * return a list of matches from a string given a regex pattern
 */
function GetText(text:string, re: RegExp, g:number) : Array<string>
{
    var match:RegExpMatchArray;
    var matches:Array<string> = new Array<string>();

    while(match = re.exec(text) as RegExpMatchArray)
    {
        matches.push(match[g]);
    }
    return matches;
}

/**
 * Function that creates a list of blocks
 */
function getBlocks(inputText:string): Array<Block>
{
    var blockList = new Array<Block>();

    var textObjects: Array<string> = GetText(inputText, textPattern, 2);
    var lengthObject: Array<number> = GetObjects(inputText, linesLengthPattern);
    var areaObjects: Array<number> = GetObjects(inputText, hatchAreaPattern);

    const orderValidationPattern = /(LINE|LWPOLYLINE|HATCH|TEXT|MTEXT|ARC)/g;
    var matches = GetText(inputText, orderValidationPattern, 0);

    var textIndex = 0;
    var lineIndex = 0;
    var areaIndex = 0;

    var currentText = null;
    var currentLength:number = 0.0;
    var currentArea:number = 0.0;

    for (var matchIndex = 0; matchIndex < matches.length; ++matchIndex)
    {
        var currentMatch = matches[matchIndex];

        if (textIndex < textObjects.length && currentText == null && (currentMatch == "TEXT" || currentMatch == "MTEXT"))
        {
            currentText = textObjects[textIndex++];
            continue;
        }

        if (lineIndex < lengthObject.length && (currentMatch == "LWPOLYLINE" || currentMatch == "LINE" || currentMatch == "ARC"))
        {
            currentLength += lengthObject[lineIndex++];
            continue;
        }

        if (areaIndex < areaObjects.length && currentMatch == "HATCH")
        {
            currentArea += areas[areaIndex++];
            continue;
        }

        if (textIndex < textObjects.length && currentText != null && (currentMatch == "TEXT" || currentMatch == "MTEXT"))
        {
            blockList.push(new Block(currentText, currentLength, currentArea));
            currentText = textObjects[textIndex++];
            currentLength = 0.0;
            currentArea = 0.0;
        }
    }

    if (blockList.length < textObjects.length)
    {
        blockList.push(new Block(currentText as string, currentLength, currentArea));
    }

    return blockList;
}

function updateTable(blocks:Array<Block>) : HTMLTableElement
{
    var table = document.createElement('table');
    table.setAttribute('class', "table");
    var header = document.createElement('thead');
    var body = document.createElement('tbody');

    // Headers
    var h1 = document.createElement('th');
    h1.textContent = "Block ID";
    header.appendChild(h1);
    var h2 = document.createElement('th');
    h2.textContent = "Frontage";
    header.appendChild(h2);
    var h3 = document.createElement('th');
    h3.textContent = "Area (m²)"
    header.appendChild(h3);
    var h4 = document.createElement('th');
    h4.textContent = "Area (Ha)"
    header.appendChild(h4);
    var h5 = document.createElement('th');
    h5.textContent = "Area (Ac)"
    header.appendChild(h5);

    // Body
    blocks.forEach((block) => {

        var row = document.createElement('tr');

        var IDcell = document.createElement('td');
        var Frontagecell = document.createElement('td');
        var AreaMCell = document.createElement('td');
        var AreaHaCell = document.createElement('td');
        var AreaAcCell = document.createElement('td');



        IDcell.textContent = block.Id;
        Frontagecell.textContent = block.Frontage.toFixed(3);
        AreaMCell.textContent = block.AreaM.toFixed(3);
        AreaHaCell.textContent = block.AreaHa.toFixed(3);
        AreaAcCell.textContent = block.AreaAc.toFixed(3);


        row.appendChild(IDcell);
        row.appendChild(Frontagecell);
        row.appendChild(AreaMCell);
        row.appendChild(AreaHaCell);
        row.appendChild(AreaAcCell);

        
        body.appendChild(row);
    })

    table.appendChild(header);
    table.appendChild(body);

    return table;
}

/**
 * Convert the block array to a CSV String
 */
function BlockstoCsv(blocks: Array<Block>):string
{
    var returnString:string = "Block ID,Frontage,Area(m2),Area(Ha),Area(Ac)\n";

    blocks.forEach((block) => {
        returnString = returnString
            .concat(`${block.Id},${block.Frontage},${block.AreaM},${block.AreaHa},${block.AreaAc}\n`);
    });

    return returnString;
}

function downloader(filename:string, text:string)
{
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';

    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

/**
 * Class that defines a block data structure
 */
class Block 
{
    Id : string;
    Frontage : number;
    AreaM : number;
    AreaHa : number;
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


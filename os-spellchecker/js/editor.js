var iframeDocument = null;
var editorOverlayDiv = null;
//var osSuggestionOverlay = null;
//var osSuggestionOverlayList = null;
var spellCheckArray = [];
var problemIdCounter = 1;
var osSuggestionOverlay = document.getElementById("os-suggestion-overlay");
var osSuggestionOverlayList = document.getElementById("os-contextmenu");
const problemLines = new Map();
var spellcheckerResponse = null;
function initialize() {
    var parentDiv = document.getElementById("cke_1_contents");
    iframeDocument = parentDiv.getElementsByTagName("iframe")[0].contentDocument;
    var htmlElement = iframeDocument.childNodes[1];
    createEditorOverlayDiv(htmlElement);
    setCSSLink(htmlElement.childNodes[0]);
    //setJSLink(htmlElement.childNodes[0]);
    spellcheckerResponse = resp3;
    spellCheck();
}
function setCSSLink(element) {
    var cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.type = 'text/css';
    cssLink.href = 'css/editor.css';
    element.appendChild(cssLink);
}
function setJSLink(element) {
    var jsLink = document.createElement('script');
    jsLink.src = 'js/container.js';
    element.appendChild(jsLink);
}
function spellCheck() {
    console.log("[spellCheck]>");
    getChildElements(iframeDocument.body.children);
    //TO DO make api call and create div to highlight words with suggestions     
}
function createEditorOverlayDiv(element) {
    var pos = getPosition(element);
    var parentDiv = document.createElement("div");
    parentDiv.id = "editor-overlay";
    parentDiv.style.position = "absolute";
    parentDiv.style.top = "0px";
    parentDiv.style.left = "0px";
    element.appendChild(parentDiv);
    editorOverlayDiv = parentDiv;
    //createEditorSuggestionsDiv(element);
}
function createEditorSuggestionsDiv(element) {
    var pos = getPosition(element);
    var parentDiv = document.createElement("div");
    parentDiv.id = "os-suggestion-overlay";
    parentDiv.setAttribute("class", "os-suggestion-overlay");
    parentDiv.style.position = "absolute";
    parentDiv.style.top = "0px";
    parentDiv.style.left = "0px";
    parentDiv.onmouseleave = (e) => hideSuggestions();
    var childUL = document.createElement("ul");
    childUL.id = "os-contextmenu";
    childUL.setAttribute("class", "os-contextmenu");
    //parentDiv.innerHTML = "<ul id=\"os-contextmenu\" class=\"os-contextmenu\"></ul>";
    parentDiv.appendChild(childUL);
    element.appendChild(parentDiv);
    osSuggestionOverlay = parentDiv;
    osSuggestionOverlayList = parentDiv.firstChild;
}
function getChildElements(elements) {
    for (var i = 0; i < elements.length; i++) {
        var elem = elements[i];
        console.log("[getChildElements]> ", elem);
        sendData(elem);
        //getChildElements(elem);
    }
}
function getPosition(element) {
    var pos = element.getBoundingClientRect();
    console.log("[getPosition]> ", pos.top, pos.left);
    return {
        top: pos.top + window.scrollY,
        left: pos.left + window.scrollX
    };
}
function sendData(element) {
    console.log("[sendData]> ", element.innerHTML);
    problemLines.set(problemIdCounter, element.innerHTML);
    setSpellCheckSuggestions(element, spellcheckerResponse, problemIdCounter);
    problemIdCounter++;
}
function setSpellCheckSuggestions(element, response, id) {
    var pos = element.getBoundingClientRect();
    var w = pos.width;
    console.log("[setSpellCheckSuggestions]> width: ", w);
    while (editorOverlayDiv.firstChild) {
        editorOverlayDiv.removeChild(editorOverlayDiv.firstChild);
    }
    var suggestions = response.data;
    for (var i = 0; i < suggestions.length; i++) {
        var word = suggestions[i];
        var childSpan = document.createElement("span");
        childSpan.id = "os-span-" + response.id + "-" + word.sid;
        //childSpan.className = "spellcheck-highlight";
        childSpan.style.position = "absolute";       
        var wordPosition = getWordPosition(element, word.pos, word.len);
        childSpan.style.top = wordPosition.top + 13 + "px";
        childSpan.style.left = wordPosition.left + 3 + "px"; //position of the word
        childSpan.style.width = wordPosition.width + 2 + "px";//width of the word
        childSpan.style.zIndex = "1";
        childSpan.onmouseover = (e) => showSuggestions(e);
        childSpan.setAttribute("class", "spellcheck-highlight os-span-"+word.type);
        childSpan.setAttribute("os-message", word.message);
        childSpan.setAttribute("os-sugestions", word.suggestion);
        childSpan.setAttribute("os-word", word.word);
        childSpan.setAttribute("os-id", response.id);
        childSpan.setAttribute("os-sugestion-id", word.sid);
        childSpan.setAttribute("os-start", word.pos);
        childSpan.setAttribute("os-length", word.len);
        editorOverlayDiv.appendChild(childSpan);
    }
    console.log("[setSpellCheckSuggestions]> ", response);
}
function getWordPosition(element, startOffset, wordLength) {
    var range = document.createRange();
    range.setStart(element.firstChild, startOffset - 1);
    range.setEnd(element.firstChild, startOffset + wordLength - 1);
    return range.getBoundingClientRect();
}

function showSuggestions(e) {
    var elem = e.currentTarget;
    var message = elem.getAttribute("os-message");
    var actualWordId = elem.getAttribute("os-sugestion-id");
    var word = elem.getAttribute("os-word");
    var suggestions = elem.getAttribute("os-sugestions");
    var lineId = elem.getAttribute("os-id");
    var startOffset = elem.getAttribute("os-start");
    var wordLength = elem.getAttribute("os-length");
    console.log("[showSuggestions]> os-message: ", message);
    console.log("[showSuggestions]> os-sugestions: ", suggestions);
    var arr = suggestions.split(",");
    osSuggestionOverlayList.innerHTML = "";
    for (var i = 0; i < arr.length; i++) {
        osSuggestionOverlayList.innerHTML += "<li onclick=\"updateWord(" + actualWordId + ",'" + arr[i] + "'," + lineId + "," + startOffset + ", " + wordLength + ")\" class=\"os-contextmenu-list\">" + arr[i] + "</li>";
    }
    var position = getPosition(elem);
    osSuggestionOverlay.style.top = position.top + 120 + 'px';
    osSuggestionOverlay.style.left = position.left + 10 + 'px';
    osSuggestionOverlay.style.display = 'block';
}
function updateWord(actualWordId, newWord, lineId, startOffset, wordLength) {
    console.log("[updateWord]> word: ", newWord);
    console.log("[updateWord]> lineId: ", lineId);
    var content = problemLines.get(lineId);
    var target = sanitizeLines(content);
    target = target.replace(target.substring(startOffset, startOffset + wordLength), newWord);
    updateCKEditorContent(content, target);
    problemLines.set(lineId, target);
    console.log(problemLines);
    hideSuggestions();
    updateResponse(actualWordId, wordLength, newWord.length);
    spellCheck();
}
function updateCKEditorContent(content, target) {
    var contents = iframeDocument.body.children;
    for (var i = 0; i < contents.length; i++) {
        var elem = contents[i];
        console.log("[updateCKEditorContent]> ", elem);
        if (content == elem.innerHTML) {
            elem.innerHTML = target;
        }
    }
}
function hideSuggestions() {
    osSuggestionOverlay.style.display = 'none';
}
function sanitizeLines(line) {
    return line.replace(/&nbsp;/g, ' ');
}
function updateResponse(sid, wordLength, newWordLength) {
    //spellcheckerResponse.data = spellcheckerResponse.data.filter(function (e) { return e.sid != sid; });
    var data = spellcheckerResponse.data;
    var newData = [];
    for (let i = 0; i < data.length; i++) {
        var item = data[i];
        if (item.sid !== sid) {
            if (item.sid < sid) {
                newData.push(item);
            } else {
                item.pos = item.pos + newWordLength - wordLength;
                newData.push(item);
            }
        }
    }
    spellcheckerResponse.data = newData;
}
window.addEventListener('resize', function (event) {
    spellCheck();
});
console.log("[OS SpellChecker]> Version 1.0.0");
//paste this text in editor 
//yuu te werewewer
//Her ar the new verion updates of OS-Spellchecker.
//Enter you text here. Hover on the marked words for intant correction suggestions. To got the whole text checked at once, switch to the Proofread in dialog mode in the editr settings.
var resp = {
    "id": 1,
    "data": [
        {
            "sid": 1,
            "type":"spelling",
            "word": "yuu",
            "pos": 0,
            "len": 3,
            "message": "Spelling mistake",
            "suggestion": [
                "you", "yours"
            ]
        },
        {
            "sid": 2,
            "type":"spelling",
            "word": "te",
            "pos": 4,
            "len": 2,
            "message": "Spelling mistake",
            "suggestion": [
                "to", "too"
            ]
        },
        {
            "sid": 3,
            "type":"spelling",
            "word": "werewewer",
            "pos": 7,
            "len": 8,
            "message": "Spelling mistake",
            "suggestion": [
                "where", "were"
            ]
        }
    ]
};
var resp2 = {
    "id": 1,
    "data": [
        {
            "sid": 1,
            "type":"grammer",
            "word": "Her",
            "pos": 0,
            "len": 3,
            "message": "Grammer mistake",
            "suggestion": [
                "Here", "here"
            ]
        },
        {
            "sid": 2,
            "type":"spelling",
            "word": "ar",
            "pos": 4,
            "len": 2,
            "message": "Spelling mistake",
            "suggestion": [
                "are"
            ]
        },
        {
            "sid": 3,
            "type":"spelling",
            "word": "verion",
            "pos": 15,
            "len": 6,
            "message": "Spelling mistake",
            "suggestion": [
                "version", "versions"
            ]
        }
    ]
};
var resp3 = {
    "id": 1,
    "data": [
        {
            "sid": 1,
            "type":"grammer",
            "word": "you",
            "pos": 6,
            "len": 3,
            "message": "Grammer mistake",
            "suggestion": [
                "your"
            ]
        },
        {
            "sid": 2,
            "type":"spelling",
            "word": "intant",
            "pos": 51,
            "len": 6,
            "message": "Spelling mistake",
            "suggestion": [
                "instant"
            ]
        },
        {
            "sid": 3,
            "type":"grammer",
            "word": "got",
            "pos": 85,
            "len": 3,
            "message": "Grammer mistake",
            "suggestion": [
                "get", "go to"
            ]
        },
        {
            "sid": 4,
            "type":"spelling",
            "word": "editr",
            "pos": 167,
            "len": 5,
            "message": "Spelling mistake",
            "suggestion": [
                "editor", "edit"
            ]
        }
    ]
};
var wsbundleResponce = { "r": [{ "m": [{ "t": "grammar", "o": 6, "l": 3, "m": "", "r": "4557035884548616689", "d": "", "c": "", "s": ["your"] }], "l": "en_US" }, { "m": [{ "t": "spelling", "o": 30, "l": 6, "m": "Spelling mistake", "s": ["instant"] }], "l": "en_US" }, { "m": [{ "t": "grammar", "o": 3, "l": 3, "m": "", "r": "1793119878962162431", "d": "", "c": "", "s": ["get"] }], "l": "en_US" }] };
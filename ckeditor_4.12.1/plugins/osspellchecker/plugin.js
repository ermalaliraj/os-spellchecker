
CKEDITOR.plugins.add('osspellchecker', {
    init: function (editor) {
        var spellchecker = this;
        editor.on('contentDom', function (event) {
            if (documentElement === null) {
                initialize(spellchecker, event);
                //spellCheck();
            }
        });
        editor.on('key', function (event) {
            if(event.data.keyCode == 190){
                spellCheck();
                console.log(event.data.keyCode);
            }
        });
        editor.on('afterPaste', function (event) {
            spellCheck();
        });
    },
    onLoad: function () {
        CKEDITOR.document.appendStyleSheet(this.path + 'skins/default.css');
    },
});
var serviceURL = "https://api.languagetoolplus.com/v2/check";
var documentElement = null;
var document$ = null;
var editor = null;
var documentBody = null;
var editorOverlayDiv = null;
var problemIdCounter = 0;
var suggestionsIdCounter = 1;
var osSuggestionOverlay = null;
var osSuggestionOverlayList = null;
var osSpanId = null;
const problemLines = new Map();
var spellcheckerResponse = null;
function initialize(spellchecker, event) {
    editor = event.editor;
    document$ = editor.document.$;
    documentElement = document$.documentElement;
    documentBody = documentElement.childNodes[1];
    createEditorOverlayDiv(documentElement);
    setCSSLink(documentElement.childNodes[0], spellchecker.path + 'skins/default.css');
    spellcheckerResponse = languagetoolplusResponse;
}
function setCSSLink(element, cssPath) {
    var cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.type = 'text/css';
    cssLink.href = cssPath;
    element.appendChild(cssLink);
}
function spellCheck() {
    console.log("[spellCheck]>");
    while (editorOverlayDiv.firstChild) {
        editorOverlayDiv.removeChild(editorOverlayDiv.firstChild);
    }
    getChildElements(documentBody.children);
    editor.updateElement();
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
    createEditorSuggestionsDiv(element);
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
    var content = element.innerHTML;
    console.log("[sendData]> ", content);
    if(content !== "<br>"){
        problemIdCounter++;
        problemLines.set(problemIdCounter, content);
        sendRequest(content, "en-US", element, problemIdCounter);//API Call 
    }
}
function underlineWords(element, response, id) {
    var pos = element.getBoundingClientRect();
    var w = pos.width;
    console.log("[underlineWords]> width: ", w);
    var suggestions = response.matches;
    for (var i = 0; i < suggestions.length; i++) {
        var word = suggestions[i];
        var replacements = word.replacements;
        var suggestionArray = [];
        for (var j = 0; j < replacements.length; j++) {
            suggestionArray.push(replacements[j].value)
        }
        var childSpan = document.createElement("span");
        childSpan.id = "os-span-" + response.id + "-" + suggestionsIdCounter;
        childSpan.style.position = "absolute";
        var wordPosition = getWordPosition(element, word.offset, word.length);
        childSpan.style.top = wordPosition.top + 13 + "px";
        childSpan.style.left = wordPosition.left + 3 + "px"; //position of the word
        childSpan.style.width = wordPosition.width + 2 + "px";//width of the word
        childSpan.style.zIndex = "1";
        childSpan.onmouseover = (e) => showSuggestions(e);
        childSpan.setAttribute("class", "spellcheck-highlight os-span-" + word.rule.category.id);
        childSpan.setAttribute("os-message", word.message);
        childSpan.setAttribute("os-sugestions", suggestionArray);
        childSpan.setAttribute("os-id", id);
        childSpan.setAttribute("os-sugestion-id", suggestionsIdCounter);
        childSpan.setAttribute("os-start", word.offset);
        childSpan.setAttribute("os-length", word.length);
        childSpan.setAttribute("os-x", pos.x);
        childSpan.setAttribute("os-y", pos.y);
        editorOverlayDiv.appendChild(childSpan);
        suggestionsIdCounter++;
    }
    console.log("[underlineWords]> ", response);
}
function getWordPosition(element, startOffset, wordLength) {
    var range = document.createRange();
    range.setStart(element.firstChild, startOffset - 1);
    range.setEnd(element.firstChild, startOffset + wordLength - 1);
    return range.getBoundingClientRect();
}
function showSuggestions(e) {
    var elem = e.currentTarget;
    osSpanId = elem.id;
    console.log("[showSuggestions]> osSpanId: ", osSpanId);
    var message = elem.getAttribute("os-message");
    var actualWordId = elem.getAttribute("os-sugestion-id");
    var suggestions = elem.getAttribute("os-sugestions");
    var lineId = elem.getAttribute("os-id");
    var startOffset = elem.getAttribute("os-start");
    var wordLength = elem.getAttribute("os-length");
    var coordinateX = elem.getAttribute("os-x");
    var coordinateY = elem.getAttribute("os-y");
    console.log("[showSuggestions]> os-message: ", message);
    console.log("[showSuggestions]> os-sugestions: ", suggestions);
    var arr = suggestions.split(",");
    var newWord = "";
    osSuggestionOverlayList.innerHTML = "";
    for (var i = 0; i < arr.length; i++) {
        var childLI = document.createElement("li");
        childLI.onclick = (e) => updateWord(e, Number(actualWordId), Number(lineId), Number(startOffset), Number(wordLength), Number(coordinateX), Number(coordinateY));
        childLI.setAttribute("class", "os-contextmenu-list");
        childLI.innerHTML = arr[i];
        osSuggestionOverlayList.appendChild(childLI);
    }
    var position = getPosition(elem);
    osSuggestionOverlay.style.top = position.top + 'px';
    osSuggestionOverlay.style.left = position.left + 'px';
    osSuggestionOverlay.style.display = 'block';
}
function updateWord(event, actualWordId, lineId, startOffset, wordLength, x, y) {
    var newWord = event.currentTarget.innerText;
    console.log("[updateWord]> word: ", newWord);
    console.log("[updateWord]> lineId: ", lineId);
    var elem = getElementToUpdateContent(x, y);
    var content = problemLines.get(lineId);
    var target = sanitizeLines(content);
    target = target.replace(target.substring(startOffset, startOffset + wordLength), newWord);
    elem.innerHTML = target;
    problemLines.set(lineId, target);
    console.log(problemLines);
    hideSuggestions();
    deleteWordUnderline();
    //updateResponse(actualWordId, wordLength, newWord.length);
    //spellCheck();
}
function deleteWordUnderline(){
    var child = document$.getElementById(osSpanId);
    editorOverlayDiv.removeChild(child);
}
function getElementToUpdateContent(x, y){
    var elem = document$.elementFromPoint(x, y);
    return elem;
}
function hideSuggestions() {
    osSuggestionOverlay.style.display = 'none';
}
function sanitizeLines(line) {
    return line.replace(/&nbsp;/g, ' ');
}
function updateResponse(sid, wordLength, newWordLength) {
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
function sendRequest(data, language, element, id) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            underlineWords(element, JSON.parse(this.responseText), problemIdCounter);
            console.log(this.responseText);
        }
    };
    xhttp.open("POST", serviceURL, true);
    xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhttp.setRequestHeader("Accept", "application/json");
    const searchParams = new URLSearchParams();
    searchParams.append("text", data);
    searchParams.append("language", language);
    searchParams.append("enabledOnly", false);
    searchParams.append("level", "default");
    xhttp.send(searchParams);
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
            "type": "spelling",
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
            "type": "spelling",
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
            "type": "spelling",
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
            "type": "grammer",
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
            "type": "spelling",
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
            "type": "spelling",
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
            "type": "grammer",
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
            "type": "spelling",
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
            "type": "grammer",
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
            "type": "spelling",
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
var languagetoolplusResponse = {
    "software": {
        "name": "LanguageTool",
        "version": "6.4.12",
        "buildDate": "2024-01-17 11:55:05 +0100",
        "apiVersion": 1,
        "premium": true,
        "premiumHint": "You might be missing errors only the Premium version can find. Contact us at support<at>languagetoolplus.com.",
        "status": ""
    },
    "warnings": {
        "incompleteResults": false
    },
    "language": {
        "name": "English (US)",
        "code": "en-US",
        "detectedLanguage": {
            "name": "English (US)",
            "code": "en-US",
            "confidence": 0.99,
            "source": "fasttext"
        }
    },
    "matches": [
        {
            "message": "“you” seems less likely than “your” (belonging to you).",
            "shortMessage": "“you” not likely",
            "replacements": [
                {
                    "value": "your",
                    "shortDescription": "belonging to you"
                }
            ],
            "offset": 6,
            "length": 3,
            "context": {
                "text": "Enter you text here. Hover on the marked words fo...",
                "offset": 6,
                "length": 3
            },
            "sentence": "Enter you text here.",
            "type": {
                "typeName": "Other"
            },
            "rule": {
                "id": "AI_HYDRA_LEO_CP_YOU_YOUR",
                "description": "Detects potentially wrong usage of \"you\"",
                "issueType": "uncategorized",
                "category": {
                    "id": "MISC",
                    "name": "Miscellaneous"
                },
                "isPremium": false
            },
            "ignoreForIncompleteSentence": false,
            "contextForSureMatch": 0
        },
        {
            "message": "Possible spelling mistake found.",
            "shortMessage": "Spelling mistake",
            "replacements": [
                {
                    "value": "intent"
                },
                {
                    "value": "infant"
                },
                {
                    "value": "instant"
                },
                {
                    "value": "intact"
                },
                {
                    "value": "int ant"
                }
            ],
            "offset": 51,
            "length": 6,
            "context": {
                "text": "...ext here. Hover on the marked words for intant correction suggestions. To got the whol...",
                "offset": 43,
                "length": 6
            },
            "sentence": "Hover on the marked words for intant correction suggestions.",
            "type": {
                "typeName": "UnknownWord"
            },
            "rule": {
                "id": "MORFOLOGIK_RULE_EN_US",
                "description": "Possible spelling mistake",
                "issueType": "misspelling",
                "category": {
                    "id": "TYPOS",
                    "name": "Possible Typo"
                },
                "isPremium": false
            },
            "ignoreForIncompleteSentence": false,
            "contextForSureMatch": 0
        },
        {
            "message": "The verb after “to” should be in the base form as part of the to-infinitive. A verb can take many forms, but the base form is always used in the to-infinitive.",
            "shortMessage": "",
            "replacements": [
                {
                    "value": "get"
                }
            ],
            "offset": 85,
            "length": 3,
            "context": {
                "text": "...s for intant correction suggestions. To got the whole text checked at once, switch ...",
                "offset": 43,
                "length": 3
            },
            "sentence": "To got the whole text checked at once, switch to the Proofread in dialog mode in the editr settings.",
            "type": {
                "typeName": "Other"
            },
            "rule": {
                "id": "TO_NON_BASE",
                "subId": "5",
                "sourceFile": "grammar.xml",
                "description": "'to' + non-base form",
                "issueType": "grammar",
                "category": {
                    "id": "GRAMMAR",
                    "name": "Grammar"
                },
                "isPremium": false
            },
            "ignoreForIncompleteSentence": true,
            "contextForSureMatch": -1
        },
        {
            "message": "Possible spelling mistake found.",
            "shortMessage": "Spelling mistake",
            "replacements": [
                {
                    "value": "editor"
                },
                {
                    "value": "edit"
                },
                {
                    "value": "Edith"
                },
                {
                    "value": "edits"
                }
            ],
            "offset": 167,
            "length": 5,
            "context": {
                "text": "... to the Proofread in dialog mode in the editr settings.",
                "offset": 43,
                "length": 5
            },
            "sentence": "To got the whole text checked at once, switch to the Proofread in dialog mode in the editr settings.",
            "type": {
                "typeName": "UnknownWord"
            },
            "rule": {
                "id": "MORFOLOGIK_RULE_EN_US",
                "description": "Possible spelling mistake",
                "issueType": "misspelling",
                "category": {
                    "id": "TYPOS",
                    "name": "Possible Typo"
                },
                "isPremium": false
            },
            "ignoreForIncompleteSentence": false,
            "contextForSureMatch": 0
        }
    ],
    "sentenceRanges": [
        [
            0,
            20
        ],
        [
            21,
            81
        ],
        [
            82,
            182
        ]
    ],
    "extendedSentenceRanges": [
        {
            "from": 0,
            "to": 20,
            "detectedLanguages": [
                {
                    "language": "en",
                    "rate": 1.0
                }
            ]
        },
        {
            "from": 21,
            "to": 81,
            "detectedLanguages": [
                {
                    "language": "en",
                    "rate": 1.0
                }
            ]
        },
        {
            "from": 82,
            "to": 182,
            "detectedLanguages": [
                {
                    "language": "en",
                    "rate": 1.0
                }
            ]
        }
    ]
};
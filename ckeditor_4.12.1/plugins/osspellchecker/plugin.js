CKEDITOR.plugins.add('osspellchecker', {
    icons: 'osspellchecker',
    init: function (editor) {
        var spellchecker = this;
        editor.on('contentDom', function (event) {
            if (documentElement === null) {
                initialize(spellchecker, event);
            }
        });
        editor.on('change', function (event) {
            clearTimeout(editingTimer);
            editingTimer = setTimeout(() => {
                spellCheck();
            }, waitTime);
        });
        //CKEDITOR.dialog.add( 'osspellchecker', CKEDITOR.getUrl( this.path + 'dialogs/osspellchecker.js' ) );
        //editor.addCommand( 'osspellchecker', new CKEDITOR.dialogCommand( 'osspellchecker' ) );    

        editor.addCommand( 'osspellchecker', { modes: { wysiwyg: 1, source: 1 },
            exec: function( editor ) {
                console.log("show settings");//TO DO
            },
            async: true
        } );
        editor.ui.addButton && editor.ui.addButton( 'osspellchecker', {
            label: 'osspellchecker',
            command: 'osspellchecker',
            toolbar: 'tools,10'
        } );
    },
    onLoad: function () {
        CKEDITOR.document.appendStyleSheet(this.path + 'skins/default.css');
    },
});
var serviceURL = "https://api.languagetoolplus.com/v2/check";
const waitTime = 5000;
var editingTimer = null;
var documentElement = null;
var document$ = null;
var editor = null;
var documentBody = null;
var editorOverlayDiv = null;
var ignoredWords = [];
var problemIdCounter = 0;
var suggestionsIdCounter = 1;
var osSuggestionOverlay = null;
var osSuggestionOverlayList = null;
var osSuggestionOverlayMessage = null;
var osSuggestionOverlayIgnoreAll = null
var osSpanId = null;
var spellcheckerResponse = null;
var documetRange = document.createRange();
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
    while (editorOverlayDiv.firstChild) {
        editorOverlayDiv.removeChild(editorOverlayDiv.firstChild);
    }
    getChildElements(documentBody.children);
    editor.updateElement();
}
function proofReading(event) {
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
    var childSpanMessage = document.createElement("span");
    childSpanMessage.id = "os-contextmenu-message";
    childSpanMessage.setAttribute("class", "os-contextmenu-message");
    parentDiv.appendChild(childSpanMessage);
    var childUL = document.createElement("ul");
    childUL.id = "os-contextmenu";
    childUL.setAttribute("class", "os-contextmenu");
    parentDiv.appendChild(childUL);
    var childSpanSettings = document.createElement("span");
    childSpanSettings.id = "os-contextmenu-settings";
    childSpanSettings.setAttribute("class", "os-contextmenu-settings");
    var childIgnoreAll = document.createElement("p");
    childIgnoreAll.id = "os-contextmenu-ignore-all";
    childIgnoreAll.innerHTML = "Ignore all"
    childIgnoreAll.setAttribute("class", "os-contextmenu-ignore-all");
    childIgnoreAll.onclick = (e) => removeUnderline(e);
    childIgnoreAll.appendChild(childSpanSettings);
    parentDiv.appendChild(childIgnoreAll);
    element.appendChild(parentDiv);
    osSuggestionOverlay = parentDiv;
    osSuggestionOverlayMessage = parentDiv.firstChild;
    osSuggestionOverlayList = parentDiv.childNodes[1];
    osSuggestionOverlayIgnoreAll = parentDiv.lastChild;
}
function getChildElements(elements) {
    for (var i = 0; i < elements.length; i++) {
        var elem = elements[i];
        sendData(elem);
        //getChildElements(elem);
    }
}
function getPosition(element) {
    var pos = element.getBoundingClientRect();
    return {
        top: pos.top + window.scrollY,
        left: pos.left + window.scrollX
    };
}
function sendData(element) {
    var content = sanitizeContent(element.innerHTML);
    if(content !== "<br>"){
        problemIdCounter++;
        sendRequest(content, "en-US", element, problemIdCounter);//API Call 
    }
}
function underlineWords(element, response, id) {
    var pos = element.getBoundingClientRect();
    var w = pos.width;
    var suggestions = response.matches;
    for (var i = 0; i < suggestions.length; i++) {
        var word = suggestions[i];
        var replacements = word.replacements;
        var suggestionArray = [];
        for (var j = 0; j < replacements.length; j++) {
            suggestionArray.push(replacements[j].value)
        }
        var childSpan = document.createElement("span");
        childSpan.id = "os-span-" + id + "-" + suggestionsIdCounter;
        childSpan.style.position = "absolute";
        var wordPosition = getWordPosition(element, word.offset, word.length);
        var currentWord = getWord(element, word.offset, word.length);
        childSpan.style.top = wordPosition.top + 13 + "px";
        childSpan.style.left = wordPosition.left + 3 + "px"; //position of the word
        childSpan.style.width = wordPosition.width + 2 + "px";//width of the word
        childSpan.style.zIndex = "1";
        childSpan.onmouseover = (e) => showSuggestions(e);
        childSpan.setAttribute("class", "spellcheck-highlight os-span-" + word.rule.category.id);
        childSpan.setAttribute("os-message", word.message);
        childSpan.setAttribute("os-sugestions", suggestionArray);
        childSpan.setAttribute("os-id", id);
        childSpan.setAttribute("os-word", currentWord);
        childSpan.setAttribute("os-sugestion-id", suggestionsIdCounter);
        childSpan.setAttribute("os-start", word.offset);
        childSpan.setAttribute("os-length", word.length);
        childSpan.setAttribute("os-x", pos.x);
        childSpan.setAttribute("os-y", pos.y);
        editorOverlayDiv.appendChild(childSpan);
        suggestionsIdCounter++;
    }
}
function getWordPosition(element, startOffset, wordLength) {
    var node = element.firstChild;
    if(startOffset != 0){
        startOffset = startOffset - 1;
    }
    documetRange.setStart(node, startOffset);
    documetRange.setEnd(node, startOffset + wordLength);
    return documetRange.getBoundingClientRect();
}
function getWord(element, startOffset, wordLength) {
    var node = element.firstChild;
    var text = node.data;
    return text.substring(startOffset, startOffset + wordLength);
}
function showSuggestions(e) {
    var elem = e.currentTarget;
    osSpanId = elem.id;
    var message = elem.getAttribute("os-message");
    var actualWordId = elem.getAttribute("os-sugestion-id");
    var suggestions = elem.getAttribute("os-sugestions");
    var lineId = elem.getAttribute("os-id");
    var startOffset = elem.getAttribute("os-start");
    var wordLength = elem.getAttribute("os-length");
    var coordinateX = elem.getAttribute("os-x");
    var coordinateY = elem.getAttribute("os-y");
    var arr = suggestions.split(",");
    //osSuggestionOverlayMessage.innerHTML = message;
    osSuggestionOverlayList.innerHTML = "";
    osSuggestionOverlayIgnoreAll.setAttribute("os-word", elem.getAttribute("os-word"));
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
function removeUnderline(e){
    var elem = e.currentTarget;
    var wd = elem.getAttribute("os-word");
    ignoredWords.push(elem.getAttribute(wd));
    var underLines = editorOverlayDiv.childNodes;
    for(var i = 0; i < underLines.length; i++){
        var child = underLines[i];
        var word = child.getAttribute("os-word");
        if(word == wd){
            editorOverlayDiv.removeChild(child);
        }
    }
    hideSuggestions();
}
function updateWord(event, actualWordId, lineId, startOffset, wordLength, x, y) {
    var newWord = event.currentTarget.innerText;
    var elem = getElementToUpdateContent(x, y);
    var target = sanitizeContent(elem.innerHTML);
    target = target.replace(target.substring(startOffset, startOffset + wordLength), newWord);
    elem.innerHTML = target;
    hideSuggestions();
    spellCheck();
    //deleteWordUnderline();
    //updateResponse(actualWordId, wordLength, newWord.length);
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
function sanitizeContent(content) {
    return content.replace(/&nbsp;/g, ' ');
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
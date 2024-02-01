# os-spellchecker

https://ckeditor.com/ckeditor-4/download/
https://ckeditor.com/docs/ckeditor4/latest/api/CKEDITOR_editor.html#event-loaded

https://demos.webspellchecker.com/wproofreader-ckeditor4.html
https://webspellchecker.com/checkout/  (product)

1. [ckeditor](ckeditor)
2. [wproofreader](wproofreader)
3. [wproofreader-clean](wproofreader-clean)
4. [os-spellchecker](os-spellchecker)


# wproofreader-clean\wscbundle\wscbundle.js

handler --> Line 9849 : Mouse and keyboard events

handleRemoteAction() --> Line 9913 : API Calls

createElement() --> Line 23947 : Problem underline span creation

createRange() --> Line 13489 : Creating range for Coordinates

findProblemsForMarkup() --> Line 13419 : Find the problems to underline

markupProblems() --> Line 13850 : Adds the words position to Underline

this.virtualProblemManager is the object to which problems are added which underlines the words

addProblem() --> Line 23551 : Problem range startOffset and endOffset

addProblemToStorage() --> Line 23582 : Problem position settings

buildProblemItems() --> Line 19691 : Build Contextmenu suggestions box

() --> Line 19865 : Mouserover Context Menu



###
if you want to mock use:
var isMocked = true

createWebApiParameters 9922

actionMethod:"getInfo"

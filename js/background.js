var newbookmark;
var token1;
var drivelist;
var folderID;
var automaticUpload = false;
var automaticDeletion = false;
var bkmkurl;
var bkmkid;
var filebkmk;
/*
 *  Authentication Blocks Start
*/

function createBasicNotification(options) {
    var notificationOptions = {
        'type': 'basic',
        'iconUrl': options.iconUrl, // Relative to Chrome dir or remote URL must be whitelisted in manifest.
        'title': options.title,
        'message': options.message,
        'isClickable': true,
    };
    chrome.notifications.create(options.id, notificationOptions, function(notificationId) {});
}

function showAuthNotification() {
    var options = {
        'id': 'start-auth',
        'iconUrl': 'icon.png',
        'title': 'Better Bookmarking Login',
        'message': 'Click here to authorize access to Google Drive',
    };
    createBasicNotification(options);
}

function notificationClicked(notificationId){
    // User clicked on notification to start auth flow.
    if (notificationId === 'start-auth') {
        getAuthTokenInteractive();
    }
    clearNotification(notificationId);
}

function clearNotification(notificationId) {
    chrome.notifications.clear(notificationId, function(wasCleared) {});
}

function getAuthToken(options) {
    chrome.identity.getAuthToken({ 'interactive': options.interactive }, options.callback);
}

function getAuthTokenSilent() {
    getAuthToken({
        'interactive': false,
        'callback': getAuthTokenSilentCallback,
    });
}

function getAuthTokenInteractive() {
    getAuthToken({
        'interactive': true,
        'callback': getAuthTokenInteractiveCallback,
    });
}

function getAuthTokenSilentCallback(token) {
    // Catch chrome error if user is not authorized.
    if (chrome.runtime.lastError) {
        showAuthNotification();
    } else {
        //console.log(token);
        sendRequest(token);
    }
}

function getAuthTokenInteractiveCallback(token) {
    // Catch chrome error if user is a god damn idiot.
    if (chrome.runtime.lastError) {
        showAuthNotification();
    } else {
        //console.log(token);
        sendRequest(token);
    }
}

/*
 *  Authentication Blocks End
*/

/*
 *  Creates a bookmark asking user if they want to save bookmark to drive
*/

function notifyBookmark(id, bookmark) {

    newbookmark = bookmark;
    if (bookmark.url == null || bookmark.url=="") {
        return;
    }
    if (automaticUpload == false) {
    chrome.notifications.create(
        "newbookmarkmade",
    {
        type: 'basic',
        iconUrl: 'icon.png',
        title: "New Bookmark!",
        message: "You made a new bookmark! Would like to save the webpage to your Google Drive?",
        buttons: [{
            title: "Yes!"
        }, {
            title: "No!"
        }],
        isClickable: true,
        requireInteraction: true
    });
    } else {
        downloadTab();     
    }
}
    
/*
 *  Check to see if user clicked Yes or No in notifications
*/

function onYorNClicked(notificationId, buttonIndex) {
    if(notificationId==="newbookmarkmade") {
        if (buttonIndex==1) {
            chrome.notifications.clear(notificationId);
        }
        if (buttonIndex==0) {    
            downloadTab();     
                      
            chrome.notifications.clear(notificationId);
        }   
    }
    if(notificationId==="opensaved") {
        if (buttonIndex==1) {
            chrome.notifications.clear(notificationId);
        }
        if (buttonIndex==0) {  
            sendRequest(token1);  
            downloadOldBookmark();      
            chrome.notifications.clear(notificationId);
        }   
    }
    if(notificationId==="downoldbkmrk") {
        if (buttonIndex==1) {
            chrome.notifications.clear(notificationId);
        }
        if (buttonIndex==0) {    
            sendRequest(token1);  
            downloadOldTab();           
            chrome.notifications.clear(notificationId);
        }   
    }
    if(notificationId==="deletebookmark") {
        if (buttonIndex==1) {
            chrome.notifications.clear(notificationId);
        }
        if (buttonIndex==0) {  
            sendRequest(token1);  
            findIDOfBookmark();
            chrome.notifications.clear(notificationId);
        }   
    }
}   
  
/*
 *  Send HTTP request to get list of all drive files after check for existence of folder by calling checkForFolder
*/  

function sendRequest(token) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET',
    'https://www.googleapis.com/drive/v2/files');
    xhr.setRequestHeader('Authorization',
    'Bearer ' + token);
    xhr.onreadystatechange = function () {
    if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200 ) {
        //console.log(xhr.responseText);
        token1=token;
        drivelist=JSON.parse(xhr.responseText);
        checkForFolder()
    }
    };
    xhr.send();
}

/*
 *  Companion method to OnLoad
*/

function downloadTab() {
    OnLoad(newbookmark.url);
}

/*
 *  Checks new created tabs to see if the tab is made by a bookmark call
*/

function checkTabforBookmark(tabId,changeInfo,tab) {
    
    if(changeInfo.url!=null) {
        //console.log(changeInfo);
        chrome.bookmarks.getTree(function(tree){
            for(i=0;i<tree[0].children[0].children.length;i++) {
                if(tree[0].children[0].children[i].url===changeInfo.url) {
                    sendRequest(token1);
                    retrieveBookmark(changeInfo.url,tree[0].children[0].children[i].id);
                }
            }
        });
    }   
}

/*
 *  Creates notification to ask if you want to open the saved version of the bookmark
*/

function retrieveBookmark(url,bookmarkId) {
    //console.log("Bookmark found at ID: "+bookmarkId+" with url: "+url);
    bkmkurl=url;
    bkmkid=bookmarkId;
    chrome.notifications.create("opensaved",
        {        
            type: 'basic',
            iconUrl: 'icon.png',
            title: "You opened a bookmark!",
            message: "Would you like to open the saved version of this bookmark?",
            buttons: [{
            title: "Yes!"
        }, {
            title: "No!"
        }],
        isClickable: true,
        requireInteraction: true

        }
    );
}

/*
 *  Waits until download is finished, then creates a tab with the newly downloaded webpage from Drive
*/

function downloadRetBookmark(delta){
    var proc=delta.state
    if(proc.current!=null && proc.current==="complete" && proc.mime==="text/html") {

        chrome.downloads.search({id: delta.id}, function(downloadArray) {
            console.log(downloadArray[0]);
            chrome.tabs.create({url: downloadArray[0].filename});
        }) 
    } 
}

/*
 *  Downloads saved webpage from Google Drive
*/

function downloadOldBookmark(){
    var found = false;
    for (i=0;i<drivelist.items.length;i++) {
        if(drivelist.items[i].title===(bkmkid+".html")) {

            chrome.tabs.create({url: drivelist.items[i].webContentLink});
            found=true;
            break;
        }
        console.log(drivelist.items[i].title);
    }
    if(found==true) {
        console.log("THE POTATO WAS FOUND");
    } else {
        console.log("CRAP IT WASNT FOUND");
        askForDownload();
    }    
}

/*
 *  Upload HTML file to google drive folder
*/

function uploadFile(htmltext, url) {
    //console.log(typeof htmltext);
    //console.log(htmltext.indexOf("<head"));
    var position = htmltext.indexOf(">",htmltext.indexOf("<head")) +1;
    //console.log(htmltext.substring(htmltext.indexOf("<head")));
    var base = "\n<base href\"" + url + "\" target=\"_blank\">";
    console.log(base);
    htmltext = [htmltext.slice(0, position), base, htmltext.slice(position)].join('');
    console.log(htmltext)
    var xhr = new XMLHttpRequest;
    xhr.open("POST", "https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart");
    xhr.setRequestHeader('Content-Type',
    'multipart/related; boundary=po_ta_to');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token1);
    var boundary = "--po_ta_to";
    var nxln = "\r\n";
    var nam = newbookmark.id + ".html";
    var metadata = {
            'title': nam,
            "parents": [{
                            "kind": "drive#fileLink",
                            "id": folderID
                        }]
        }
    var body = boundary + nxln + "Content-Type: application/json; charset=UTF-8" + nxln +nxln + JSON.stringify(metadata) +nxln + boundary +nxln + "Content-Type: text/html" + nxln +nxln + htmltext + nxln + boundary +"--";
    console.log(metadata);
    xhr.onreadystatechange = function () {
    if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200 )
        sendRequest(token1);
    };
    xhr.send(body);
}

/*
 *  Loads newly bookmarked HTML code
*/

function OnLoad(theURL){
    if (window.XMLHttpRequest) {
        xmlhttp=new XMLHttpRequest();
    } else {
        xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
    
    }
    xmlhttp.onreadystatechange=function(){
        if (xmlhttp.readyState==4 && xmlhttp.status==200){
            uploadFile(xmlhttp.responseText, theURL);
        }
    }
    xmlhttp.open("GET", theURL);
    xmlhttp.send();
}

/*
 *  Asks to save an unsaved bookmark to Google Drive
*/

function askForDownload() {

    chrome.notifications.create(
        "downoldbkmrk",
    {
        type: 'basic',
        iconUrl: 'icon.png',
        title: "Oops!",
        message: "We didn't find this bookmark saved in your Google Drive. Would you like to save it now for later use?",
        buttons: [{
            title: "Yes!"
        }, {
            title: "No!"
        }],
        isClickable: true,
        requireInteraction: true
    });
    
}

/*
 *  Companion method to OnLoadOld function
*/

function downloadOldTab() {
    OnLoadOld(bkmkurl);
}

/*
 *  Loads HTML code of a previously made bookmark
*/

function OnLoadOld(theURL){
    if (window.XMLHttpRequest) {
        xmlhttp=new XMLHttpRequest();
    } else {
        xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
    
    }
    xmlhttp.onreadystatechange=function(){
        if (xmlhttp.readyState==4 && xmlhttp.status==200){
            uploadOldFile(xmlhttp.responseText);
        }
    }
    xmlhttp.open("GET", theURL);
    xmlhttp.send();
}

/*
 *  Upload file when not found in Drive but bookmarked
*/

function uploadOldFile(htmltext) {
    var xhr = new XMLHttpRequest;
    xhr.open("POST", "https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart");
    xhr.setRequestHeader('Content-Type',
    'multipart/related; boundary=po_ta_to');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token1);
    var boundary = "--po_ta_to";
    var nxln = "\r\n";
    var nam = bkmkid + ".html";
    var metadata = {
            'title': nam,
            "parents": [{
                            "kind": "drive#fileLink",
                            "id": folderID
                        }]
        }
    var body = boundary + nxln + "Content-Type: application/json; charset=UTF-8" + nxln +nxln + JSON.stringify(metadata) +nxln + boundary +nxln + "Content-Type: text/html" + nxln +nxln + htmltext + nxln + boundary +"--";
    console.log(metadata);
    xhr.onreadystatechange = function () {
    if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200 ){
        //console.log(xhr.responseText);
    }
    };
    xhr.send(body);
}

/*
 *  Deletes file in Google Drive based on the given File ID
*/

function deleteFile(fileId) {
    var xhr = new XMLHttpRequest;
    xhr.open("DELETE", "https://www.googleapis.com/drive/v2/files/"+fileId);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token1);
    xhr.onreadystatechange = function () {
    if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200 ){
        console.log(xhr.responseText);
    }
    };
    xhr.send();
}

function removeBookmarkNotification(id, bookmark) {
    filebkmk = bookmark.node;
    console.log(bookmark);
    console.log(filebkmk);
    if (automaticDeletion == false) {
    chrome.notifications.create(
        "deletebookmark",
    {
        type: 'basic',
        iconUrl: 'icon.png',
        title: "You seem to have deleted a bookmark!",
        message: "You deleted a bookmark. Would you like to also remove the saved version from ",
        buttons: [{
            title: "Yes!"
        }, {
            title: "No!"
        }],
        isClickable: true,
        requireInteraction: true
    });
    } else {
        sendRequest(token1);  
        findIDOfBookmark();
    }
}

/*
 *  Finds ID of bookmark based on last removed Bookmark
*/

function findIDOfBookmark(){
    for (i=0;i<drivelist.items.length;i++) {
        if(drivelist.items[i].title===(filebkmk.id+".html")) {
            console.log(drivelist.items[i]);
            deleteFile(drivelist.items[i].id);
            break;
        } 
    }
}

/*
 *  Check for folder in Drive if not found call the createFolder method
*/

function checkForFolder() {
    var found = false;
    for (i=0;i<drivelist.items.length;i++) {
        if(drivelist.items[i].title===("Better Bookmarking") && drivelist.items[i].mimeType===("application/vnd.google-apps.folder")) {
            //console.log(drivelist.items[i]);
            folderID=drivelist.items[i].id;
            found=true;
            //console.log("Folder ID: " + folderID);
            break;
        } 
    }
    if (found==false) {
        createFolder()
    }
}

/*
 *  Create folder if file wasn't found in drive
*/

function createFolder(){
    var xhr = new XMLHttpRequest;
    xhr.open("POST", "https://www.googleapis.com/drive/v3/files");
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token1);
    var metadata = {
            'name': "Better Bookmarking",
            'mimeType': 'application/vnd.google-apps.folder'
        }
    xhr.onreadystatechange = function () {
    if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200 ) {
        //console.log(xhr.responseText);
        var jse = JSON.parse(xhr.responseText);
        //console.log("Folder Created with id: " + jse.id);
        folderID= jse.id;
    }
    };
    xhr.send(JSON.stringify(metadata));
}

/*
 *  Update Settings when changed
*/

function updateSetting(changes, areaName) {
    console.log(changes);
    if (changes.savepage!=null) {
        automaticUpload = changes.savepage.newValue;
    }
    if (changes.deletepage!=null){
        automaticDeletion = changes.deletepage.newValue;
    }
}

/*
 *  Action Listeners
*/

chrome.notifications.onClicked.addListener(notificationClicked);
chrome.bookmarks.onCreated.addListener(notifyBookmark); 
chrome.notifications.onButtonClicked.addListener(onYorNClicked);
chrome.tabs.onUpdated.addListener(checkTabforBookmark);
chrome.downloads.onChanged.addListener(downloadRetBookmark);
chrome.bookmarks.onRemoved.addListener(removeBookmarkNotification);
chrome.storage.onChanged.addListener(updateSetting);

/*
 *  Sync automatic download and deletion settings
*/
chrome.storage.sync.get({
    savepage: false,
    deletepage: false
  }, function(items) {
    automaticUpload = items.savepage;
    automaticDeletion = items.deletepage;
  });

getAuthTokenSilent();
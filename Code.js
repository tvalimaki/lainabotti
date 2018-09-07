// The following variables need to be defined
// var token = ""; // authorisation token for the bot
// var telegramUrl = "https://api.telegram.org/bot" + token;
// var webAppUrl = ""; // url of the deployed webApp
// var ssId = ""; // SpreadSheet id

// Bots help text
var helpText = "/lainaa jotain, /palauta jotain tai tarkista mitä on tällä hetkellä /lainassa.";

/**
 * Test the bots auth token
 */
function getMe() {
  var url = telegramUrl + "/getMe";
  var response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

/**
 * Set url to receive incoming Telegram updates to the webAppUrl of the published Google script
 */
function setWebhook() {
  var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

/**
 * Executed upon navigating to the webAppUrl with a browser
 */
function doGet(e) {
  return HtmlService.createHtmlOutput("Hi there. There's nothing to see here. Move along.");
}

/**
 * Executed when we get new Telegram updates
 */
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  
  if ( data.hasOwnProperty('message') ) {
    var msg = data.message;
    var id = msg.chat.id;
    var name = msg.from.first_name;
    if (msg.from.last_name == undefined) {
      var wholeName = msg.from.first_name;
    } else {
      var wholeName = msg.from.first_name + " " + msg.from.last_name;
    }
    
    if ( msg.hasOwnProperty('entities') && msg.entities[0].type == 'bot_command' ) {
      var text = msg.text.replace(/^(\/[a-zA-Z]+)@Tekiila_lainabot/, '$1');
      
      if ( /^\/start/.test(text) || /^\/help/.test(text) ) {
        sendText(id, helpText);
      }
      else if ( /\/lainaa/.test(text) ) {
        var items = text.slice(8); // removes '/lainaa '
        if (items.length > 0) {
          var answer = "OK " + name + ", merkkasin '" + items + "' sulle lainaan!";
          SpreadsheetApp.openById(ssId).getSheets()[0].appendRow(['', '', '', items, wholeName, '', '', new Date()]);
        } else {
          var answer = "Niin mitä halusit " + name + " lainata? " +
            "Kirjoita tavara samalle riville komennon kanssa niin osaan merkata sen lainatuksi.";
        }
        sendText(id, answer);
      }
      else if ( /^\/palauta/.test(text) ) {
        var items = text.slice(9); // removes '/palauta '
        if (items.length > 0) {
          var sheet = SpreadsheetApp.openById(ssId).getSheets()[0];
          var row = 3;
          var column = 4;
          var rangeValues = sheet.getRange(row, column, sheet.getLastRow(), sheet.getLastColumn()).getValues();
          var searchResult = rangeValues.findItemIndex(items, wholeName); //Row Index - 3
          
          if(searchResult != -1)
          {
            //searchResult + 3 is row index.
            sheet.getRange(searchResult + 3, 9).setValue(new Date());
            var answer = "OK " + name + ", palautin '" + items + "'.";
          }
          else {
            var answer = "Sori " + name + ", en löytänyt että '" + items + "' ois sulla lainassa. " +
              "Tarkista mitä oot lainannu käyttämällä /lainassa.";
          }
        } else {
          var answer = "Niin mitä halusit " + name + " palauttaa? " +
            "Kirjoita tavara samalle riville komennon kanssa niin merkkaan sen palautetuksi. " +
              "Jos et oo varma mitä lainasit, katso mitä on /lainassa.";
        }
        sendText(id, answer);
      }
      else if ( /^\/lainassa/.test(text) ) {
        var sheet = SpreadsheetApp.openById(ssId).getSheets()[0];
        var row = 3;
        var column = 11;
        var items = sheet.getRange(row, column, sheet.getLastRow()).getValues().clean('');
        var borrower = sheet.getRange(row, column+1, sheet.getLastRow()).getValues().clean('');
        var answer = "<b>Tällä hetkellä on lainassa:</b>\n";
        for (var i = 0; i < items.length; i++) {
          answer += borrower[i] + ": " + items[i] + "\n";
        }
        sendText(id, answer);
      }
    }
  }
}

/**
 * Send a message to the specified chat
 */
function sendText(id,text) {
  var url = telegramUrl + "/";
  var payload = {
      'method': 'sendMessage',
      'chat_id': String(id),
      'text': text,
      'parse_mode': 'HTML'
    }
    var data = {
      "method": "post",
      "payload": payload
    }
  var response = UrlFetchApp.fetch(url, data);
  Logger.log(response.getContentText());
}

/**
 * Find the Array row index that contains the search item, given it's loaned by name, and not returned
 */
Array.prototype.findItemIndex = function(search,name){
  if(search == "") return false;
  for (var i=this.length-1; i>0; i--) {
    // the item we're looking for [0] is not already returned [5] and loaned by the current user [1]
    if (this[i][0] == search && this[i][5] == '' && this[i][1] == name) return i;
  }
  return -1;
}

/**
 * Remove specific values from the Array
 */
Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

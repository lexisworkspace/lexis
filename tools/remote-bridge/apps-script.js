function doPost(e) {
  var config = {
    daemonUrl: "https://background-atlantic-experiences-insulin.trycloudflare.com",
    secretKey: "orleia-gemini-bridge-secret-key-2026",
    ownerEmail: "maciej.s.znojek@gmail.com"
  };

  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = { prompt: e.postData.contents };
      }
    }

    var promptText = data.prompt || data.text || data.message || "Run build verification";
    var action = data.action || "run";

    var payload = {
      secret: config.secretKey,
      owner: config.ownerEmail,
      action: action,
      prompt: promptText,
      timestamp: new Date().toISOString()
    };

    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(config.daemonUrl, options);
    var responseText = response.getContentText();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      owner: config.ownerEmail,
      response: responseText
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    service: "Antigravity Google Bridge",
    owner: "maciej.s.znojek@gmail.com"
  })).setMimeType(ContentService.MimeType.JSON);
}

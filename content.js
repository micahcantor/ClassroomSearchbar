listenAndLoad();

function listenAndLoad() {
  window.addEventListener("load", function() {
      var form = document.getElementsByTagName("form")[0];
      var main = document.getElementById("ow43");
      main.insertBefore(form, main.children[1]);
  
      form.addEventListener('submit', event => {
          event.preventDefault();
          // search code here
          console.log('submit');
        });
      /*
      const inputField = document.querySelector('input[type="text"]');

      inputField.addEventListener('input', event => {
          console.log(`The value entered is ${inputField.value}`);
      });
      
      inputField.addEventListener('cut', event => {
          console.log('cut');
      });
      
      inputField.addEventListener('copy', event => {
          console.log('copy');
      });
      
      inputField.addEventListener('paste', event => {
          console.log('paste');
      }); */
  });
}



/* {
    "name": "Google Classroom Searchbar",
    "version": "1.0",
    "description": "A search bar for the google classroom assignments stream",
    "manifest_version": 2,
    "permissions": [
        "activeTab",
        "contextMenus",
        "tabs",
        "identity"
    ],
    "content_security_policy": "script-src 'self' https://apis.google.com/; object-src 'self'",
    "content_scripts": [
        {
          "run_at": "document_end",
          "matches": ["https://classroom.google.com/u/*/c/*"],
          "js": ["start.js"]
        }
    ],
    "background": {
      "page": "background.html",
      "persistent": false
    },
    "oauth2": {
      "client_id": "809411372636-isaj4trbcg56tnmdevf3qhv1vk57kttb.apps.googleusercontent.com",
      "scopes":["https://www.googleapis.com/auth/classroom.student-submissions.me.readonly"]
    },
    "web_accessible_resources": [
      "content.js",
      "search.html",
      "searchStyle.css"
    ]
  } */
///NOTE: put ttps://icons8.com in the about section of the extension
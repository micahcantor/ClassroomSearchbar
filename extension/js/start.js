chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (onCorrectPage()) {
    addFormStyle();
    insertFormHTML().then(function (form) {
      listenForSearch(form);
    });
  } else {
    const searchStyle = document.getElementById("searchStyle");
    if (searchStyle != null) searchStyle.remove();
  }
});

function listenForSearch(searchForm) {
  var inputField = searchForm.children[0];
  var button = searchForm.children[1];
  var valueOnSearch = null;

  button.addEventListener("click", async function (event) {
    // when search button is pressed
    event.preventDefault();
    const currentClassDiv = getCurrentClassDiv();
    currentClassDiv
      .querySelectorAll("div[id=searchResultContainer")
      .forEach((container) => container.remove());

    if (button.children[0].textContent == "Search" && inputField.value == "") {
      // does not search when input field is empty
      button.children[0].textContent = "Reset";
    } else if (
      button.children[0].textContent == "Reset" ||
      (button.children[0].textContent == "Error" &&
        valueOnSearch == inputField.value)
    ) {
      button.children[0].textContent = "Search";
      inputField.value = "";
    } else {
      button.children[0].textContent = "Loading";
      valueOnSearch = inputField.value;

      const courseID = await getCourseID().catch((error) => {
        console.error(error);
        button.children[0].textContent = "Error";
      });
      const assignments = await getCourseAssignments(courseID).catch(
        (error) => {
          console.error(error);
          button.children[0].textContent = "Error";
        }
      );
      const combinedWork = await getCourseAnnouncements(
        assignments,
        courseID
      ).catch((error) => {
        console.error(error);
        button.children[0].textContent = "Error";
      });

      const searchResults = searchCourseWork(combinedWork, valueOnSearch);
      await displayResults(searchResults).catch((error) => {
        console.error(error);
        button.children[0].textContent = "Error";
      });

      if (button.children[0].textContent !== "Error")
        button.children[0].textContent = "Reset";
    }
  });
}

async function displayResults(matches) {
  try {
    var resultContainer = document.createElement("div");
    resultContainer.setAttribute("id", "searchResultContainer");
    const assignments = await displayAssignments(matches);
    const announcements = await displayAnnouncements(matches);
    insertIntoContainer(assignments, announcements, resultContainer);

    const currentClassDiv = getCurrentClassDiv();
    const target = currentClassDiv.querySelector("div[jscontroller=ZMiF]");
    target.insertBefore(resultContainer, target.children[2]);
  } catch (error) {
    Promise.reject(error);
  }
}

function insertIntoContainer(assignments, announcements, container) {
  const combined = {
    work: assignments.htmls.concat(announcements.htmls),
    indeces: assignments.indeces.concat(announcements.indeces),
  };

  for (i = 0; i < combined.work.length; i++) {
    const position = combined.indeces.indexOf(i);
    const value = combined.work[position];
    container.appendChild(value);
  }
  return container;
}

async function displayAssignments(matches) {
  let response = await fetch(
    chrome.runtime.getURL("resources/assignment.html")
  );
  let text = await response.text();

  var parser = new DOMParser();

  const match = getURLMatch();
  var userID = 0;
  if (match.userID != null) userID = match.userID;

  var assignmentsObject = { htmls: [], indeces: [] };
  var idx = 0;
  for (const match of matches) {
    if (match.item.type == "assignment") {
      var doc = parser.parseFromString(text, "text/html");
      editDOMIDs(doc.getElementById("as_DIV_1"));
      const teacher = getTeacherName();

      doc
        .getElementById("as_DIV_1")
        .setAttribute("data-stream-item-id", match.item.id);
      doc.getElementById("as_SPAN_12").textContent =
        "Assignment: " + match.item.title;
      doc.getElementById("as_SPAN_14").textContent =
        teacher + "posted a new assignment: " + match.item.title;
      doc.getElementById("as_SPAN_17").textContent =
        match.item.updated || match.item.created;
      doc
        .getElementById("as_DIV_20")
        .setAttribute("data-focus-id", "IlqLNc-" + match.item.id);
      doc
        .getElementById("as_DIV_27")
        .setAttribute("data-stream-item-id", match.item.id);
      doc
        .getElementById("as_DIV_34")
        .setAttribute("data-stream-item-id", match.item.id);
      doc
        .getElementById("as_A_35")
        .setAttribute("data-focus-id", "LPEWg|" + match.item.id);

      doc.getElementById("as_DIV_1").addEventListener("click", () => {
        const url =
          match.item.link.substring(0, 28) +
          "/u/" +
          userID +
          match.item.link.substring(28);
        chrome.runtime.sendMessage({ url: url, message: "assignment click" });
      });

      assignmentsObject.htmls.push(doc.getElementById("as_DIV_1"));
      assignmentsObject.indeces.push(idx);
    }
    idx++;
  }

  addResourceStyle("assignment");
  return assignmentsObject;
}

async function displayAnnouncements(matches) {
  let response = await fetch(
    chrome.runtime.getURL("resources/announcement.html")
  );
  let text = await response.text();

  var parser = new DOMParser();
  var announcementsObject = { htmls: [], indeces: [] };
  var idx = 0;
  for (const match of matches) {
    if (match.item.type == "announcement") {
      var doc = parser.parseFromString(text, "text/html");
      const teacher = getTeacherName();

      doc
        .getElementById("DIV_1")
        .setAttribute("data-stream-item-id", match.item.id);
      doc.getElementById("SPAN_8").textContent =
        "Announcement" + match.item.description.split(0, 38) + "...";
      doc.getElementById("SPAN_10").textContent = teacher;
      doc.getElementById("SPAN_12").textContent =
        "Created " + match.item.created;
      doc.getElementById("SPAN_13").textContent = match.item.created;
      doc.getElementById("DIV_31").textContent = match.item.description;
      doc
        .getElementById("DIV_32")
        .setAttribute("data-stream-item-id", match.item.id);

      if (match.item.updated != null)
        doc.getElementById("SPAN_13").textContent +=
          " (Edited " + match.item.updated + ")";

      if (match.item.materials != null) {
        var materialContainer = doc.getElementById("DIV_32");
        await displayAnnounceMaterials(match.item.materials, materialContainer);
      }

      announcementsObject.htmls.push(doc.getElementById("DIV_1"));
      announcementsObject.indeces.push(idx);
    }
    idx++;
  }
  addResourceStyle("announcement");
  return announcementsObject;
}

async function displayAnnounceMaterials(materials, container) {
  let response = await fetch(
    chrome.runtime.getURL("resources/materialTemplate.html")
  );
  let text = await response.text();
  var parser = new DOMParser();
  var doc = parser.parseFromString(text, "text/html");

  const match = getURLMatch();
  var userID = 0;
  if (match.userID != null) userID = match.userID;

  var materialsHTML = [];
  for (const material of materials) {
    if (material.link) {
      doc.getElementById("link_A_2").setAttribute("href", material.link.url);
      doc
        .getElementById("link_A_2")
        .setAttribute("data-focus-id", "eTkQDe-" + material.link.url);
      doc
        .getElementById("link_A_9")
        .setAttribute("data-focus-id", "hSRGPd-" + material.link.url);
      doc.getElementById("link_DIV_7").innerText = material.link.title;
      doc
        .getElementById("link_IMG_11")
        .setAttribute(
          "src",
          "https://classroom.google.com/u/" +
            userID +
            "/webthumbnail?url=" +
            material.link.url
        );
      doc.getElementById("link_DIV_13").innerText = material.link.title;
      doc.getElementById("link_DIV_15").innerText = material.link.url;
      materialsHTML.push(doc.getElementById("link_DIV_1"));
    }
    if (material.driveFile) {
      const driveURL =
        material.driveFile.alternateLink + "&amp;authuser=" + userID;
      doc.getElementById("file_A_2").setAttribute("href", driveURL);
      doc
        .getElementById("file_A_2")
        .setAttribute("aria-label", material.driveFile.title);
      doc.getElementById("file_DIV_7").textContent = material.driveFile.title;
      doc
        .getElementById("file_A_9")
        .setAttribute("title", material.driveFile.title);
      doc.getElementById("file_A_9").setAttribute("href", driveURL);
      doc
        .getElementById("file_IMG_11")
        .setAttribute(
          "src",
          material.driveFile.thumbnailURL +
            "&amp;authuser=" +
            userID +
            "&amp;sz=w105-h70-c"
        );
      doc.getElementById("file_DIV_20").textContent = material.driveFile.title;
      materialsHTML.push(doc.getElementById("file_DIV_1"));
    }
  }

  materialsHTML.forEach((material) => {
    container.appendChild(material);
  });

  addResourceStyle("material");
}

function addResourceStyle(type) {
  const resourceStyle = type + "Style";
  var styleLink = document.createElement("link");
  styleLink.setAttribute("rel", "stylesheet");
  styleLink.setAttribute("id", resourceStyle);
  styleLink.setAttribute(
    "href",
    chrome.runtime.getURL("resources/" + resourceStyle + ".css")
  );

  if (document.getElementById(resourceStyle) == null) {
    document.head.appendChild(styleLink);
  }
}

function searchCourseWork(courseWork, input) {
  const fuseOptions = {
    keys: ["title", "description"],
    includeScore: true,
    tokenize: false,
    findAllMatches: true,
    threshold: 0.6,
  };
  const fuse = new Fuse(courseWork, fuseOptions);
  const result = fuse.search(input);
  return result;
}

function getCourseAnnouncements(courseWorkValues, COURSE_ID) {
  return new Promise(function (resolve, reject) {
    const API_KEY = "AIzaSyARs46G8mYoI1nzgPJztAzdYOdYoiZXTac";
    const fields =
      "&fields=announcements(id,text,materials,creationTime,updateTime)";
    const URL =
      "https://classroom.googleapis.com/v1/courses/" +
      COURSE_ID +
      "/announcements?key=" +
      API_KEY +
      fields;
    const reqOptions = {
      url: URL,
      message: "auth",
      type: "announcements",
      values: courseWorkValues,
    };
    getClassroomData(reqOptions)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
}

function getCourseAssignments(COURSE_ID) {
  return new Promise(function (resolve, reject) {
    const API_KEY = "AIzaSyARs46G8mYoI1nzgPJztAzdYOdYoiZXTac";
    const fields =
      "&fields=courseWork(id,title,description,alternateLink,creationTime,updateTime)";
    const URL =
      "https://classroom.googleapis.com/v1/courses/" +
      COURSE_ID +
      "/courseWork?key=" +
      API_KEY +
      fields;
    const reqOptions = {
      url: URL,
      message: "auth",
      type: "assignments",
    };
    getClassroomData(reqOptions)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
}

function getCourseID() {
  return new Promise(function (resolve, reject) {
    const currentClassDiv = getCurrentClassDiv();
    const courseName = currentClassDiv.getElementsByClassName(
      "tNGpbb uTUgB YVvGBb"
    )[0].textContent; // Finds element with the name of the course
    const API_KEY = "AIzaSyARs46G8mYoI1nzgPJztAzdYOdYoiZXTac";
    const fields = "&fields=courses(id,name)";
    const URL =
      "https://classroom.googleapis.com/v1/courses?key=" +
      API_KEY +
      "&courseStates=ACTIVE" +
      fields;
    const reqOptions = {
      url: URL,
      type: "courseID",
      message: "auth",
      courseName: courseName,
    };
    getClassroomData(reqOptions)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
}

function getClassroomData(data) {
  return new Promise(function (resolve, reject) {
    chrome.runtime.sendMessage(data, function (response) {
      if (response.message && response.message === "error") {
        console.error(response.value);
        reject(response.type);
      }
      resolve(response);
    });
  });
}

function getTeacherName() {
  const currentClassDiv = getCurrentClassDiv();
  const firstAssignmentText = currentClassDiv
    .getElementsByClassName("YVvGBb asQXV")[0]
    .textContent.split(" ");
  const teacherName = [];
  if (firstAssignmentText != null) {
    for (const word of firstAssignmentText) {
      if (word == "posted") break;
      teacherName.push(word);
    }
    return teacherName.join(" ") + " ";
  }
}

function editDOMIDs(top_div) {
  if ((top_div.children.length == 0) & (top_div.nextSibling == null)) {
    return;
  } else if (top_div.children.length > 0) {
    for (const node of top_div.children) {
      node.setAttribute("id", "as_" + node.id);
      editDOMIDs(node);
    }
  }
}

function onCorrectPage() {
  const match = getURLMatch();
  if (match != null) return true;
  else return false;
}

function getURLMatch() {
  var pattern1 = new UrlPattern(
    "https\\://classroom.google.com/u/:userID/c/:classID"
  );
  var pattern2 = new UrlPattern("https\\://classroom.google.com/c/:classID");
  const match1 = pattern1.match(window.location.href);
  const match2 = pattern2.match(window.location.href);
  if (match1 != null) return match1;
  else if (match2 != null) return match2;
  else return null;
}

function getCurrentClassDiv() {
  const classDivContainer = document.getElementsByClassName("v7wOcf ZGnOx")[0];
  const classDivs = classDivContainer.getElementsByClassName("dbEQNc");
  for (const div of classDivs) {
    const classNameInDiv = div.getElementsByClassName("tNGpbb uTUgB YVvGBb")[0];
    const classNameInHeader = document.getElementById("UGb2Qe");
    if (classNameInDiv == null || classNameInHeader == null) {
      return classDivs[classDivs.length - 1];
    } else if (classNameInDiv.innerText == classNameInHeader.innerText) {
      return div;
    }
  }
}

function addFormStyle() {
  var styleLink = document.createElement("link");
  styleLink.setAttribute("rel", "stylesheet");
  styleLink.setAttribute("id", "searchStyle");
  styleLink.setAttribute(
    "href",
    chrome.runtime.getURL("resources/searchStyle.css")
  );

  if (document.getElementById("searchStyle") == null) {
    document.head.appendChild(styleLink);
  }
}

async function insertFormHTML() {
  const forms = document.getElementsByTagName("form");
  for (const form of forms) form.remove();

  const currentClassDiv = getCurrentClassDiv();
  const target = currentClassDiv.querySelector("div[jscontroller=ZMiF]");
  var form = null;
  if (target != null) form = target.querySelector("form[id=searchForm_1]");

  if (form == null) {
    form = await addFormHTML();
    var intervalID = setInterval(function () {
      if (target != null) {
        console.log("inserting form");
        target.insertBefore(form, target.children[1]);
        clearInterval(intervalID);
      }
    }, 250);
  }
  return form;
}

async function addFormHTML() {
  let response = await fetch(
    chrome.extension.getURL("resources/searchbar.html")
  );
  let text = await response.text();
  parser = new DOMParser();
  return parser
    .parseFromString(text, "text/html")
    .getElementById("searchForm_1");
}

///NOTE: put ttps://icons8.com in the about section of the extension

// Get the element with id="defaultOpen" and click on it

// document.getElementById("defaultOpen").click();
window.onload = function () {
    const tabDefaultOpen = document.getElementById("defaultOpen");
    if(tabDefaultOpen != null && tabDefaultOpen != undefined)
    {
        tabDefaultOpen.click();
    }
    else{
        console.log('Không tìm thấy')
    }
};
function openPage(pageName, elmnt, color) {
    // Hide all elements with class="tabcontent" by default */
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
  
    // Remove the background color of all tablinks/buttons
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].style.backgroundColor = "";
    }
  
    // Show the specific tab content
    document.getElementById(pageName).style.display = "block";
  
    // Add the specific color to the button used to open the tab content
    elmnt.style.backgroundColor = '#A02334';
  }  
  
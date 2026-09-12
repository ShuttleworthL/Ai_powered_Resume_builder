async function payment_redirect() {
    const response = await fetch("/subscribed");
    const data = await response.json()
    if (data.subscribed === false) {
        window.location.href = "/payment.html";
    }
}
async function page_loggedin() {
    console.log("i");
    const response = await fetch("/logged-in");
    const data = await response.json()
    if (data.loggedIn === false) {
        window.location.href = "/login.html";
        return;
    }
}
async function loggedin() { //defines asynchronous loggedin function
    const response = await fetch("/logged-in");
    const data = await response.json()
    const login = document.getElementById("Login");
    if (data.loggedIn === true) {
        login.className = "li_elements"
        login.innerHTML = 
        `<div id="dropdown">
            <img src="images/user.png" alt="user icon" id="user_icon" title="${data.username}">
            <div class="dropdown-contents" id="dropdown-menue">
                <p class="drop_down_el">${data.username}</p>
                <button class="drop_down_el" id="log_out">Log Out</button>
            </div>
        </div>`;
        document.getElementById("user_icon").addEventListener("click", ()=> {
            const dropdown_menue = document.getElementById("dropdown-menue");
            if(dropdown_menue.style.display == "block") {
                dropdown_menue.style.display = "none";
            }
            else {
                dropdown_menue.style.display = "block";
            };
        const logoutBtn = document.getElementById("log_out");
        logoutBtn.addEventListener("click", async () => {
            await fetch("/logout", { method: "POST" });
            location.reload();
        });
        });
    };
};
document.addEventListener("DOMContentLoaded", loggedin);
if (window.location.pathname.endsWith('generate.html')) {
    conatiner = document.querySelector(".conatiner"); //defines conatiner from html
    chat_history = [] //creates and empty array
    const dropzone = document.getElementById("image_drag_drop");
    dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
    });

    document.querySelector(".generate").addEventListener("click", ()=>generate()); //if generate key is clicked generate()
    document.addEventListener("keydown", (event)=> { //if a key is pressed
        if (event.key === "Enter") { //if key is enter key
            event.preventDefault(); //prevent defalt response
            generate(); //call generate() func
        }
        });
    const resume = document.createElement("li"); //create li element
    resume.className = "resume"; //append class resume
    const full_name = document.createElement("li");//create li element
    full_name.className = "full_name"; //append class full_name
    const email = document.createElement("li");//create li element
    email.className = "email"; //append class email
    const phone = document.createElement("li");//create li element
    phone.className = "phone" ;//append class phone
    const location = document.createElement("li");//create li element
    location.className = "location";//append class location
    document.body.appendChild(conatiner); //append container to the body
    function text_animation(resume, resume_text, speed) { //defines func text_animation and takes params resume(element to write to), resume_text(data from api), speed(write speed)
        let index = 0; //defines index variable and sets it to 0
        resume.textContent = ""; //clears loading... from resume textcontent
        
        const interval = setInterval(() => {
            if (index < resume_text.length) {
                resume.textContent += resume_text.charAt(index);
                index++;
            } else {
                clearInterval(interval);
            }
        }, speed);
    }
    const generate = async () => { //defining asynchronous function
        let name_input = document.getElementById("name_input").value;
        let email_input = document.getElementById("email_input").value;
        let phone_input = document.getElementById("phone_input").value;
        let location_input = document.getElementById("location_input").value;
        const input = document.getElementById("input_area").value.trim(); //input is equal to the value of the html input (a text area)
        if (input === "") { //checks if there is nothing inputted into skillset box
            window.alert("Please enter a skillset"); //send alert about no text in skillset box
            return; //returns to check if input === "" again before continuing on
        }
        if (name_input === "" || email_input === "" || phone_input === "" || location_input === "") {
            window.alert("please fill in all personal information fields");
            return;
        }
        resume.textContent = "Loading ..."; //setting resume text to loading
        conatiner.style.display = "block"; //displaying resume as a block as apose to none
        conatiner.appendChild(full_name);
        conatiner.appendChild(email);
        conatiner.appendChild(phone);
        conatiner.appendChild(location);
        full_name.style.display = "none";
        email.style.display = "none";
        phone.style.display = "none";
        location.style.display = "none";
        conatiner.appendChild(resume); //appending resume to the conatiner in turn appended to the body
        chat_history.push({
            role: "user",
            parts: [{text: "can you make a resume based on the following skillset"+input}] //adding the input to the chat history array with a promp and the role of user
        });
        try {
            const response = await fetch("http://localhost:3000/generate", { //sends post request to backend
                method: "POST", //defines sending data
                headers: { "Content-Type": "application/json" }, //defines a json data type
                body: JSON.stringify({ chat_history }) //conerts chat history array to json
            });
            const data = await response.json(); //data is equal to recieved data
            if(!response.ok) throw new Error(data.error.message); //if response is not ok eg 404 ect throw a new error
            full_name.textContent = name_input;
            email.textContent = email_input;
            phone.textContent = phone_input;
            location.textContent = location_input;
            full_name.style.display = "block";
            email.style.display = "block";
            phone.style.display = "block";
            location.style.display = "block";
            const resume_text = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim(); //extracting text from recieved package and setting it to resumes text content
            text_animation(resume, resume_text, 10)
        } 
        catch (error) { //if error
            console.error("Error:", error); //console error: then type of error
        }
    };
};
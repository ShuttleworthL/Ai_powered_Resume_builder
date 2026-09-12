const express = require("express"); //importing backend framework
const session = require("express-session"); //importing express-sessions
const mongoose = require("mongoose"); //importing mongoose to communicate with mongoDB
const bcrypt = require("bcrypt"); //importing bcrypt for password hashing
const fetch = require("node-fetch"); //importing fetch fot http req (APIs)
const cors = require("cors"); //importing cross-origin reasource sharing (abilaty to comunicate with frontend)
require("dotenv").config(); //loads enviroment variables from env file

const app = express(); //initialize express app
app.use(cors()); //allows requests from frontend
app.use(express.json()); //automaticly parse incomming json requests
console.log("SESSION_ID:", process.env.session_id);
app.use(session({ //defines session parameters
  secret: process.env.session_id, //signs session id cookies
  resave: false, //dont save the session on every request unless it was modified
  saveUninitialized: false, //dont create and store a session until something is added to it
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30 //defines age of cookie (30 days until deleted)
  }
}));
app.use(express.static('public')); //conects to frontend from public folder

const API_KEY = process.env.API_KEY; //retreives api key from env file
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`; //sets api url and intergrates api key
let is_subscribed = false //defines is subscribed as false

async function encrypt(password) { //defines asynchronous function encrypt while passing in the var password
  const hash = await bcrypt.hash(password, 13); //defines has as bcrypts hashed versiion of the pass variable (hashed over 2^13 times (prevents brute force))
  return hash; //returns the value of the hashed password
};
async function connectToDatabase() { //define asynchronous fuction to connect to database
  try { //try code first
    await mongoose.connect(process.env.mongodb_uri); //await connecting to database
    console.log("Connected to database"); //if succsefull console.log connected to database
  } 
  catch (error) { //if error console.log data base conection failed followed by the error
    console.error("database connection failed:", error);
  }
}
const accountsSchema = new mongoose.Schema({ //defines a new db schema
  username: {type: String, unique: true}, //adds file username and specifies storing a string aswell as the username being unique
  password: String, //adds file password and specifies storing a string
  subscribed: Boolean //adds file uername storing true or fasle values
});
const account = mongoose.model("accounts", accountsSchema); //creates the account collection with the name accounts and feilds of accounts schema
app.post("/generate", async (req, res) => { //listerning to post requests to generate
    const chat_history = req.body.chat_history; //retrieving chat history from the request body

    try {
        const response = await fetch(API_URL, { //sending a post request to gemmini api conatining the chat history
            method: "POST", //specifying sending data
            headers: { "Content-Type": "application/json" }, //specifies json data
            body: JSON.stringify({ contents: chat_history }) //stringifying contents (chat_history)
        });

        const data = await response.json(); //data = recived json data from gemmini
        res.json(data); //sending data to frontend
    } 
    catch (error) { //if error
        res.status(500).json({ error: error.message }); //sepond with 500 status and error message
    }
});
app.post("/create_account", async (req, res) => { //handles post requests from /create_account
  try {
    const {username, password} = req.body; //username = 1st param from body password = 2nd param

    if (!username || !password) { //if there is no username or no password
      return res.status(400).json({ error: "Missing username or password" }); //returns status 400 followed by a json package error: missing username or passsword
    }
    const hash = await encrypt(password) //hash = returned value from encrypt function + passes in password variable for encryption
    const newAccount = new account({ username: username, password: hash, subscribed: is_subscribed}); //craetes a new accounts document with the values of username for username and passoword for pasword
    await newAccount.save(); //waiting to save to the database
    req.session.user = { username }; //adds username to session
    res.status(200).json({ message: "Account created" }); //responds with account created and 200 code
  } 
  catch (error) { //if error
    if (error.code === 11000) { //if said error has an error code of 11000 (the unique rule of the username in accountsSchema not respected)
      return res.status(400).json({error: "username already taken"}); //responds with code 400 and username already taken
    }
    res.status(500).json({error: error}); //responds with status 500 if error (internal server error)
  }
});
app.post("/login", async (req, res) => { //handles post requests from /login
  try{
    const {username, password} = req.body; //retrieves inputed username and password from req to check
    
    if (!username || !password) { //if there is no username or no password
      return res.status(400).json({ error: "Missing username or password" }); //returns status 404 followed by a json package error: missing username or passsword
    }
    const user = await account.findOne({username: username}); //defines user as the accounts document with the username matching the inputed username

    if (!user) { //if no user (no matching username)
      return res.status(400).json({error: "cannot find user"}); //respond with a status of 400 and cannot find user
    }
    const pass_match = await bcrypt.compare(password, user.password); //once the user is found defines the bolean passmatch with the value with the outcome of compareing the inputed password and the password saved in the database
    if (pass_match == true) { //if the password matches the password saved in the database
      console.log("login successful"); //logs in console login succesfull
      req.session.user = { username }; //saves username in the session
      res.status(200).json({ message: "login successful" }); //responds with 200 code and login succsefull
    }
    else { //if the password does not match the password saved in the data base
      console.log("wrong username or password") //logs in console wrong username or password
      return res.status(401).json({ error: "wrong username or password" }); //returns with status 401 and wrong username or password
    }
  }
  catch { //if error
    res.status(500).json({error: "could not login"}); //responds with status 500 and could not login
  }
})
app.post("/subscribe", async (req, res) => {
  const { username } = req.session.user;

  await account.findOneAndUpdate(
    {username},
    {subscribed: true}
  );
  res.status(200).json({ message: "subscribed" });
  console.log("subscribed")
});
app.get("/logged-in", async (req, res) => {
  if(req.session.user) {
    res.status(200).json({loggedIn: true, username: req.session.user.username});
  }
  else {
    res.status(200).json({loggedIn: false});
  };
});
app.get("/subscribed", async (req, res) => {
  const user = await account.findOne({username: req.session.user.username});
  if (user?.subscribed === true) {
    res.status(200).json({subscribed: true});
  }
  else {
    res.status(200).json({subscribed: false});
  };
});
app.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ error: "logout failed" });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "logout successful" });
  });
});
connectToDatabase();
app.listen(3000, () => console.log("Backend running at http://localhost:3000")); //start server on port 3000 and log Backend running at http://localhost:3000
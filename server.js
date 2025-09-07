const express = require('express')
const cors = require('cors')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3') 
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const path = require('path')
const app = express()

const allowedOrigins = [
  "http://localhost:3000",                  // local dev
  "https://klickks-frontend.onrender.com"   // replace with your actual frontend Render URL
]

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}))

app.use(express.json())

const dbPath = path.join(__dirname, 'klickks.db')

let db = null;

const initiliseDbAndServer = async () => {
    try{
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });

        const PORT = process.env.PORT || 4000;

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    }catch(e){
        console.log(`DB Error: ${e.message}`);
        process.exit(1)
    }
}

initiliseDbAndServer()


app.post('/signup', async (req, res) => {
    const {username, password, confirmPassword} = req.body;
    if(!username || username.length < 5){
        return res.status(400).json({error: 'Enter username (min length: 5)'})
    }
    if(!password || password.length < 8){
        return res.status(400).json({error: 'Enter password (min length: 8)'})
    }
    if(confirmPassword !== password){
        return res.status(400).json({error: 'passwords mismatch'})
    }

    const existing = await db.get(
        `SELECT id FROM users WHERE username= ?`, 
        [username]
    )
    
    if(existing){
        return res.status(400).json({error: 'username is taken'})
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    const postQuery = `
        INSERT INTO users (username, password)
        VALUES ('${username}', '${hashedPassword}')
    `
    const dbResponse =await db.run(postQuery)
    const newUserId = dbResponse.lastID;
    res.status(201).json({message: `Registered Successfully with id:${newUserId}`})
    
})

app.post('/signin', async (req, res) => {
    const {username, password} = req.body
    const dbUser = await db.get(`SELECT * FROM users WHERE username= ?`,
    [username])

    if(!dbUser){
        res.status(200).json({error: "Invalid User"})
    }else{
        const isPasswordMatch = await bcrypt.compare(password, dbUser.password)
        if(isPasswordMatch){
            const payload = {
                username: username
            }
            const jwtToken = jwt.sign(payload, "MY_TOKEN")
            res.send({jwtToken})
        }else{
            res.status(400).json({error: "Invalid Password"})
        }
    }

})
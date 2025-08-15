import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;
const app = express();
app.use(express.json());



const pool = new Pool({
  connectionString: process.env.DB_CONNECTION,
  ssl: { rejectUnauthorized: false }
});


pool.connect()
  .then(() => console.log('Connected to PG'))
  .catch(err => console.error('Connection error PG', err.stack));



// Login
app.post('/login', async (req, res) => {
  const username = req.body.username;
  if(!username) {
    return res.status(400).json({ message: "Username is empty" });
  }

  const foundUsername = await pool.query("SELECT username FROM users WHERE username = $1", [username]);
  if(foundUsername.rowCount === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const timeRecorded = await pool.query("SELECT time FROM times WHERE username = $1", [username]);
  const reactionTime = timeRecorded.rows[0]?.time ?? 0;

  res.status(200).json({ reactionTime });
});



// Register
app.post('/register', async (req, res) => {
  const username = req.body.username;
  if(!username) {
    return res.status(400).json({ message: "Username is empty" });
  }

  const existingUser = await pool.query("SELECT username FROM users WHERE username = $1", [username]);
  if(existingUser.rowCount > 0) {
    return res.status(400).json({ message: "Username already exists" });
  }

  await pool.query("INSERT INTO users (username) VALUES ($1)", [username]);
  res.status(201).json({ message: "User registered" });
});



// Update
app.post('/update', async (req, res) => {
  const { reactionTime, username } = req.body;
  if(!username || reactionTime == null) {
    return res.status(400).json({ message: "Missing data" });
  }

  const storedTime = await pool.query("SELECT time FROM times WHERE username = $1", [username]);
  const existingTime = storedTime.rows[0]?.time;

  if(!existingTime) {
    await pool.query("INSERT INTO times (username, time) VALUES ($1, $2)", [username, reactionTime]);
    return res.status(201).json({ message: "Time recorded" });
  }

  if(reactionTime < existingTime) {
    await pool.query("UPDATE times SET time = $1 WHERE username = $2", [reactionTime, username]);
    return res.status(200).json({ message: "Time updated" });
  }

  res.status(200).json({ message: "Time not improved" });
});



app.listen(process.env.PORT || 3002, () => {
  console.log('Server is running...');
});

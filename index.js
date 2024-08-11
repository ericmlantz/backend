import express, { json, urlencoded } from 'express'
import cors from 'cors'
import pkg from 'jsonwebtoken' // Import the default export from jsonwebtoken
import { v4 as uuidv4 } from 'uuid'
import pkgMongo from 'mongodb' // Import the default export from mongodb
import { compare as _compare, hash } from 'bcrypt'
import dotenv from 'dotenv'

const { sign } = pkg // Destructure sign from jsonwebtoken
const { MongoClient } = pkgMongo // Destructure MongoClient from mongodb

dotenv.config();

const app = express();
const PORT = process.env.PORT || 65002;
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS, 10);
const uri = process.env.MONGODB_URI;

const corsOptions = {
  origin: 'https://dinr.ericlan.tz',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(urlencoded({ extended: true }));
app.use(json());


app.get('/', (req, res) => {
  res.json('Hello to my app')
})

//------------Sign Up----------
//User Post
app.post('/user/signup', async (req, res) => {
  const client = new MongoClient(uri)
  const { email, password } = req.body
  const generatedUserId = uuidv4()
  const hashedPassword = await hash(password, SALT_ROUNDS)

  try {
    await client.connect()
    const database = client.db('app-data')
    const users = database.collection('users')

    const existingUser = await users.findOne({ email })

    if (existingUser) {
      return res.status(409).send('User already exists. Please login')
    }

    const sanitizedEmail = email.toLowerCase()
    const data = {
      user_id: generatedUserId,
      email: sanitizedEmail,
      hashed_password: hashedPassword
    }

    const insertedUser = await users.insertOne(data)

    const token = sign({ userId: generatedUserId }, sanitizedEmail, {
      expiresIn: '24h'
    })

    res.status(201).send({ token, userId: generatedUserId })
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

//Restaurant Post
app.post('/restaurant/signup', async (req, res) => {
  const client = new MongoClient(uri)
  const { email, password } = req.body
  const generatedRestaurantId = uuidv4()
  const hashedPassword = await hash(password, SALT_ROUNDS)

  try {
    await client.connect()
    const database = client.db('app-data')
    const restaurants = database.collection('restaurants')

    const existingRestaurant = await restaurants.findOne({ email })

    if (existingRestaurant) {
      return res.status(409).send('Restaurant already exists. Please login')
    }

    const sanitizedEmail = email.toLowerCase()
    const data = {
      rest_id: generatedRestaurantId,
      email: sanitizedEmail,
      hashed_password: hashedPassword
    }

    const insertedRestaurant = await restaurants.insertOne(data)

    const token = sign({ restId: generatedRestaurantId }, sanitizedEmail, {
      expiresIn: '24h'
    })

    res.status(201).send({ token, restId: generatedRestaurantId })
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

//Login User
app.post('/user/login', async (req, res) => {
  const client = new MongoClient(uri)
  const { email, password } = req.body

  try {
    await client.connect()
    const database = client.db('app-data')
    const users = database.collection('users')

    const user = await users.findOne({ email })

    if (!user) {
      return res.status(400).send('Invalid Credentials')
    }

    const correctPassword = await _compare(password, user.hashed_password)

    if (correctPassword) {
      const token = sign({ userId: user.user_id }, email, {
        expiresIn: '24h'
      })
      return res.status(201).send({ token, userId: user.user_id })
    }

    res.status(400).send('Invalid Credentials')
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

//Login Restaurant
app.post('/restaurant/login', async (req, res) => {
  const client = new MongoClient(uri)
  const { email, password } = req.body

  try {
    await client.connect()
    const database = client.db('app-data')
    const restaurants = database.collection('restaurants')

    const restaurant = await restaurants.findOne({ email })

    if (!restaurant) {
      return res.status(400).send('Invalid Credentials')
    }

    const correctPassword = await _compare(password, restaurant.hashed_password)

    if (correctPassword) {
      const token = sign({ restId: restaurant.rest_id }, email, {
        expiresIn: '24h'
      })
      return res.status(201).send({ token, restId: restaurant.rest_id })
    }

    res.status(400).send('Invalid Credentials')
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

//Get One User
app.get('/user', async (req, res) => {
  const client = new MongoClient(uri);
  const userId = req.query.userId

  try {
    await client.connect()
    const database = client.db('app-data')
    const users = database.collection('users')

    const query = { user_id: userId }
    const user = await users.findOne(query)
    res.send(user)
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

//Get One Restaurant
app.get('/rest', async (req, res) => {
  const client = new MongoClient(uri)
  const restId = req.query.restId

  try {
    await client.connect()
    const database = client.db('app-data')
    const restaurants = database.collection('restaurants')

    const query = { rest_id: restId }
    const restaurant = await restaurants.findOne(query)
    res.send(restaurant)
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

//Add Restaurant Matches
app.put('/addrestmatch', async (req, res) => {
  const client = new MongoClient(uri)
  const { userId, matchedRestaurantId } = req.body

  try {
    await client.connect()
    const database = client.db('app-data')
    const users = database.collection('users')

    const query = { user_id: userId }
    const updateDocument = {
      $push: { matches: { rest_id: matchedRestaurantId } }
    }
    const user = await users.updateOne(query, updateDocument)
    res.send(user)
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

//Get Matched Restaurants
app.get('/rests', async (req, res) => {
  const client = new MongoClient(uri)
  const restIds = JSON.parse(req.query.restIds)

  try {
    await client.connect()
    const database = client.db('app-data')
    const restaurants = database.collection('restaurants')

    const pipeline = [
      {
        $match: {
          rest_id: {
            $in: restIds
          }
        }
      }
    ]

    const foundRestaurants = await restaurants.aggregate(pipeline).toArray()
    res.send(foundRestaurants)
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

//Get Zipcode Users
app.get('/zipcodeusers', async (req, res) => {
  const client = new MongoClient(uri)
  const zipcode = req.query.zipcode

  try {
    await client.connect()
    const database = client.db('app-data')
    const users = database.collection('users')
    const query = { zipcode: { $eq: zipcode } }
    const foundUsers = await users.find(query).toArray()
    res.send(foundUsers)
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

//Get Zipcode Restaurants
app.get('/zipcoderests', async (req, res) => {
  const client = new MongoClient(uri)
  const zipcode = req.query.zipcode

  try {
    await client.connect()
    const database = client.db('app-data')
    const restaurants = database.collection('restaurants')
    const query = { zipcode: { $eq: zipcode } }
    const foundRestaurants = await restaurants.find(query).toArray()
    res.send(foundRestaurants)
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

//Get All Users
app.get('/users', async (req, res) => {
  const client = new MongoClient(uri)

  try {
    await client.connect()
    const database = client.db('app-data')
    const users = database.collection('users')
    const allUsers = await users.find().toArray()
    res.send(allUsers)
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

//Get All Restaurants
app.get('/restaurants', async (req, res) => {
  const client = new MongoClient(uri)

  try {
    await client.connect()
    const database = client.db('app-data')
    const restaurants = database.collection('restaurants')
    const allRestaurants = await restaurants.find().toArray()
    res.send(allRestaurants)
  } catch (err) {
    console.log(err)
    res.status(500).send('Internal Server Error')
  } finally {
    await client.close()
  }
})

// Previous Code, line 349-471

//Update Users
app.put('/user', async (req, res) => {
  const client = new MongoClient(uri)
  const personFormData = req.body.personFormData

  try {
    await client.connect()
    const database = client.db('app-data')
    const users = database.collection('users')
    const query = { user_id: personFormData.user_id }
    const updateDocument = {
      $set: {
        first_name: personFormData.first_name,
        dob_month: personFormData.dob_month,
        dob_day: personFormData.dob_day,
        dob_year: personFormData.dob_year,
        profile_photo: personFormData.profile_photo,
        zipcode: personFormData.zipcode,
        matches: personFormData.matches
      }
    }
    const insertedUser = await users.updateOne(query, updateDocument)
    res.send(insertedUser)
  } finally {
    await client.close()
  }
})

//Update Restaurants
app.put('/rest', async (req, res) => {
  const client = new MongoClient(uri)
  const restaurantFormData = req.body.restaurantFormData

  try {
    await client.connect()
    const database = client.db('app-data')
    const restaurants = database.collection('restaurants')
    const query = { rest_id: restaurantFormData.rest_id }
    const updateDocument = {
      $set: {
        rest_name: restaurantFormData.rest_name,
        rest_logo: restaurantFormData.rest_logo,
        rest_photo1: restaurantFormData.rest_photo1,
        rest_description: restaurantFormData.rest_description,
        rest_url: restaurantFormData.rest_url,
        rest_phone: restaurantFormData.rest_phone,
        food_type: restaurantFormData.type_of_food,
        rest_street: restaurantFormData.rest_street,
        rest_apt: restaurantFormData.rest_apt,
        rest_city: restaurantFormData.rest_city,
        rest_state: restaurantFormData.rest_state,
        zipcode: restaurantFormData.zipcode,
        matches: restaurantFormData.matches
      }
    }
    const insertedRestaurant = await restaurants.updateOne(
      query,
      updateDocument
    )
    res.send(insertedRestaurant)
  } finally {
    await client.close()
  }
})

app.put('/addusermatch', async (req, res) => {
  const client = new MongoClient(uri)
  const { userId, matchedUserId } = req.body

  try {
    await client.connect()
    const database = client.db('app-data')
    const users = database.collection('users')

    const query = { user_id, userId }
    const updateDocument = {
      $push: { matches: { user_id: matchedUserId } }
    }
    const user = await users.updateOne(query, updateDocument)
    res.send(user)
  } finally {
    await client.close()
  }
})

app.get('/messages', async (req, res) => {
  const client = new MongoClient(uri);
  const { userId, correspondingRestId } = req.query
  console.log(userId, correspondingRestId, 'correspondingRestId')

  try {
    await client.connect()
    const database = client.db('app-data')
    const messages = database.collection('messages')

    const query = {
      from_userId: userId,
      to_restId: correspondingRestId
    }
    const foundMessages = await messages.find(query).toArray()
    res.send(foundMessages)
  } finally {
    await client.close()
  }
})

app.post('/message', async (req, res) => {
  const client = new MongoClient(uri);
  const message = req.body.message

  try {
    await client.connect()
    const database = client.db('app-data')
    const messages = database.collection('messages')
    const insertedMessage = await messages.insertOne(message)
    res.send(insertedMessage)
  } finally {
    await client.close()
  }
})

app.get('/test-cors', (req, res) => {
  res.json({ message: 'CORS is working!' });
});

// ---------------

app.listen(PORT, () => {
  console.log('Server running on PORT ' + PORT)
})

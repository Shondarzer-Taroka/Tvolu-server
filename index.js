const express = require('express')
const cors = require('cors')
const port = process.env.PORT || 5588
require('dotenv').config()
const app = express()
const jwt = require('jsonwebtoken')
const cokieParser = require('cookie-parser')
app.use(express.json())

app.use(cors({
  origin: ["http://localhost:5173", 
  "http://localhost:5174",
  "https://assignment-eleven-df832.web.app",
  "https://assignment-eleven-df832.firebaseapp.com"
],
  credentials: true
}))
app.use(cokieParser())


const verify = async (req, res, next) => {
  console.log(req.cookies?.token);
  if (!req.cookies.token) {
    return res.status(401).send({ message: 'unauthorized' })
  }

  jwt.verify(req.cookies?.token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // console.log('ver',err);
      return res.status(401).send({ message: 'unauthorized' })
    }
    // console.log('de', decoded);
    req.user = decoded
    next()
  })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.oypj9vn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

 const cokieOption= {
  httpOnly: true,
  sameSite:process.env.NODE_ENV==="production" ? "none": "strict",
  secure:process.env.NODE_ENV==="production"? true : false
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // let volunteerCollection=client.db('volunteerDB').collection('volunteers')
    let addedvolunteersCollection = client.db('volunteerDB').collection('addedvolunteers')
    let requestvolunteersCollection = client.db('volunteerDB').collection('requestvolunteers')


    // jwt starts
    app.post('/jwt', async (req, res) => {
      let user = req.body
      let token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
      res.cookie('token', token,cokieOption)
        .send({ success: true })
    })


    app.post('/logout',async (req, res) => {
      let user = req.body
      res.clearCookie('token', { ...cokieOption,maxAge: 0 })
      .send({ success: true })
    
      // console.log(user);
    })
    // jwt ends


    app.get('/volunteerneed', async (req, res) => {
      let cursor = addedvolunteersCollection.find()
      let result = await cursor
        .sort({ deadline: -1 })
        .toArray()
      res.send(result)

    })

    app.post('/addvolunteer',verify,async (req, res) => {
      let addedVolunteer = req.body
      let result = await addedvolunteersCollection.insertOne(addedVolunteer)
      res.send(result)
    })


    app.get('/postdetails/:id', async (req, res) => {

      // if (req.params.email !== req.user.email) {
      //   return  res.status(403).send({message:'unauthorized'})
      // }

      // console.log(req.body);

      let id = req.params.id
      let query = { _id: new ObjectId(id) }
      let result = await addedvolunteersCollection.findOne(query)
      res.send(result)
      // if (result.organizer_email !== req.user.email ) {
      //   return  res.status(403).send({message:'unauthorized'})
      // }
      // console.log(result);

    })

    app.put('/updatevolunteer/:id',verify,async (req, res) => {
      let updatebody = req.body
      let id = req.params.id
      let query = { _id: new ObjectId(id) }
      let options = { upsert: true }

      let updateddoc = {
        $set: {
          thumbnail: updatebody.thumbnail,
          post_title: updatebody.post_title,
          category: updatebody.category,
          location: updatebody.location,
          volunteer_number: updatebody.volunteer_number,
          deadline: updatebody.deadline,
          organizer_email: updatebody.organizer_email,
          organizer_name: updatebody.organizer_name,
          description: updatebody.description
        }
      }

      let result = await addedvolunteersCollection.updateOne(query, updateddoc, options)
      res.send(result)
    })

    

    app.delete('/deletevolunteer/:id', async (req, res) => {
      let id = req.params.id
      let item = req.body
      let query = { _id: new ObjectId(id) }
      let result = await addedvolunteersCollection.deleteOne(query)
      res.send(result)
    })


    app.get('/updateitem/:id',async (req, res) => {
      let id = req.params.id
      let query = { _id: new ObjectId(id) }
      let result = await addedvolunteersCollection.findOne(query)
      res.send(result)
    })

    app.get('/bevolunteer/:id',verify, async (req, res) => {
      let id = req.params.id
      let query = { _id: new ObjectId(id) }
      let result = await addedvolunteersCollection.findOne(query)
      res.send(result)
    })

    app.get('/needaddvolunteer', async (req, res) => {
      let cursor = addedvolunteersCollection.find()
      let result = await cursor.toArray();
      res.send(result)
    })
 
    app.get('/posttitle/:post_title', async (req, res) => { 
      let post_title=req.params.post_title 
      let query= {post_title:post_title}
      let cursor = addedvolunteersCollection.find(query)
      let result = await cursor.toArray();
      res.send(result)
    })

  
    app.get('/myneedvolunteer/:email', verify, async (req, res) => {
      // console.log(req.user.email);
      // console.log(req.params.email);
      // console.log(req.body.organizer_email);
      if (req.params.email !== req.user.email) {
        return res.status(403).send({ message: 'unauthorized' })
      }
      let email = req.params.email
      let query = { organizer_email: email }
      let result = await addedvolunteersCollection.find(query).toArray();
      res.send(result)
    })

    // app.get('/myneedvolunteer',async(req,res)=>{
    //   let query={}
    //     if (req.query?.email) {
    //         query={email:req.query.email}
    //     }
    //   // let email=req.params.email 
    //   // let query= {email:email}
    //   let result= await addedvolunteersCollection.find(query).toArray();
    //   res.send(result)
    // })



    // requested collections start
    app.post('/requsted',verify,async (req, res) => {
      let requstVolunteer = req.body
      let result = await requestvolunteersCollection.insertOne(requstVolunteer)
      // console.log(requstVolunteer.g); 
      const volunteer = await addedvolunteersCollection.findOneAndUpdate({ _id: new ObjectId(requstVolunteer.g) }, { $inc: { volunteer_number: -1 } }, { new: true })
      res.send(result)
    })


    app.get('/myrequestedvolunteer/:email', verify, async (req, res) => {
      let email = req.params.email
      if (req.params.email !== req.user.email) {
        return res.status(403).send({ message: 'unauthorized' })
      }
      console.log(req.user.email);
      let query = { volunteer_email: email }
      let result = await requestvolunteersCollection.find(query).toArray();
      res.send(result)
    })


    app.delete('/cancelrequested/:id', async (req, res) => {
      let id = req.params.id
      let item = req.body
      let query = { _id: new ObjectId(id) }
      let result = await requestvolunteersCollection.deleteOne(query)
      res.send(result)
    })
    // requested collections end
    // Send a ping to confirm a successful connection



    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('SERVER IS RUNNING')
})

app.listen(port, (req, res) => {
  console.log(`server in PORT:${port}`);
})
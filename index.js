const express=require('express')
const cors=require('cors')
const port=process.env.PORT || 5588
require('dotenv').config()
const app=express()

app.use(express.json())
app.use(cors())



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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
    let volunteerCollection=client.db('volunteerDB').collection('volunteers')
    let addedvolunteersCollection=client.db('volunteerDB').collection('addedvolunteers')
    app.get('/volunteerneed',async(req,res)=>{
      let cursor=volunteerCollection.find()
      let result= await cursor
      .sort({deadline:-1})
      .toArray()
      res.send(result)

    })

    app.post('/addvolunteer',async(req,res)=>{
      let addedVolunteer=req.body 
      let result =await addedvolunteersCollection.insertOne(addedVolunteer)
      res.send(result)
    })


    app.get('/postdetails/:id',async(req,res)=>{
      let id=req.params.id
      let query= {_id:new ObjectId(id)}
      let result=await addedvolunteersCollection.findOne(query)
      res.send(result)  
    })

    app.get('/needaddvolunteer',async(req,res)=>{
      let cursor=addedvolunteersCollection.find()
      let result=await cursor.toArray();
      res.send(result)
    })
    // Send a ping to confirm a successful connection

    

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res)=>{
    res.send('SERVER IS RUNNING')
})

app.listen(port,(req,res)=>{
    console.log(`server in PORT:${port}`);
})
const express = require('express')
const cors = require('cors')
const port = process.env.PORT || 5588
require('dotenv').config()
const app = express()
const jwt = require('jsonwebtoken')
const cokieParser = require('cookie-parser')

const bodyParser = require('body-parser');
app.use(express.json())
app.use(bodyParser.json());

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors({
  origin: ["http://localhost:5173",
    "http://localhost:5174",
    "https://assignment-eleven-df832.web.app",
    "https://assignment-eleven-df832.firebaseapp.com",
    "https://tvolu.vercel.app"
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
      console.log('ver', err);
      return res.status(401).send({ message: 'unauthorized' })
    }
    console.log('de', decoded);
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

const cokieOption = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false
};

async function run() {
  try {

    let addedvolunteersCollection = client.db('volunteerDB').collection('addedvolunteers')
    // const collection = db.collection('transactions');
    let transactionCollection = client.db('volunteerDB').collection('transactions')
    let requestvolunteersCollection = client.db('volunteerDB').collection('requestvolunteers')
    let feedbackCollection = client.db('volunteerDB').collection('feedback')
    let newsContentsCollection = client.db('volunteerDB').collection('newsContents')


    // jwt starts
    app.post('/jwt', async (req, res) => {
      let user = req.body
      let token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
      console.log(token);
      res.cookie('token', token, cokieOption)
        .send({ success: true })
    })


    app.post('/logout', async (req, res) => {
      let user = req.body
      res.clearCookie('token', { ...cokieOption, maxAge: 0 })
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

    app.post('/addvolunteer', verify, async (req, res) => {
      let addedVolunteer = req.body
      let result = await addedvolunteersCollection.insertOne(addedVolunteer)
      res.send(result)
    })


    app.get('/postdetails/:id', verify, async (req, res) => {

      // if (req.params.email !== req.user.email) {
      //   return  res.status(403).send({message:'unauthorized'})
      // }

      // console.log(req.body);

      let id = req.params.id
      let query = { _id: new ObjectId(id) }
      let result = await addedvolunteersCollection.findOne(query)
      res.send(result)
    })

    app.put('/updatevolunteer/:id', verify, async (req, res) => {
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


    app.get('/updateitem/:id', async (req, res) => {
      let id = req.params.id
      let query = { _id: new ObjectId(id) }
      let result = await addedvolunteersCollection.findOne(query)
      res.send(result)
    })

    app.get('/bevolunteer/:id', verify, async (req, res) => {
      let id = req.params.id
      let query = { _id: new ObjectId(id) }
      let result = await addedvolunteersCollection.findOne(query)
      res.send(result)
    })



    // app.get('/needaddvolunteer', async (req, res) => {
    //   let cursor = addedvolunteersCollection.find()
    //   let result = await cursor.toArray();
    //   res.send(result)
    // })


    app.get('/needaddvolunteer', async (req, res) => {
      try {
        const { search } = req.query;

        // Define the query object
        let query = {};
        if (search) {
          query = {
            post_title: { $regex: search, $options: "i" }, // Case-insensitive regex search
          };
        }

        // Fetch matching results from the collection
        const cursor = addedvolunteersCollection.find(query);
        const result = await cursor.toArray();

        res.send(result); // Send the filtered results to the client
      } catch (error) {
        console.error("Error fetching volunteer data:", error);
        res.status(500).send({ error: "Failed to fetch volunteer data" });
      }
    });



    app.get('/posttitle/:post_title', async (req, res) => {
      let post_title = req.params.post_title
      let query = { post_title: post_title }
      let cursor = addedvolunteersCollection.find(query)
      let result = await cursor.toArray();
      res.send(result)
    })


    app.get('/myneedvolunteer/:email', verify, async (req, res) => {

      if (req.params.email !== req.user.email) {
        return res.status(403).send({ message: 'unauthorized' })
      }
      let email = req.params.email
      let query = { organizer_email: email }
      let result = await addedvolunteersCollection.find(query).toArray();
      res.send(result)
    })




    // requested collections start
    app.post('/requsted', verify, async (req, res) => {
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


    app.post('/feedback', async (req, res) => {
      let item = req.body
      let result = await feedbackCollection.insertOne(item)
      res.send(result)
    })
    // requested collections end
    // Send a ping to confirm a successful connection


    // //  payment related

    // app.post('/create-checkout-session', async (req, res) => {
    //   const { name, email, amount } = req.body;

    //   try {
    //     const session = await stripe.checkout.sessions.create({
    //       payment_method_types: ['card'],
    //       mode: 'payment',
    //       line_items: [
    //         {
    //           price_data: {
    //             currency: 'usd',
    //             product_data: {
    //               name: 'Donation',
    //               description: `Donation by ${name}`,
    //             },
    //             unit_amount: parseInt(amount) * 100, // Convert to cents
    //           },
    //           quantity: 1,
    //         },
    //       ],
    //       customer_email: email,
    //       success_url: `http://localhost:5173/success?session_id=${session.id}`,
    //       cancel_url: 'http://localhost:5173/cancel',
    //     });

    //     // Save transaction details to MongoDB


    //    let result= await transactionCollection.insertOne({
    //       name,
    //       email,
    //       amount,
    //       sessionId: session.id,
    //       createdAt: new Date(),
    //     });

    //     res.status(200).json({ url: session.url });
    //   } catch (error) {
    //     console.error('Stripe checkout error:', error);
    //     res.status(500).json({ error: 'Something went wrong' });
    //   }
    // });


    app.post('/create-checkout-session', async (req, res) => {
      const { name, email, amount } = req.body;

      // Validate input
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid donation amount' });
      }

      try {
        // Prepare line items for the checkout session
        const lineItems = [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Donation',
                description: `Donation by ${name}`,
              },
              unit_amount: parseInt(amount) * 100, // Convert to cents
            },
            quantity: 1,
          },
        ];

        // Create a checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          line_items: lineItems,
          customer_email: email,
          success_url: 'https://tvolu.vercel.app/success?session_id={CHECKOUT_SESSION_ID}', // Placeholder ID
          cancel_url: 'https://tvolu.vercel.app/cancel',
        });

        // Save transaction details to MongoDB
        await transactionCollection.insertOne({
          name,
          email,
          amount: parseFloat(amount), // Ensure the amount is a float
          sessionId: session.id,
          createdAt: new Date(),
        });

        // Return the session URL
        res.status(200).json({ url: session.url });
      } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ error: error.message || 'Something went wrong' });
      }
    });



    app.get('/donation-success', async (req, res) => {
      const { session_id } = req.query;
      console.log(session_id);


      try {
        if (!session_id) {
          return res.status(400).json({ error: 'Session ID is required' });
        }



        const donation = await transactionCollection.findOne({ sessionId: session_id });

        if (!donation) {
          return res.status(404).json({ error: 'Donation not found' });
        }

        res.status(200).json(donation);
      } catch (error) {
        console.error('Error fetching donation details:', error);
        res.status(500).json({ error: 'Something went wrong' });
      }
    });



    app.post('/api/news-content', async (req, res) => {
      try {
        const { title, category, date, description, newsContent, image } = req.body;

        // Check if all required fields are provided
        if (!title || !category || !date || !description || !newsContent || !image) {
          return res.status(400).json({ error: "All fields are required" });
        }

        // Prepare the news content object to insert
        const newsContentData = {
          title,
          category,
          date,
          description,
          newsContent,
          image,
          createdAt: new Date(), // Optionally add a createdAt field
        };

        // Insert the news content into the database
        const result = await newsContentsCollection.insertOne(newsContentData);

        if (result.acknowledged) {
          res.status(201).json({ message: "News content added successfully", data: result });
        } else {
          res.status(500).json({ error: "Failed to insert news content" });
        }
      } catch (error) {
        console.error('Error adding news content:', error);
        res.status(500).json({ error: 'An error occurred while adding news content' });
      }
    });

    app.get('/api/news-content', async (req, res) => {
      try {
        const result = await newsContentsCollection
          .find()
          .sort({ _id: -1 }) // Sorts by the most recent `_id` (MongoDB ObjectId includes a timestamp)
          .limit(6)
          .toArray();
    
        if (result.length === 0) {
          return res.status(404).send('No data found');
        }
    
        return res.status(200).send(result);
      } catch (error) {
        return res.status(500).send({ message: 'Internal server error', error });
      }
    });
    

    app.get('/readmore/:id', async (req, res) => {
      try {
        // Extract the `id` from the route parameters
        const { id } = req.params;
        console.log(req.params);

        // Simulate or fetch the item (e.g., from a database)
        const item = await newsContentsCollection.findOne({ _id: new ObjectId(id) });

        // Check if the item exists
        if (!item) {
          return res.status(404).json({ error: "Item not found" });
        }

        // Respond with the item details
        res.status(200).json(item);
      } catch (error) {
        // Handle errors (e.g., database connection issues)
        console.error("Error fetching item:", error.message);
        res.status(500).json({ error: "An error occurred while fetching the item" });
      }
    });


    await client.db("admin").command({ ping: 1 });
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
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
    "https://tvolu.vercel.app",
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
// const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.oypj9vn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const uri = `mongodb://localhost:27017/`;

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
    let usersCollection = client.db('volunteerDB').collection('users')
    let transactionCollection = client.db('volunteerDB').collection('transactions')
    let requestvolunteersCollection = client.db('volunteerDB').collection('requestvolunteers')
    let feedbackCollection = client.db('volunteerDB').collection('feedback')
    let newsContentsCollection = client.db('volunteerDB').collection('newsContents')
    let donationsCollection = client.db('volunteerDB').collection('donations')

    // jwt starts
    // app.post('/jwt', async (req, res) => {
    //   let user = req.body


    //   let userInfo = await usersCollection.findOne({ email: user.email })
    //   if (userInfo.email !== user.email) {
    //     userInfo={email:user.email}
    //     console.log('ase', userInfo);

    //   }
    //   let token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
    //   console.log(token);
    //   res.cookie('token', token, cokieOption)
    //     .send({ success: true })
    // })

    app.post('/jwt', async (req, res) => {
      try {
        const { email } = req.body;

        // Validate input
        if (!email) {
          return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Find the user in the database
        let userInfo = await usersCollection.findOne({ email });
        console.log('info', userInfo);

        // If user does not exist, create a default user object
        if (!userInfo) {
          userInfo = { email, role: 'user' }; // Default role as 'user'
          console.log('User not found, using default:', userInfo);
        }

        // Generate JWT token with required fields
        const token = jwt.sign({ email: userInfo.email, role: userInfo.role }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '7d', // Set token expiration
        });

        console.log('Generated Token:', token);

        // Define secure cookie options
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // Secure in production
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        };

        // Set token in cookies
        res.cookie('token', token, cookieOptions);

        // Send success response
        res.status(200).json({ success: true, token });
      } catch (error) {
        console.error('Error in /jwt endpoint:', error);
        res.status(500).json({ success: false, message: 'An error occurred' });
      }
    });



    app.post('/logout', async (req, res) => {
      let user = req.body
      res.clearCookie('token', { ...cokieOption, maxAge: 0 })
        .send({ success: true })

      // console.log(user);
    })
    // jwt ends

    // // users
    app.post('/api/users', async (req, res) => {
      try {
        const { name, email, photo } = req.body;
        console.log('user', req.body);

        // Validate incoming data
        if (!name || !email || !photo) {
          return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if the user already exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(409).json({ error: 'User already exists' });
        }

        // Default role as 'user'
        const newUser = {
          name,
          email,
          photo,
          role: 'user', // Default role
          createdAt: new Date(),
        };

        // Insert user into the database
        const result = await usersCollection.insertOne(newUser);
        console.log('res', result);

        res.status(201).json({
          message: 'User registered successfully',
          userId: result.insertedId,
        });
      } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).json({ error: 'An error occurred while saving the user' });
      }
    });


   
    
    app.get('/api/users', async (req, res) => {
      try {
        // Extract token from the `Cookie` header
        const cookieHeader = req.headers.cookie;
    
        if (!cookieHeader) {
          return res.status(401).send({ message: 'Unauthorized: No token provided' });
        }
    
        // Parse the cookie string to extract the token
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.split('=').map((part) => part.trim());
          acc[key] = value;
          return acc;
        }, {});
    
        const token = cookies.token; // Assuming the token is stored as 'token'
        if (!token) {
          return res.status(401).send({ message: 'Unauthorized: Token not found in cookies' });
        }
    
        console.log('Token from cookie:', token);
    
        // Verify the token
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
          if (err) {
            console.error('Token verification error:', err);
            return res.status(401).send({ message: 'Unauthorized: Invalid token' });
          }
    
          console.log('Decoded Token:', decoded);
    
          // Check if the user has admin role
          if (decoded.role !== 'admin') {
            return res.status(403).send({ message: 'Forbidden: Admins only' });
          }
    
          // Fetch all users from the database
          const result = await usersCollection.find().toArray();
          res.status(200).send(result);
        });
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send({ message: 'An error occurred while fetching users' });
      }
    });
    
    
    



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
      // console.log(req.user.email);
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
    //   const { name, email, amount,cardId } = req.body;

    //   // Validate input
    //   if (!amount || isNaN(amount) || amount <= 0) {
    //     return res.status(400).json({ error: 'Invalid donation amount' });
    //   }

    //   try {
    //     // Prepare line items for the checkout session
    //     const lineItems = [
    //       {
    //         price_data: {
    //           currency: 'usd',
    //           product_data: {
    //             name: 'Donation',
    //             description: `Donation by ${name}`,
    //           },
    //           unit_amount: parseInt(amount) * 100, // Convert to cents
    //         },
    //         quantity: 1,
    //       },
    //     ];

    //     // Create a checkout session
    //     const session = await stripe.checkout.sessions.create({
    //       payment_method_types: ['card'],
    //       mode: 'payment',
    //       line_items: lineItems,
    //       customer_email: email,
    //       success_url: 'https://tvolu.vercel.app/success?session_id={CHECKOUT_SESSION_ID}', // Placeholder ID
    //       cancel_url: 'https://tvolu.vercel.app/cancel',
    //     });

    //     // Save transaction details to MongoDB
    //     await transactionCollection.insertOne({
    //       name,
    //       email,
    //       cardId,
    //       amount: parseFloat(amount), // Ensure the amount is a float
    //       sessionId: session.id,
    //       createdAt: new Date(),
    //     });

    //     // Return the session URL
    //     res.status(200).json({ url: session.url });
    //   } catch (error) {
    //     console.error('Stripe checkout error:', error);
    //     res.status(500).json({ error: error.message || 'Something went wrong' });
    //   }
    // });


    app.post('/create-checkout-session', async (req, res) => {
      const { name, email, amount, cardId } = req.body;

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
          cardId,
          amount: parseFloat(amount), // Ensure the amount is a float
          sessionId: session.id,
          createdAt: new Date(),
        });

        // Update the collected amount in the donationCollections
        const updatedDonation = await donationsCollection.findOneAndUpdate(
          { _id: new ObjectId(cardId) }, // Find the specific donation document by cardId
          { $inc: { collected: parseFloat(amount) } }, // Increment the collected amount
          { returnDocument: 'after' } // Return the updated document
        );

        // if (!updatedDonation.value) {
        //   return res.status(404).json({ error: 'Donation not found' });
        // }

        console.log('Updated donation:', updatedDonation.value);

        // Return the session URL
        res.status(200).json({ url: session.url });
      } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ error: error.message || 'Something went wrong' });
      }
    });





    app.post('/api/donations', async (req, res) => {
      try {
        const { title, description, collected, target, image, email, category } = req.body;
        console.log(req.body);


        if (!title || !description || !collected || !target || !image) {
          return res.status(400).json({ message: 'All fields are required' });
        }

        const donation = { createdAt: new Date(), email, category, title, description, collected: parseFloat(collected), target: parseFloat(target), image, createdAt: new Date() };
        const result = await donationsCollection.insertOne(donation);

        res.status(201).json({ message: 'Donation created successfully', data: result });
      } catch (error) {
        console.error('Error creating donation:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });


    app.get('/api/donations', async (req, res) => {
      try {
        const { category, sortByDate, search, page = 1, limit = 10 } = req.query;
        console.log(req.query);

        // Build query object dynamically
        const query = {};
        if (category) query.category = category;
        if (search) query.title = { $regex: search, $options: 'i' }; // Case-insensitive search

        // Convert page and limit to integers
        const pageInt = parseInt(page, 10);
        const limitInt = parseInt(limit, 10);

        // Fetch data with filtering, sorting, and pagination
        const totalItems = await donationsCollection.countDocuments(query);
        const donations = await donationsCollection
          .find(query)
          .sort(sortByDate === 'true' ? { createdAt: -1 } : {}) // Sort by date if requested
          .skip((pageInt - 1) * limitInt)
          .limit(limitInt)
          .toArray();

        return res.status(200).send({
          data: donations,
          totalPages: Math.ceil(totalItems / limitInt),
          currentPage: pageInt,
        });
      } catch (error) {
        console.error('Error fetching donations:', error);
        return res.status(500).send({ message: 'Internal server error', error });
      }
    });



    app.get('/donation-success', async (req, res) => {
      const { session_id } = req.query;
      // console.log(session_id);


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
        const { title, category, date, description, newsContent, image, email } = req.body;
        // console.log(req.body);

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
          email,
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


    // app.get('/api/all-news', async (req, res) => {
    //   try {
    //     const { category, sortByDate, search } = req.query;

    //     // Build query object dynamically based on parameters
    //     const query = {};
    //     if (category) query.category = category;
    //     if (search) query.title = { $regex: search, $options: 'i' }; // Search by title (case-insensitive)

    //     // Fetch data with sorting
    //     const result = await newsContentsCollection
    //       .find(query)
    //       .sort(sortByDate === 'true' ? { date: -1 } : {}) // Sort by date if requested
    //       .toArray();

    //     if (result.length === 0) {
    //       return res.status(404).send('No data found');
    //     }

    //     return res.status(200).send(result);
    //   } catch (error) {
    //     return res.status(500).send({ message: 'Internal server error', error });
    //   }
    // });



    app.get('/api/all-news', async (req, res) => {
      try {
        const { category, sortByDate, search, page = 1, limit = 10 } = req.query;

        // Build query object dynamically based on parameters
        const query = {};
        if (category) query.category = category;
        if (search) query.title = { $regex: search, $options: 'i' }; // Search by title (case-insensitive)

        // Pagination parameters
        const pageNum = parseInt(page, 10) || 1; // Default to page 1
        const pageLimit = parseInt(limit, 10) || 10; // Default to 10 items per page
        const skip = (pageNum - 1) * pageLimit;

        // Fetch data with pagination and sorting
        const result = await newsContentsCollection
          .find(query)
          .sort(sortByDate === 'true' ? { date: -1 } : {})
          .skip(skip)
          .limit(pageLimit)
          .toArray();

        // Count total number of items for pagination metadata
        const totalItems = await newsContentsCollection.countDocuments(query);

        if (result.length === 0) {
          return res.status(404).send('No data found');
        }

        return res.status(200).send({
          data: result,
          totalItems,
          totalPages: Math.ceil(totalItems / pageLimit),
          currentPage: pageNum,
        });
      } catch (error) {
        return res.status(500).send({ message: 'Internal server error', error });
      }
    });




    app.get('/api/mynews/:email', async (req, res) => {
      try {
        const email = req.params.email;

        // Query the collection for documents where the email field matches the given email
        const result = await newsContentsCollection.find({ email }).toArray();

        // console.log(result);
        return res.send(result);
      } catch (error) {
        console.error('Error fetching news:', error);
        return res.status(500).send('Internal Server Error');
      }
    });


    app.delete('/api/mynews/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const result = await newsContentsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
          res.status(200).json({ message: 'News deleted successfully' });
        } else {
          res.status(404).json({ message: 'News not found' });
        }
      } catch (error) {
        console.error('Error deleting news:', error);
        res.status(500).json({ message: 'Error deleting news' });
      }
    });




    // Fetch user's news
    app.get('/api/mynews/:email', async (req, res) => {
      try {
        const { email } = req.params;
        const news = await newsContentsCollection.find({ email }).toArray();
        res.json(news);
      } catch (error) {
        res.status(500).send('Error fetching news');
      }
    });

    // Update specific news
    app.put('/api/mynews/update/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const updatedNews = req.body;

        // Debugging: Log the ID and the update data
        console.log('Updating news with ID:', id);
        console.log('Update data:', updatedNews);

        // Validate ID format
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: 'Invalid ID format' });
        }

        const { _id, ...sendingUpdatedNews } = updatedNews
        console.log('send', sendingUpdatedNews);

        const result = await newsContentsCollection.findOneAndUpdate(
          { _id: new ObjectId(id) }, // Convert to ObjectId
          { $set: sendingUpdatedNews },
          { returnDocument: 'after' } // Return the updated document
        );
        console.log('Database response:', result);
        // if (result.value) {
        //   // No document found
        //   return res.status(404).json({ error: 'News not found' });
        // }




        res.json(result); // Send the updated document
      } catch (error) {
        console.error('Error updating news:', error);
        res.status(500).json({ error: 'Error updating news' });
      }
    });

    // Delete specific news
    app.delete('/api/mynews/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const result = await newsContentsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount > 0) res.status(200).send('News deleted');
        else res.status(404).send('News not found');
      } catch (error) {
        res.status(500).send('Error deleting news');
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
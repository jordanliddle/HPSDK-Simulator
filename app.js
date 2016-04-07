//load the express package and create the app
var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var crypto = require('crypto');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.locals.key = 'jL86TAjopa';
var secret = 'iU44RWxeik';

// sort fields in request
function sortObject(o) {
    var sorted = {},
    key, a = [];
    for (key in o) {
        if (o.hasOwnProperty(key)) {
            a.push(key);
        }
    }
    a.sort();
    for (key = 0; key < a.length; key++) {
        sorted[a[key]] = o[a[key]];
    }
    return sorted;
};

function removeSignature(obj) {
	delete obj.x_signature;
  return obj;
};

// function removeSignature(obj) {
// for ( var i in obj ) {
//         if(!i.startsWith("x_")){
//         ;
//         console.log(fields);
//     }
// }}

function createFields(fields) {
  var newfields = {};

  for(var prop in fields) {
 		if(prop.startsWith('x_')) {
        newfields[prop] = fields[prop];
    	}
  }
  return newfields;

};



// join fields for signing mechanism
function joinFields(fields) {
  var new_fields = [];
  for(var prop in fields) {
	   new_fields.push(prop + fields[prop]);
   }
   var final_fields = new_fields.join('');
   return final_fields;
}

// http://stackoverflow.com/questions/7530619/how-to-encrypt-a-string-using-node-js
function sign(fields,secret) {
  fields  = sortObject(fields)
  fields  = joinFields(fields)
  signature = crypto.createHmac("sha256", secret).update(fields).digest("hex");
  return signature;
};




// send our index.html file to the user for the homepage
app.get('/', function(req,res) {
  res.sendFile(path.join(__dirname + '/index.html'));
  console.log(app.locals.key)
});

// post from Shopify checkout
app.post('/', function(req,res) {
  var provided_signature = req.body.x_signature;
  console.log(provided_signature);
  var finalfields = createFields(req.body);

  var expected_signature = sign(removeSignature(finalfields),secret);
  console.log(expected_signature);
});

app.get('/about', function(req,res) {
  res.sendFile(path.join(__dirname + '/about.html'));
});

// start the server
app.listen(1337);
console.log('1337 is up and running, baby!');

// create routes for the payments page

//get an instance of the router
var adminRouter   = express.Router();
var paymentRouter = express.Router();


//route middleware that will happen on every request
adminRouter.use(function(req,res,next) {
  // log each request to the console
  console.log(req.method, req.url);
  // continue on and go to the route
  next();
});

//route middleware that will happen on every request
paymentRouter.param('action', function(req,res,next,action) {
  //do validation on payment type
  // expected_signature = sign(fields.reject{|k,_| k == 'x_signature'})
  console.log('Doing some validation on ' + action);


  next();
});


app.route('/payment')
  // admin main page. the dashboard (http://localhost:1337/admin)
  .get(function(req,res) {
    res.send('I am the dashboard!');
  })

  // post reqeust
  .post(function(req,res) {
    res.send('YES!');
    console.log(req.body);
  });

// users page
adminRouter.get('/users/', function(req,res) {
  res.send('I show you all the users! like:');
});



// route with params (http://localhost:1337/payment/type/:name)
paymentRouter.get('/type/:action', function(req,res) {
  res.send('hello ' + req.params.action);
});

// route with params (http://localhost:1337/payment/type/:name)
paymentRouter.get('/type', function(req,res) {
  res.send('hello');
});



// apply the routes to our application
app.use('/payment', paymentRouter);
app.use('/admin', adminRouter);

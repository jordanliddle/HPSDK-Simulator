var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var unirest = require('unirest');
var querystring = require('querystring');

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// start the server
app.listen(1337);
console.log('1337 is up and running, baby!');

// GLOBAL VARIABLES
var secret = 'iU44RWxeik';


// HELPERS
// generates random value in hex format
function randomValueHex (len) {
    return crypto.randomBytes(Math.ceil(len/2))
        .toString('hex') // convert to hexadecimal format
        .slice(0,len);   // return required number of characters
};

// sorts fields in request object
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

// join fields in request object
function joinFields(fields) {
  var new_fields = [];
  for(var prop in fields) {
	   new_fields.push(prop + fields[prop]);
   }
   var final_fields = new_fields.join('');
   return final_fields;
};



// removes x_signature value from request object
function removeSignature(obj) {
	delete obj.x_signature;
  return obj;
};

// creates fields object based on x_ properties
function createFields(fields) {
  var newfields = {};

  for(var prop in fields) {
 		if(prop.startsWith('x_')) {
        newfields[prop] = fields[prop];
    	}
  }
  return newfields;
};

// string encryption
function sign(fields,secret) {
  fields  = sortObject(fields)
  fields  = joinFields(fields)
  console.log(fields)
  signature = crypto.createHmac("sha256", secret).update(fields).digest("hex");
  return signature;
};

// process payment
function processPayment(req,res,secret,result) {
  var timeOfTransaction = new Date(Date.now()).toISOString();
  var payload = {
    "x_account_id"        :req.body['x_account_id'],
    "x_reference"         :req.body['x_reference'],
    "x_currency"          :req.body['x_currency'],
    "x_test"              :req.body['x_test'],
    "x_amount"            :req.body['x_amount'],
    "x_result"            :result, // completed, pending, failed
    "x_gateway_reference" :randomValueHex(5),
    "x_timestamp"         :timeOfTransaction
  };
  payload.x_signature = sign(payload,secret);
  console.log(payload)
  console.log(secret)
  var redirect_url = req.body['x_url_complete'];
  var callback_url = req.body['x_url_callback'];
  unirest.post(callback_url)
  .headers({'Accept': 'application/json', 'Content-Type': 'application/json'})
  .send(payload)
  .end(function(res) {
    console.log(res.code
  });
  var queryString = '?' + querystring.stringify(payload);
  res.redirect(redirect_url + queryString);
};


// ROUTING
app.get('/', function(req,res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/about', function(req,res) {
  res.sendFile(path.join(__dirname + '/about.html'));
});

// post from Shopify checkout
app.post('/', function(req,res) {
  var provided_signature = req.body.x_signature;
  console.log(req.body)
  var finalfields = createFields(req.body);
  var expected_signature = sign(removeSignature(finalfields),secret);

  if (expected_signature == provided_signature) {
    console.log("Signature's match.");
  } else {
    console.log("Signature's do not match.");
  }
  // process payment with status complete
  processPayment(req,res,secret,"completed");


});



var adminRouter   = express.Router();
var paymentRouter = express.Router();


//route middleware
adminRouter.use(function(req,res,next) {
  console.log(req.method, req.url);
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

paymentRouter.post('/type/:action', function(req,res) {

});







// apply the routes to our application
app.use('/payment', paymentRouter);
app.use('/admin', adminRouter);

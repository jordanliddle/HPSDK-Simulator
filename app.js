var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var unirest = require('unirest');
var querystring = require('querystring');

app.set('view engine', 'jade');

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(path.join(__dirname, 'public')));

// start the server
app.listen(4567);
console.log('4567 is up and running.');

// use the same secret as defined in your gateway settings under 'Password label'
var secret = 'iU44RWxeike';

// helper functions (soon to be replaced using underscore.js)

function turnToString(req) {
  return JSON.stringify(req.body);
}

// generates random value in hex format
function randomValueHex(len) {
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
 		if(prop.indexOf('x_') === 0) {
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

// grab response values
function showResponseValues(req,res,secret,result) {
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
  return createFields(payload);
}

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
    "x_timestamp"         :timeOfTransaction,
  };
  payload.x_signature = sign(payload,secret);
  console.log(payload)
  console.log(secret)
  var redirect_url = req.body['x_url_complete'];
  var callback_url = req.body['x_url_callback'];
  unirest.post(callback_url)
  .headers({'Accept': 'application/json'})
  .send(payload)
  .end((res) => {
    console.log(res.body);
    console.log(res.code);
  })
  // how the heck do I call the following code in the end() method body above - scoping issue?
  // var queryString = '?' + querystring.stringify(payload);
  // res.redirect(redirect_url + queryString);
};

// routing
app.post('/',(req,res) => {
  res.render('index', { key:secret});
});

app.get('/about',(req,res) => {
  res.render('about')
});

var paymentRouter = express.Router();

//route middleware logging
// paymentRouter.use(function(req,res,next) {
//   console.log(req.method, req.url);
//   next();
// });

// post from Shopify checkout
app.route('/payment')
  .post((req,res) => {
    // res.render('index', {request: showResponseValues(req,res,secret,"completed")});
    console.log(req.body);
    console.log(req.headers);
    var provided_signature = req.body.x_signature;
    var finalfields = createFields(req.body);
    var expected_signature = sign(removeSignature(finalfields),secret);

    if (expected_signature == provided_signature) {
      console.log("Signature's match.");
    } else {
      console.log("Signature's do not match.");
    }
    processPayment(req,res,secret,"pending");
    setTimeout(function() { processPayment(req,res,secret,"failed"); },10000);

  });

// route with params (http://localhost:1337/payment/type/:name)
paymentRouter.get('/type/:action', (req,res) => {
  res.send('hello ' + req.params.action);
});

// apply the routes to our application
app.use('/payment', paymentRouter);

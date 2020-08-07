'use strict'

const Env = use('Env')
const axios = require('axios');
const { validate } = use('Validator')

class AuthController {

  create({ view }){
    return view.render('registration.login', { pageTitle: 'Log in' })
  }

  async login({ view, request, session, response, auth }) {
  	console.log(1)
	try{
	  const params = request.all()

	  const messages = {
		  'login.required': 'Missing login',
  	      'password.required': 'Missing password',
	  }

	  const validation = await validate(params, {
	    login: 'required',
		password: 'required',
	  }, messages)

	  // * If validation fails, early returns with validation message.
	  if (validation.fails()) {
	    session
		  .withErrors(validation.messages())
		  .flashExcept(['password'])

		  return response.redirect('back')
	  }

	  const endpoint_url = Env.get("HARENA_MANAGER_URL") + "/api/v2/auth/login"   
	  var config = {
	    method: 'post',
	    url: endpoint_url,
	    data: {
	  	  login: params.login,
	  	  password: params.password,
	    }
	  };

  	  await axios(config)
 	  	.then(async function (endpoint_response) {
 	  	  console.log(endpoint_response.data)
 	  	  let user = endpoint_response.data
 	  	  let token = await auth.generate(user)
 	  	  console.log(token.token)
 	  	  console.log(view)
 	  	  // return view.render('author.home' )
	  	  return response.redirect('/')
	  	})
	    .catch(function (error) {
		  console.log(error);
	  	});
	} catch (e){
		console.log(e)
	}
  }
}

module.exports = AuthController

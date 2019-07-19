'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use("Route");

Route.on("/").render("index");

Route.get('/home', ({ view }) => {
   return view.render('home')
 })

Route.get('/supervisor-home', ({ view }) => {
   return view.render('supervisor/supervisor-home')
})

// Those routes should be only accessible
// when you are not logged in
Route.group(() => {
   Route.get('', 'AuthController.create')
   Route.post('', 'AuthController.login')
}).prefix('/login').middleware(['guest'])

/*
let harenaManagerUrl =
   Env.get("HARENA_MANAGER_URL", "http://localhost:3000/api/v1/");
*/

const Env   = use("Env");

Route.get("infra/dcc-common-server-address.js", async ({response, view}) =>{
    const harena_manager_url = Env.get("HARENA_MANAGER_URL", "http://127.0.0.1:1020");
    const harena_manager_api_version = Env.get("HARENA_MANAGER_API_VERSION", "v1");
    const harena_logger_url = Env.get("HARENA_LOGGER_URL", "http://127.0.0.1:1030");
    const harena_logger_api_version = Env.get("HARENA_LOGGER_API_VERSION", "v1");
    response.header("Content-type", "application/javascript");
    return view.render("dcc-common-server-address",
       {"harena_manager_url": harena_manager_url,
        "harena_manager_api_version": harena_manager_api_version,
        "harena_logger_url": harena_logger_url,
        "harena_logger_api_version": harena_logger_api_version});
});

/*
Route.get('infra/dcc-common-server-address.js', async ({response, view}) =>{
    const harena_manager_url = Env.get('HARENA_MANAGER_URL', 'http://127.0.0.1:3000/api/v1');
    response.header('Content-type', 'application/javascript');
    return view.render('dcc-common-server-address',{ "harena_manager_url" : harena_manager_url });
});
*/

/*
Route.on("/author/js/dcc-author-server-address.js")
     .render("dcc-author-server-address", {harena_manager_url: harenaManagerUrl});
*/

/*
Route.on("/", async ({response, view}) => {
   return response.header("Content-type", "application/javascript").send(
      view.render("dcc-author-server-address", {harena_manager_url: harenaManagerUrl}));
});
*/

/*
Route.get("/themes", ({view}) => {
   return view.render("themes.classic.knot");
});
*/

/*
const fs = use("fs");
const Helpers = use("Helpers");
const readFile = Helpers.promisify(fs.readFile);

Route.get("/themes", async ({response}) => {
  return await readFile("resources/themes/classic/knot.html");
});
*/

/*
Route.get("/images/45293/doctor.png", async ({response}) => {
  return await readFile("resources/images/45293/doctor.png");
});
*/

/*
Route.get("/resources/images/45293/doctor.png", async ({response}) => {
  return response.redirect("doctor.png");
});
*/
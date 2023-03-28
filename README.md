# uWebSockets.js Router

A different approach to the routing of the uWebSockets.js http server.
It also provides helper functions for easily setting up middleware (e.g. authentication) and cached file serving while keeping the code added on top of the underlying uWebSockets.js App as low as possible.

Check out the starter kit for extensive documentation on its usage:

https://github.com/gudatr/uws-node-starter

### Installation

Package:
```
npm install uws-router
```

Import:
```javascript
    import { Router } from "uws-router";
```

### Usage

#### Routing

You main app file will probably only include your routes, which will link to the functions defined on your controllers.
The strucure of your router definition could be something like this:

```javascript
    let router = new Router(false, {
    //Use SSLApp and add your SSL config here if needed
    //See the μWebSockets.js docs for more info
    //cert_file_name: 'server.cert',
    //key_file_name: 'server.key'
});
```
Initializes a new router.
If you choose to use SSL for https, you have to supply the key and cert file names.
Otherwise a http app will be created.


```javascript
router.endpoint('get', Controller.async);

router.group('examples', () => {

    router.endpoint('get', Controller.sync);

    router.middleware(ExampleMiddleware1, () => {

        router.endpoint('post', Controller.async);

        router.middleware(ExampleMiddleware2, () => {

            router.endpoint('get', Controller.middleware);

        });

    });

    router.serveFileRelative('./images/logo.jpg', 'file');

});
```
    
Intializes the following routes pointing to the assigned controller functions:

- GET: /async
- POST: /examples/sync
- GET: /examples/async
- GET: /examples/middleware
- GET: /examples/file

The first route is only matched by a GET-Request to /async

The second route is only matched by a POST-Request to /group/sync

The third route passes through ExampleMiddleware1 before its handler is called

The fourth route passes through ExampleMiddleware1 and then ExampleMiddleware2 before its handler is called

The fifth route serves the file 'logo.jpg' that lies in a folder images relative to the router file.
For easily copying assets and maintaining the path this way during a typescript build, checkout the package simple-copy-files.

```javascript
router.listen("127.0.0.1", 8080, (isListening) => {
    console.log(isListening ? `Listening on port ${port}!` : `Error: Could not listen on port ${port}!`)
})
```

Finally you need call listen on your router to make it listen for incoming requests.
This example will launch on port 8080 on localhost / 127.0.0.1.
isListening will contain the socket if successful, which we won't be using.

#### Controllers

```javascript
    export default class Controller {

        public static async(request: RequestData) {
            request.end('Controller.async called');
        }

        public static sync(request: RequestData) {
            request.end('Controller.sync called');
        }

        public static middleware(request: RequestData) {
            request.end('Controller.middleware called');
        }
    }
```

For the best experience the handler methods should be static. If you require state within your controllers take note that the "this" relation will be lost in the endpoint function. To prevent this, you can set the object to be bound to "this" in the endpoint or the group function.

#### Middleware

The router allows you to define middlewares that can preprocess requests for multiple endpoints.
This way you can for example add an authentication layer with 2 lines of code for all your routes even if you already have hundreds defined.

```javascript
    let Middleware = function (request: RequestData, next: NextFunction): void {
        request.writeStatus("202 Accepted");
        next(request);
    }
```
    
This middleware writes the HTTP status code 202 to our response.
The next parameter specifies which function will be called when the middleware was successfully passed.
Otherwise you could for example end the request and return without calling the next function.

#### Files

To serve files there is the function serveFile on the router that generates a GET endpoint with the specified alias.
It will respond with the file and also allows you to specify a cache duration before the file is reloaded from storage.

#### RequestData

The RequestData class is a wrapper around uws' request which is necessary for async functions as uws' request is stack-allocated an therefore stops existing once the base request handler finishes. Accessing the original request after this will cause an error.

It also wraps around uws' response and handles connection termination. The write-methods will return false once the connection is
terminated. You can also use hasEnded() on the RequestData object to check if the connection was terminated. This can be especially useful if you have long running tasks so you can stop their execution on termination.

RequestData contains:

- The requests headers as string
- The method of the request
- The body of the request
- The query of attached to the url
- Functions to write to the response
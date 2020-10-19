# Ruffle

Ruffle is an opinionated wrapper for Redux-React, Redux-Toolkit and Axios that makes calling an asynchronous API and updating your Redux store a breeze.

## TLDR;
Get rid of Redux and API boilerplate code.  Get up and running as quick as possible.

` /store/slices/truck.js`
```javascript
import Ruffle from '../ruffle-redux';
import { processingStarted, processingComplete } from './ui';

// slice constants
const sliceName = 'truck';

// slice actions
export const createTruckAction = Ruffle.create(sliceName);
export const getTrucksAction = Ruffle.getMany(sliceName);
export const getTruckAction = Ruffle.getOne(sliceName);

// slice reducers
export const truckSlice = Ruffle.createSlice({
  name: sliceName,
  logoutAction: "auth/logout",
  initialState: { allTrucks: [], truck: {} },
  reducers: {},
  extraReducers: {
    [createTruckAction.fulfilled]: (state, action) => {
      state.truck = action.payload.data;
      state.allTrucks.push(action.payload.data);
    },
    [getTrucksAction.fulfilled]: (state, action) => {
      state.allTrucks = action.payload.data;
    },
    [getTruckAction.fulfilled]: (state, action) => {
      state.truck = action.payload.data;
    }
  }
});

// register the slice with Ruffle
Ruffle.registerSlice(sliceName, reduxStore => {
  Ruffle.registerReducer(reduxStore, sliceName, truckSlice);
  Ruffle.registerProcessingActions(processingStarted, processingComplete);
  Ruffle.addWebsocketListener(reduxStore, sliceName, getTrucksAction, getTruckAction);
});
```

` /api/truck.js`

```javascript
  import { REST } from './ruffle-api';

  export default () => ({
    ...REST('trucks')
  });
```


## Motivation

In my early React projects I had always used Flux as my data store.  I hated it, it was so verbose and made server calls a pain in the butt.  Soooooooo much boilerplate code!

On my more recent projects, I started using Redux and liked the reduction in boilerplate code and the intuitive way it updated the store and triggered re-renders.  However, I still thought it was too much boilerplate code.  Why do I need to define String constants everywhere for Actions?  Why do I need to edit 7 different files to add a new slice?  My quest to reduce boilerplate code had to continue.

I then found Redux-Toolkit and thought "time to delete some code!".  And it was true, I was able to reduce my Redux code greatly.  But my brain was still set on "reduce code, reduce code, reduce code" mode, so my quest had to continue.

The result of my quest is presented to you here with Ruffle.  It's a wrapper for Redux-toolkit that gets rid of additional boilerplate code and makes sure *every line of code you write in your store is meaningful*.

But wait, there's more...since Redux can be so tightly coupled with async API calls, why not add some additional functionality to tie the API layer into Ruffle as well!

The result is a toolkit I hope you all find helpful to get your Redux Store and API layer up and running almost instantly.  A design goal was to make adding a new slice require as few file changes as possible.

(If you're not familiar with Redux or the terms used in Redux ("slice" for example), please read-up using the [Redux docs](https://react-redux.js.org/).

## Setting up Your Project
Since Ruffle is an opinionated solution, it makes certain assumptions about your project folder structure to automagically wire everything together.

**API folder**

Required: Your API files should in the folder `/api` with a file called `index.js` that exports all the individual API files.

Example
`/api/index.js`
```javascript
  import truck from './truck';
  import car from './car';
  
  // set up your axios defaults, like JWT tokens

  export default {
    truck: truck(),
    car: car(),
    // etc.
  }
```

**Recommended Folders**

```javascript
  /api
    ---index.js
    ---truck.js

  /store
    ---/slices
      ---index.js
      ---truck.js
```



## Creating a Slice
Ruffle makes creating a slice easy by building on the existing Redux-Toolkit's `createSlice()` function.  

For slices that make API calls, Ruffle adds functionality to integrate the Redux-Toolkit's `createAsyncThunk()`

```javascript
  export const assignTruckAction = Ruffle.async(sliceName, 'assignTruck');
```

When this is called using a dispatch like this:
```javascript
  dispatch(assignTruckAction(params))
```

it will call
`assignTruck()` in the `/api/truck` file.

And the response will be reduced in the code in your slice definition

```javascript
  [assignTruckAction.fulfilled]: (state, action) => {
      state.truck = action.payload.data;
      state.allTrucks.push(action.payload.data);
    },
```

Make sure you load the slice in your `/store/slices/index.js` file

```javascript
import { truckSlice } from './truck';
```


## Registering Your Slice

To ensure your slice is registered with the Redux Store, this must be called within each slice file.

```javascript
  Ruffle.registerSlice(sliceName, reduxStore => {
    Ruffle.registerReducer(reduxStore, sliceName, truckSlice);
  });
```

Why do you need to register your slice, you might ask?  It fits with my design goal to change as few files as possible when adding a new slice.  It also
allows me to build future functionality into the slices as this project expands without having to make breaking changes.


## Handling API Errors

Ruffle automatically injects the "/rejected" reducer into your slices for each action to handle the errors which lets you keep a clean Slice definition
and continue to write your UI code with try/catch blocks.

So, when you create a reducer like this

```javascript
  [getTrucksAction.fulfilled]: (state, action) => {
    state.allTrucks = action.payload.data;
  }
```

Ruffle will automatically search for the reducer [getTrucksAction.rejected].  If there isn't one present, Ruffle will create a reducer for [getTrucksAction.rejected] that will handle the errors and throw them for you.

This allows you to write clean UI code like this

```javascript
   try {
     const response = await dispatch(getTrucksAction());
     const trucks = Ruffle.unwrapAsyncResponse(response);
   }
   catch (err) {
     console.log("ERR", err);
   }
```


## Redux setup

Since your reducers are all registering themselves upon creation, your redux set up file can be simplified.
You only need to call `Ruffle.configureSlices(reduxStore)` when your Redux is set up, and be sure to import the `/store/slices/index.js` file where 
you import all your slices.

```javascript
  import slices from './slices';

  const reducer = combineReducers({});

  const reduxStore = configureStore({
    reducer,
    middleware,
    devTools: process.env.NODE_ENV !== 'production'
  });

  Ruffle.configureSlices(reduxStore);
```

## API REST Helper
If your API calls are all simple REST calls, you barely have to write any code!  Just use the `ruffle-api.js` file to turn any slice
into a fully RESTable endpoint.

In the `/api/truck.js` file

```javascript
  import { REST } from './ruffle-api';

  export default () => ({
    ...REST('trucks')
  });
```

You can also easily override Ruffle's automatic REST function calls, or add your own API calls.

```javascript
  import { REST } from './ruffle-api';

  export default () => ({
    ...REST('trucks'),    
    create: params => axios.post(`${AUTH_API}/trucks?fail=gracefully`, params).then(response => response.data),
    assignTruck: params => axios.post(`${AUTH_API}/trucks/assign/${params.truckId}`, params).then(response => response.data),
  });
```


# Tying It All Together

Since most REST endpoints use the 6 REST methods (CREATE, GET, GET ALL, UPDATE, DELETE, PATCH), Ruffle has short-cuts
built in to make using those REST endpoints even easier.

```javascript
  create: sliceName => Ruffle.async(sliceName, 'create'),
  getMany: sliceName => Ruffle.async(sliceName, 'getMany'),
  getOne: sliceName => Ruffle.async(sliceName, 'getOne'),
  delete: sliceName => Ruffle.async(sliceName, 'delete'),
  update: sliceName => Ruffle.async(sliceName, 'update'),
  patch: sliceName => Ruffle.async(sliceName, 'patch')
```

You can utilize these shortcut methods directly in your Slice.

```javascript
  export const createTruckAction = Ruffle.create(sliceName);
```

Which will automatically call your API method you built with the REST short-cuts

```javascript
  export default () => ({
    ...REST('trucks')
  });
```

Which calls the endpoint

` POST {your api path}/trucks` 

With the parameters you've sent in.

Note - Ruffle looks in your .env files for the {your API path} variables

`process.env.REACT_APP_API_URL_AUTH`
`process.env.REACT_APP_API_URL_PUBLIC`

# Bonus

## Slice Clear Out on Logout

It's best practice to clear out your Redux store when the user logs out.  This ensures that store values are not present
in any Redux debug tools in the browser after a user logs out.

Ruffle makes this easy by automatically clearing the slice values when a user logs out - simply pass in the logout action to the `Ruffle.createSlice()` function and Ruffle will append the "/fulfilled".  When a user logs out, the slice will be set to `undefined` by Ruffle.

```javascript
  export const truckSlice = Ruffle.createSlice({
  name: sliceName,
  logoutAction: "auth/logout", // this should match the action in your app
```

## Toggle 'processing' during API calls

Often in an app you want to display some UI feedback when the application is processing or querying the server.  The UI code can then
show a spinner or placeholder or some indication that information is forthcoming.

Ruffle automates this as well by dispatching through Redux the start of processing and the completion of processing.  The UI code can then react to the changes in this value.  How the UI handles the processing is up to you.

```javascript
  // In your UI slice, where you track things like processing, loading, sidebar expanded/contracted, etc.
  // This is example code, your UI slice may look different
  export const uiSlice = createSlice({
    name: 'ui',
    initialState: { isProcessing: false },
    reducers: {
      processingStarted: (state, action) => {
        state.isProcessing = true;
      },
      processingCompleted: (state, action) => {
        state.isProcessing = false;
      }
    }
  });

  Ruffle.registerSlice(sliceName, reduxStore => {
    Ruffle.registerProcessingActions(uiSlice.actions.processingStarted, uiSlice.actions.processingComplete);
  });
```

```javascript
  // example code which may appear in your UI components
  const { isProcessing } = this.props;
  if (isProcessing) {
    return <Placeholder>;
  }
  else {
    return <div>Welcome!<div>;
  }
```



## Tying it to WebSockets

Websockets are a natural extension of the Ruffle functionality.  As messages are pushed from the server via Websockets, we can tie that
into our dispatch and reducer set-up.

Just register your slice with Ruffle as a Websocket listener, passing in the GET and GET ALL functions

```javascript
  Ruffle.registerSlice(sliceName, reduxStore => {
    Ruffle.registerReducer(reduxStore, sliceName, truckSlice);
    Ruffle.addWebsocketListener(reduxStore, sliceName, getTrucksAction, getTruckAction);
  });
```

Set up the websocket connection however you need to set it up, doesn't matter to Ruffle

Sending a message over websockets with the data structure of:

```javascript
  {
    type: "truck",
    id: "12345"
  }
```

And calling this function when the message is received 
  `Ruffle.fireMessageReceived(message)`

Will parse the message into JSON, determine the slice to operate on ('truck' in this example), and look for an `id` field.

If there's an `id` field, it will call GET /trucks/:id

If there's no `id` field, it will call GET ALL /trucks

*This is our current area of work, so we are hoping to expand this functionality soon *

# What Else is Coming?
- Tighter integration with WebPack to automatically update /stores/slices/index.js when a new slice file is created
- Tighter integration with WebPack to automatically update /api/index.js when a new api file is created
- Better integration with Websockets, so the server can pass the object directly in the message without forcing a request to the server

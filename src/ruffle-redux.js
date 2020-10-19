import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import api from '../api/api';

export default Ruffle = {
  create: (sliceName) => Ruffle.async(sliceName, 'create'),
  getMany: (sliceName) => Ruffle.async(sliceName, 'getMany'),
  getOne: (sliceName) => Ruffle.async(sliceName, 'getOne'),
  delete: (sliceName) => Ruffle.async(sliceName, 'delete'),
  update: (sliceName) => Ruffle.async(sliceName, 'update'),
  patch: (sliceName) => Ruffle.async(sliceName, 'patch'),
  async: (sliceName, eventName) => {
    return createAsyncThunk(`${sliceName}/${eventName}`, async (params, thunkAPI) => {
      try {
        if (Ruffle.processingActions.processingStarted) {
          thunkAPI.dispatch(Ruffle.processingActions.processingStarted);
        }

        const response = await api[sliceName][eventName](params);

        if (Ruffle.processingActions.processingComplete) {
          thunkAPI.dispatch(Ruffle.processingActions.processingComplete);
        }

        return response;
      } catch (err) {
        const errorResponse = {
          status: err.response.status,
          errorMessage: err.response.statusText,
          details: err.response.data.details ? err.response.data.details : err.response.data
        };
        
        if (Ruffle.processingActions.processingComplete) {
          thunkAPI.dispatch(Ruffle.processingActions.processingComplete);
        }

        return thunkAPI.rejectWithValue(errorResponse);
      }
    });
  },
  createSlice: (options) => {
    const extraReducers = options.extraReducers;
    Object.keys(extraReducers).forEach((key) => {
      let action = key.substring(0, key.lastIndexOf("/"));
      
      // inject the rejected state and make it throw an error
      if (typeof extraReducers[action + "/rejected"] === "undefined") {
        extraReducers[action + "/rejected"] = (state, action) => {
          throw action.payload;
        };
      }
    });
    
    // clear the state on logout, if the logout action is passed in
    if (typeof options.logoutAction !== 'undefined') {
      extraReducers[options.logoutAction + "/fulfilled"] = (state, action) => {
        state = undefined;
      };
    }
    
    options.extraReducers = extraReducers;

    return createSlice(options);
  },
  unwrapAsyncResponse: response => {
    return { ...response.payload.data };
  },

  // functions to allow each slice to self-register as a reducer with the reduxStore
  registeredSlices: {},
  registerSlice: (sliceName, cb) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Registering slice', sliceName);
    }
    Ruffle.registeredSlices[sliceName] = cb;
  },
  configureSlices: reduxStore => {
    Object.keys(Ruffle.registeredSlices).forEach(key => {
      Ruffle.registeredSlices[key](reduxStore);
    });
  },
  registerReducer: (reduxStore, sliceName, slice) => {
    if (typeof reduxStore.currentReducers === 'undefined') {
      reduxStore.currentReducers = {};
    }
    if (sliceName in reduxStore.currentReducers === false) {
      reduxStore.currentReducers[sliceName] = slice.reducer;
      reduxStore.replaceReducer(combineReducers(reduxStore.currentReducers));
    }
  },

  processingActions: {},
  registerProcessingActions: (processingStarted, processingComplete) => {
    Ruffle.processingActions.processingStarted = processingStarted;
    Ruffle.processingActions.processingComplete = processingComplete;
  },

  // functions for working with websockets
  websocketListeners: [],
  addWebsocketListener: (store, sliceName, getOne, getMany) => {
    Ruffle.websocketListeners[sliceName] = { store, getOne, getMany };
  },
  fireMessageReceived: message => {
    const data = JSON.parse(message);
    const { store, getOne, getMany } = Ruffle.websocketListeners[data.type];
    if (data.id) {
      store.dispatch(getOne({ id: data.id }));
    } else {
      store.dispatch(getMany());
    }
  },

  // logging utility
  configureLogger: (getState, action) => {
    if (action.type && action.type.indexOf('fulfilled') > -1) {
      const sliceName = action.type.substring(0, action.type.indexOf('/'));
      console.group(action.type);
      console.log('Updated slice', getState()[sliceName]);
      console.log('Updated store', getState());
      console.groupEnd();
    }
  }
};
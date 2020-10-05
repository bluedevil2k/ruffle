import Ruffle from '../ruffle-redux';
import { logout } from './auth';

// slice constants
const sliceName = 'truck';

// slice actions
export const createTruckAction = Ruffle.create(sliceName);
export const getTrucksAction = Ruffle.getMany(sliceName);
export const getTruckAction = Ruffle.getOne(sliceName);
export const deleteTruckAction = Ruffle.delete(sliceName);
export const updateTruckAction = Ruffle.update(sliceName);

// slice reducers
export const truckSlice = Ruffle.createSlice({
  name: sliceName,
  logoutAction: logout.fulfilled,
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
    },
    [deleteTruckAction.fulfilled]: (state, action) => {
      state.allTrucks = state.allTrucks.filter(t => {
        return t.id !== action.payload.data.id;
      });
    },
    [updateTruckAction.fulfilled]: (state, action) => {
      state.truck = action.payload.data.updated;
    }
  }
});

Ruffle.registerSlice(sliceName, reduxStore => {
  Ruffle.registerReducer(reduxStore, sliceName, truckSlice);
  Ruffle.addWebsocketListener(reduxStore, sliceName, getTrucksAction, getTruckAction);
});

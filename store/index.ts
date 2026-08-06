import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authApi } from './api/authApi';
import { storiesApi } from './api/storiesApi';
import { postsApi } from './api/postsApi';
import { notificationApi } from './api/notificationApi';
import { mutualConnectionsApi } from './api/mutualConnectionsApi';
import { remindersApi } from './api/remindersApi';
import authReducer from './slices/authSlice';
import { groupChatApi } from './api/groupChatApi';

export const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [storiesApi.reducerPath]: storiesApi.reducer,
    [postsApi.reducerPath]: postsApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
    [mutualConnectionsApi.reducerPath]: mutualConnectionsApi.reducer,
    [remindersApi.reducerPath]: remindersApi.reducer,
    [groupChatApi.reducerPath]: groupChatApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(storiesApi.middleware)
      .concat(postsApi.middleware)
      .concat(notificationApi.middleware)
      .concat(mutualConnectionsApi.middleware)
      .concat(remindersApi.middleware)
      .concat(groupChatApi.middleware)
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

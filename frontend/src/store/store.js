import { configureStore } from "@reduxjs/toolkit";
import  userReducer, { userSlice }  from "./userSlice";
export const store = configureStore({
    reducer:{
        user: userSlice
    },
})
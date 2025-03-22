import { createSlice } from "@reduxjs/toolkit";

const initaialState = {
    user : null,
}

export const userSlice = createSlice({
    name: 'user',
    initaialState,
    reducers : {
        setUserDetails : (state,action)=>{
            state.user = action.payload;
        }
    }
})
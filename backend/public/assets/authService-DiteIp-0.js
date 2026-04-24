import{aR as e}from"./index-J4ljKAOx.js";const o={login:async(a,s)=>(await e.post("/auth/login",{username:a,password:s})).data,verifyToken:async()=>(await e.get("/auth/verify")).data};export{o as a};

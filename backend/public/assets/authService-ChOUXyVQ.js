import{a as e}from"./index-CN-SSCF3.js";const o={login:async(a,s)=>(await e.post("/auth/login",{username:a,password:s})).data,verifyToken:async()=>(await e.get("/auth/verify")).data};export{o as a};

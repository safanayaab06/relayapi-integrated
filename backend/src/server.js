import dotenv from "dotenv"; dotenv.config();
import express from "express"; import cors from "cors"; import helmet from "helmet";
import authRoutes from "./routes/auth.js"; import collectionRoutes from "./routes/collections.js"; import executeRoutes from "./routes/execute.js"; import shareRoutes from "./routes/share.js"; import relayCompat from "./routes/relay-compat.js"; import { pool } from "./db/pool.js";
const app=express(); app.use(helmet({crossOriginResourcePolicy:{policy:"cross-origin"}}));
const origins=(process.env.CLIENT_ORIGIN||"http://localhost:3000,http://localhost:5173").split(",").map(x=>x.trim()); app.use(cors({origin:(origin,cb)=>!origin||origins.includes(origin)?cb(null,true):cb(null,false)})); app.use(express.json({limit:"2mb"}));
app.get("/api/health",async(_req,res)=>{try{await pool.query("SELECT 1");res.json({status:"ok",service:"RelayAPI integrated backend",database:"connected"})}catch{res.status(503).json({status:"error",database:"unavailable"})}});
app.use("/api/auth",authRoutes); app.use("/api/nova/collections",collectionRoutes); app.use("/api/execute",executeRoutes); app.use("/api/share",shareRoutes); app.use("/api",relayCompat);
app.use((req,res)=>res.status(404).json({error:"Endpoint not found."})); app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:process.env.NODE_ENV==="production"?"Internal server error.":err.message})});
const port=Number(process.env.PORT||5000); app.listen(port,()=>console.log(`RelayAPI backend listening on http://localhost:${port}`));

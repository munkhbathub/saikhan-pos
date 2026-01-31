const express = require("express");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const FILE = "./data.json";
const load = () => JSON.parse(fs.readFileSync(FILE));
const save = d => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));

/* ===== MENU ===== */
app.get("/api/menu", (req,res)=>res.json(load().menu));
app.post("/api/menu", (req,res)=>{
  const d=load();
  d.menu.push(req.body);
  save(d);
  res.json({ok:true});
});
app.delete("/api/menu/:name",(req,res)=>{
  const d=load();
  d.menu = d.menu.filter(i=>i.name!==req.params.name);
  save(d); res.json({ok:true});
});

/* ===== DRINK ===== */
app.get("/api/drinks",(req,res)=>res.json(load().drinks));
app.post("/api/drinks",(req,res)=>{
  const d=load();
  const x=d.drinks.find(i=>i.name===req.body.name);
  if(x) x.qty += Number(req.body.qty);
  else d.drinks.push({...req.body,qty:Number(req.body.qty)});
  save(d); res.json({ok:true});
});

/* ===== ORDER ===== */
app.post("/api/order",(req,res)=>{
  const d=load();
  if(!req.body.table) return res.status(400).json({error:"Ширээ сонгоно уу"});
  const bill=++d.lastBill;
  req.body.items.forEach(i=>{
    if(i.cat!=="Хоол"){
      const x=d.drinks.find(z=>z.name===i.name);
      if(x) x.qty -= i.qty;
    }
  });
  d.orders.push({...req.body,bill});
  save(d);
  res.json({bill});
});

/* ===== SETTLEMENT ===== */
app.post("/api/settlement",(req,res)=>{
  const d=load();
  d.settlements.push({
    date:new Date().toLocaleString(),
    orders:d.orders
  });
  d.orders=[];
  d.lastBill=0;
  save(d);
  res.json({ok:true});
});
app.get("/api/settlements",(req,res)=>res.json(load().settlements));

app.listen(PORT,()=>console.log("Saikhan POS running"));

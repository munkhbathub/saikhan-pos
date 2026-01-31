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
app.get("/api/menu", (r,s)=>s.json(load().menu));
app.post("/api/menu",(r,s)=>{
  const d=load(); d.menu.push(r.body); save(d); s.json({ok:true});
});

/* ===== DRINK ===== */
app.get("/api/drinks",(r,s)=>s.json(load().drinks));
app.post("/api/drinks",(r,s)=>{
  const d=load();
  const x=d.drinks.find(i=>i.name===r.body.name);
  if(x) x.qty+=Number(r.body.qty);
  save(d); s.json({ok:true});
});

/* ===== ORDER ===== */
app.post("/api/order",(r,s)=>{
  const d=load();
  const bill=++d.lastBill;

  r.body.items.forEach(i=>{
    if(i.cat!=="Хоол"){
      const x=d.drinks.find(z=>z.name===i.name);
      if(x) x.qty-=i.qty;
    }
  });

  d.orders.push({...r.body,bill});
  save(d);
  s.json({bill});
});

/* ===== SETTLEMENT ===== */
app.post("/api/settlement",(r,s)=>{
  const d=load();
  d.settlements.push({
    date:new Date().toLocaleString(),
    orders:d.orders
  });
  d.orders=[];
  d.lastBill=0;
  save(d);
  s.json({ok:true});
});

app.get("/api/settlements",(r,s)=>s.json(load().settlements));

app.listen(PORT,()=>console.log("Saikhan POS running"));

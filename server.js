const express = require("express");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const DATA_FILE = "./data.json";

function load() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function save(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

/* ===== MENU ===== */
app.get("/api/menu", (req,res)=>{
  res.json(load().menu);
});

app.post("/api/menu", (req,res)=>{
  const d = load();
  d.menu.push(req.body);
  if(["Ус","Ундаа","Цай"].includes(req.body.cat)){
    d.stock.push({name:req.body.name, qty:req.body.qty});
  }
  save(d);
  res.json({ok:true});
});

app.put("/api/menu/:name",(req,res)=>{
  const d = load();
  const m = d.menu.find(x=>x.name===req.params.name);
  if(!m) return res.sendStatus(404);
  m.name=req.body.name;
  m.price=req.body.price;
  save(d);
  res.json({ok:true});
});

app.delete("/api/menu/:name",(req,res)=>{
  const d = load();
  d.menu = d.menu.filter(x=>x.name!==req.params.name);
  d.stock = d.stock.filter(x=>x.name!==req.params.name);
  save(d);
  res.json({ok:true});
});

/* ===== STOCK ===== */
app.get("/api/stock",(req,res)=>{
  res.json(load().stock);
});

/* ===== ORDER ===== */
app.post("/api/order",(req,res)=>{
  const d = load();
  if(!req.body.table) return res.status(400).json({err:"table"});
  d.lastBill++;

  req.body.items.forEach(i=>{
    const s = d.stock.find(x=>x.name===i.name);
    if(s) s.qty -= i.qty;
  });

  d.orders.push({
    bill:d.lastBill,
    table:req.body.table,
    items:req.body.items,
    total:req.body.total
  });

  save(d);
  res.json({bill:d.lastBill});
});

/* ===== ADMIN SETTLEMENT (REALTIME) ===== */
app.get("/api/admin-settlement",(req,res)=>{
  const d = load();
  const map={};
  d.orders.forEach(o=>{
    o.items.forEach(i=>{
      if(!map[i.name]) map[i.name]={qty:0,sum:0};
      map[i.name].qty+=i.qty;
      map[i.name].sum+=i.qty*i.price;
    });
  });
  res.json(map);
});

/* ===== WAITER SETTLEMENT ===== */
app.post("/api/settlement",(req,res)=>{
  const d = load();
  d.settlements.push(d.orders);
  d.orders=[];
  save(d);
  res.json({ok:true});
});

app.get("/api/settlements",(req,res)=>{
  res.json(load().settlements);
});

app.listen(PORT,()=>console.log("Saikhan POS running"));

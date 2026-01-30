const express = require("express");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const DATA_FILE = "./data.json";

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ===== MENU ===== */
app.get("/api/menu", (req, res) => {
  res.json(loadData().menu);
});

app.post("/api/menu", (req, res) => {
  const data = loadData();
  data.menu.push(req.body);
  saveData(data);
  res.json({ ok: true });
});

app.put("/api/menu/:name", (req, res) => {
  const data = loadData();
  const item = data.menu.find(x => x.name === req.params.name);
  if(item){
    item.name = req.body.name;
    item.price = req.body.price;
    saveData(data);
    res.json({ ok:true });
  } else res.status(404).json({ok:false});
});

app.delete("/api/menu/:name", (req,res)=>{
  const data = loadData();
  data.menu = data.menu.filter(x=>x.name!==req.params.name);
  saveData(data);
  res.json({ok:true});
});

/* ===== STOCK / ORLOGO ===== */
app.get("/api/stock", (req,res)=>{
  res.json(loadData().stock);
});

app.post("/api/orlogo", (req,res)=>{
  const data = loadData();
  const item = data.stock.find(x=>x.name===req.body.name);
  if(item){
    item.qty += Number(req.body.qty);
  } else {
    data.stock.push({name:req.body.name,cat:req.body.cat,qty:Number(req.body.qty)});
  }
  saveData(data);
  res.json({ok:true});
});

/* ===== ORDER ===== */
app.post("/api/order", (req,res)=>{
  const data = loadData();
  if(!req.body.table) return res.status(400).json({error:"Ширээ сонгоно уу"});
  const billNo = data.lastBill+1;
  data.lastBill = billNo;

  req.body.items.forEach(i=>{
    const s = data.stock.find(x=>x.name===i.name);
    if(s && i.stock) s.qty -= i.qty;
  });

  data.orders.push({...req.body,billNo});
  saveData(data);
  res.json({billNo});
});

/* ===== SETTLEMENT ===== */
app.post("/api/settlement", (req,res)=>{
  const data = loadData();
  data.settlements.push({
    date: new Date().toISOString().slice(0,10),
    orders: data.orders
  });
  data.orders = [];
  saveData(data);
  res.json({ok:true});
});

app.get("/api/settlements", (req,res)=>{
  res.json(loadData().settlements);
});

app.listen(PORT,()=>console.log("Saikhan POS running"));

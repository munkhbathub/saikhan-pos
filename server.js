const express = require("express");
const fs = require("fs");
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

// ===== FILE PATHS =====
const DATA_FILE = "data.json";
const STOCK_FILE = "stock.json";
const ORDERS_FILE = "orders.json";
const SETTLE_FILE = "settlements.json";

// ===== READ JSON =====
function readJSON(path){
  if(!fs.existsSync(path)) fs.writeFileSync(path,"[]");
  return JSON.parse(fs.readFileSync(path));
}

// ===== WRITE JSON =====
function writeJSON(path,data){
  fs.writeFileSync(path, JSON.stringify(data,null,2));
}

// ===== MENU API =====
app.get("/api/menu",(req,res)=>{
  const data = readJSON(DATA_FILE);
  res.json(data.menu || []);
});

// ===== STOCK API =====
app.get("/api/stock",(req,res)=>{
  res.json(readJSON(STOCK_FILE));
});

// ===== SAVE ORDER =====
// ===== SAVE ORDER + STOCK UPDATE =====
app.post("/api/order",(req,res)=>{
  const orders = readJSON(ORDERS_FILE);
  const stock = readJSON(STOCK_FILE);

  const newOrder = req.body;

  // 📦 STOCK ХАСАХ
  newOrder.items.forEach(item=>{
    const s = stock.find(x=>x.name === item.name);
    if(s){
      s.qty -= item.qty;
      if(s.qty < 0) s.qty = 0;
    }
  });

  // хадгалах
  orders.push(newOrder);
  writeJSON(ORDERS_FILE,orders);
  writeJSON(STOCK_FILE,stock);

  res.json({ok:true});
});
// ===== SETTLEMENT =====
app.post("/api/settlement",(req,res)=>{
  const orders = readJSON(ORDERS_FILE);
  if(orders.length===0) return res.json({});

  let summary = {};

  orders.forEach(o=>{
    o.items.forEach(i=>{
      if(!summary[i.name]){
        summary[i.name] = { qty:0, sum:0 };
      }
      summary[i.name].qty += i.qty;
      summary[i.name].sum += i.qty * i.price;
    });
  });

  // settlements.json хадгалах
  const old = readJSON(SETTLE_FILE);
  old.push({
    date: new Date().toISOString(),
    data: summary
  });
  writeJSON(SETTLE_FILE,old);

  // orders цэвэрлэх
  writeJSON(ORDERS_FILE,[]);

  res.json(summary);
});

app.listen(PORT,()=>{
  console.log("Saikhan POS running on http://localhost:"+PORT);
});


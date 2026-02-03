const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

/* ===== FILE PATHS ===== */
const MENU_FILE  = path.join(__dirname, "data.json");
const STOCK_FILE = path.join(__dirname, "stock.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

/* ===== HELPERS ===== */
function readJSON(file){
  if(!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
function writeJSON(file,data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}

/* ======================================================
   MENU
====================================================== */
app.get("/api/menu",(req,res)=>{
  res.json(readJSON(MENU_FILE));
});

app.post("/api/menu",(req,res)=>{
  const menu = readJSON(MENU_FILE);
  const { name, price, cat, qty } = req.body;

  menu.push({ name, price, cat });
  writeJSON(MENU_FILE, menu);

  // Ус / Ундаа / Цай бол stock-д нэмнэ
  if(["Ус","Ундаа","Цай"].includes(cat)){
    const stock = readJSON(STOCK_FILE);
    stock.push({ name, qty: qty || 0 });
    writeJSON(STOCK_FILE, stock);
  }

  res.json({ok:true});
});

app.delete("/api/menu/:name",(req,res)=>{
  const name = req.params.name;

  writeJSON(
    MENU_FILE,
    readJSON(MENU_FILE).filter(x=>x.name!==name)
  );

  writeJSON(
    STOCK_FILE,
    readJSON(STOCK_FILE).filter(x=>x.name!==name)
  );

  res.json({ok:true});
});

/* ======================================================
   STOCK
====================================================== */
app.get("/api/stock",(req,res)=>{
  res.json(readJSON(STOCK_FILE));
});

/* ======================================================
   ORDER  (WAITER → PRINT → SAVE)
====================================================== */
app.post("/api/order",(req,res)=>{
  const { table, items, total, time } = req.body;
  if(!table || !items) return res.status(400).json({error:"bad order"});

  // Save order
  const orders = readJSON(ORDERS_FILE);
  orders.push({ table, items, total, time });
  writeJSON(ORDERS_FILE, orders);

  // Reduce stock
  let stock = readJSON(STOCK_FILE);
  items.forEach(i=>{
    const s = stock.find(x=>x.name===i.name);
    if(s){
      s.qty -= i.qty;
      if(s.qty < 0) s.qty = 0;
    }
  });
  writeJSON(STOCK_FILE, stock);

  res.json({ok:true});
});

/* ======================================================
   ADMIN REALTIME SETTLEMENT
====================================================== */
app.get("/api/admin-settlement",(req,res)=>{
  const orders = readJSON(ORDERS_FILE);
  const map = {};

  orders.forEach(o=>{
    o.items.forEach(i=>{
      if(!map[i.name]) map[i.name]={qty:0,sum:0};
      map[i.name].qty += i.qty;
      map[i.name].sum += i.qty * i.price;
    });
  });

  res.json(map);
});

/* ======================================================
   WAITER SETTLEMENT PRINT
====================================================== */
app.get("/api/settlement",(req,res)=>{
  const orders = readJSON(ORDERS_FILE);
  const map = {};

  orders.forEach(o=>{
    o.items.forEach(i=>{
      if(!map[i.name]) map[i.name]={qty:0,sum:0};
      map[i.name].qty += i.qty;
      map[i.name].sum += i.qty * i.price;
    });
  });

  res.json(map);
});

/* ======================================================
   RESET SETTLEMENT (ADMIN)
====================================================== */
app.post("/api/settlement/reset",(req,res)=>{
  writeJSON(ORDERS_FILE, []);
  res.json({ok:true});
});

/* ====================================================== */
app.listen(PORT,()=>{
  console.log("✅ Saikhan POS running on port",PORT);
});

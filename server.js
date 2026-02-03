const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const MENU_FILE = path.join(__dirname, "data.json");
const STOCK_FILE = path.join(__dirname, "stock.json");

/* ===== UTIL ===== */
function readJSON(file){
  if(!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
function writeJSON(file,data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}

/* ===== MENU ===== */
app.get("/api/menu",(req,res)=>{
  res.json(readJSON(MENU_FILE));
});

app.post("/api/menu",(req,res)=>{
  const menu = readJSON(MENU_FILE);
  menu.push(req.body);
  writeJSON(MENU_FILE, menu);
  res.json({ok:true});
});

app.delete("/api/menu/:name",(req,res)=>{
  let menu = readJSON(MENU_FILE);
  menu = menu.filter(m=>m.name!==req.params.name);
  writeJSON(MENU_FILE, menu);
  res.json({ok:true});
});

/* ===== STOCK ===== */
app.get("/api/stock",(req,res)=>{
  res.json(readJSON(STOCK_FILE));
});

/* ===== ORDER (STOCK ХАСНА) ===== */
app.post("/api/order",(req,res)=>{
  const { items } = req.body;
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

/* ===== SETTLEMENT (placeholder) ===== */
app.post("/api/settlement",(req,res)=>{
  res.json({ok:true});
});

app.listen(PORT,()=>{
  console.log("✅ Saikhan POS running on port", PORT);
});

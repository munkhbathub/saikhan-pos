const express = require("express");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// ===== FILE PATHS =====
const DATA_FILE = path.join(__dirname, "data.json");
const STOCK_FILE = path.join(__dirname, "stock.json");
const SETTLEMENT_FILE = path.join(__dirname, "settlements.json");

// ===== JSON HELPERS =====
function readJSON(file){
  if(!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
function writeJSON(file,data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}

// ===== MENU =====
app.get("/api/menu",(req,res)=>{
  const data = readJSON(DATA_FILE);
  res.json(data.menu || []);
});

app.post("/api/menu",(req,res)=>{
  const data = readJSON(DATA_FILE) || {};
  if(!data.menu) data.menu = [];

  data.menu.push(req.body);

  let stock = readJSON(STOCK_FILE);

  if(["Ус","Ундаа","Цай"].includes(req.body.cat)){
    stock.push({name:req.body.name, qty:req.body.qty});
    writeJSON(STOCK_FILE, stock);
  }

  writeJSON(DATA_FILE, data);
  res.json({ok:true});
});

// ===== ORDER =====
app.post("/api/order",(req,res)=>{
  const data = readJSON(DATA_FILE) || {};
  if(!req.body.table) return res.status(400).json({err:"table"});

  if(!data.orders) data.orders = [];
  data.lastBill = (data.lastBill || 0) + 1;

  let stock = readJSON(STOCK_FILE);

  req.body.items.forEach(i=>{
    const s = stock.find(x=>x.name===i.name);
    if(s){
      s.qty -= i.qty;
      if(s.qty<0) s.qty=0;
    }
  });

  writeJSON(STOCK_FILE, stock);

  data.orders.push({
    bill:data.lastBill,
    table:req.body.table,
    items:req.body.items,
    total:req.body.total,
    time:req.body.time || new Date().toISOString()
  });

  writeJSON(DATA_FILE, data);

  res.json({bill:data.lastBill});
});

// ===== SETTLEMENT (32 DAY SAVE) =====
app.post("/api/settlement",(req,res)=>{
  const data = readJSON(DATA_FILE) || {};
  if(!data.orders || data.orders.length === 0){
    return res.json({});
  }

  const map = {};
  let total = 0;

  data.orders.forEach(o=>{
    o.items.forEach(i=>{
      if(!map[i.name]){
        map[i.name] = { qty:0, sum:0 };
      }
      map[i.name].qty += i.qty;
      map[i.name].sum += i.qty * i.price;
      total += i.qty * i.price;
    });
  });

  const today = new Date().toISOString().slice(0,10);

  let settlements = readJSON(SETTLEMENT_FILE);

  settlements.push({
    date: today,
    items: map,
    total: total
  });

  if(settlements.length > 32){
    settlements = settlements.slice(settlements.length - 32);
  }

  writeJSON(SETTLEMENT_FILE, settlements);

  data.orders = [];
  writeJSON(DATA_FILE, data);

  res.json(map);
});

// ===== EXPORT EXCEL =====
app.get("/api/settlements/excel",(req,res)=>{
  if(!fs.existsSync(SETTLEMENT_FILE)){
    return res.status(404).send("No settlements");
  }

  const settlements = readJSON(SETTLEMENT_FILE);

  const rows = [];

  settlements.forEach(day=>{
    Object.keys(day.items).forEach(name=>{
      rows.push({
        Огноо: day.date,
        Бүтээгдэхүүн: name,
        Тоо: day.items[name].qty,
        Дүн: day.items[name].sum
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "32 хоног");

  const filePath = path.join(__dirname,"settlements.xlsx");
  XLSX.writeFile(wb, filePath);

  res.download(filePath,"Saikhan_POS_32_хоног.xlsx");
});

app.listen(PORT,()=>console.log("Saikhan POS running on port",PORT));

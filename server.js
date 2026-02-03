const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// Файлууд
const DATA_FILE = path.join(__dirname, "data.json");
const STOCK_FILE = path.join(__dirname, "stock.json");
const SETTLEMENT_FILE = path.join(__dirname, "settlements.json");

// JSON унших/хадгалах
function readJSON(file){
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,"utf8")) : [];
}
function writeJSON(file, data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}

// ===== MENU =====
app.get("/api/menu",(req,res)=>{
  const data = readJSON(DATA_FILE);
  res.json(data.menu || []);
});

app.post("/api/menu",(req,res)=>{
  const data = readJSON(DATA_FILE);
  if(!data.menu) data.menu = [];
  data.menu.push(req.body);

  // stock.json-д хадгалах
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
  const data = readJSON(DATA_FILE);
  if(!req.body.table) return res.status(400).json({err:"table"});
  if(!data.orders) data.orders = [];
  data.lastBill = (data.lastBill || 0) + 1;

  // stock update
  let stock = readJSON(STOCK_FILE);
  req.body.items.forEach(i=>{
    const s = stock.find(x=>x.name===i.name);
    if(s){
      s.qty -= i.qty;
      if(s.qty<0) s.qty=0;
    }
  });
  writeJSON(STOCK_FILE, stock);

  // order хадгалах
  data.orders.push({
    bill: data.lastBill,
    table: req.body.table,
    items: req.body.items,
    total: req.body.total,
    time: req.body.time || new Date().toISOString()
  });
  writeJSON(DATA_FILE, data);

  res.json({bill:data.lastBill});
});

// ===== SETTLEMENT =====
app.post("/api/settlement",(req,res)=>{
  const data = readJSON(DATA_FILE);
  const settlements = readJSON(SETTLEMENT_FILE);

  // Өнөөдрийн нэгтгэл
  const today = new Date().toISOString().split("T")[0];
  let todaySettlement = {};

  (data.orders || []).forEach(o=>{
    o.items.forEach(i=>{
      if(!todaySettlement[i.name]) todaySettlement[i.name] = {qty:0,sum:0};
      todaySettlement[i.name].qty += i.qty;
      todaySettlement[i.name].sum += i.qty*i.price;
    });
  });

  // 32 өдрийн хадгалах: хуучин 32-ийг хасна
  settlements.push({date: today, data: todaySettlement});
  if(settlements.length>32) settlements.shift();

  writeJSON(SETTLEMENT_FILE, settlements);

  // orders цэвэрлэх
  data.orders = [];
  writeJSON(DATA_FILE, data);

  res.json({ok:true, today:todaySettlement});
});

app.get("/api/settlements",(req,res)=>{
  const settlements = readJSON(SETTLEMENT_FILE);
  res.json(settlements);
});

// ===== EXPORT EXCEL =====
const XLSX = require("xlsx");
app.get("/api/settlements/excel",(req,res)=>{
  const settlements = readJSON(SETTLEMENT_FILE);

  const wb = XLSX.utils.book_new();

  settlements.forEach(s=>{
    const wsData = [["Нэр","Тоо","Нийт"]];
    Object.keys(s.data).forEach(k=>{
      wsData.push([k, s.data[k].qty, s.data[k].sum]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, s.date);
  });

  const filePath = path.join(__dirname, "settlements.xlsx");
  XLSX.writeFile(wb, filePath);

  res.download(filePath);
});

app.listen(PORT,()=>console.log("Saikhan POS running on port",PORT));

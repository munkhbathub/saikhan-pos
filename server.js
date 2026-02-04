const XLSX = require("xlsx");

const path = require("path");

const SETTLEMENT_FILE = path.join(__dirname, "settlements.json");

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
  const d = load();
  if(d.orders.length === 0){
    return res.json({});
  }

  // ===== Нэгтгэл тооцоолох =====
  const map = {};
  let total = 0;

  d.orders.forEach(o=>{
    o.items.forEach(i=>{
      if(!map[i.name]){
        map[i.name] = { qty:0, sum:0 };
      }
      map[i.name].qty += i.qty;
      map[i.name].sum += i.qty * i.price;
      total += i.qty * i.price;
    });
  });

  const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD

  // ===== settlements.json унших =====
  let settlements = [];
  if(fs.existsSync(SETTLEMENT_FILE)){
    settlements = JSON.parse(fs.readFileSync(SETTLEMENT_FILE,"utf8"));
  }

  // ===== Шинэ өдөр нэмэх =====
  settlements.push({
    date: today,
    items: map,
    total: total
  });

  // ===== 32 хоногоос их бол хуучныг устгах =====
  if(settlements.length > 32){
    settlements = settlements.slice(settlements.length - 32);
  }

  fs.writeFileSync(
    SETTLEMENT_FILE,
    JSON.stringify(settlements,null,2)
  );

  // ===== Orders цэвэрлэх =====
  d.orders = [];
  save(d);

  res.json(map); // waiter-д хэвлэхэд буцаана
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

app.get("/api/settlements/excel",(req,res)=>{
  if(!fs.existsSync(SETTLEMENT_FILE)){
    return res.status(404).send("No settlements");
  }

  const settlements = JSON.parse(
    fs.readFileSync(SETTLEMENT_FILE,"utf8")
  );

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




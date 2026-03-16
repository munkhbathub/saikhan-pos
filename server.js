const express = require("express");
const fs = require("fs");
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

app.get("/api/admin/chart",(req,res)=>{
  const orders = readJSON(ORDERS_FILE);

  let map={};

  orders.forEach(o=>{
    const hour = new Date(o.time).getHours();
    if(!map[hour]) map[hour]=0;
    map[hour]+=o.total;
  });

  res.json(map);
});
// ===== EXPORT BORLUULALT EXCEL =====
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

app.get("/api/admin/export", (req, res) => {
  // settlements.json унших
  const settlements = fs.existsSync(SETTLEMENT_FILE) 
      ? JSON.parse(fs.readFileSync(SETTLEMENT_FILE, "utf8"))
      : [];

  // Excel-д хийх мэдээллийг бүрдүүлэх
  const rows = [];
  settlements.forEach(day => {
    Object.keys(day.items).forEach(name => {
      rows.push({
        Огноо: day.date,
        Бүтээгдэхүүн: name,
        Тоо: day.items[name].qty,
        Дүн: day.items[name].sum
      });
    });
  });

  // Excel workbook үүсгэх
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Борлуулалт");

  // Файлыг сервер дээр хадгалах
  const filePath = path.join(__dirname, "settlements.xlsx");
  XLSX.writeFile(wb, filePath);

  // Файлыг татах боломж олгох
  res.download(filePath, "Saikhan_POS_Borluulalt.xlsx");
});

app.get("/api/admin/report",(req,res)=>{
  const orders = readJSON(ORDERS_FILE);
  const now = new Date();

  let week=0, month=0;

  orders.forEach(o=>{
    const d = new Date(o.time);
    const diffDays = (now-d)/(1000*60*60*24);

    if(diffDays<=7) week+=o.total;
    if(d.getMonth()===now.getMonth()) month+=o.total;
  });

  res.json({week,month});
});

app.get("/api/admin/export",(req,res)=>{
  const orders = readJSON(ORDERS_FILE);

  let csv="Table,Total,Time\n";
  orders.forEach(o=>{
    csv+=`${o.table},${o.total},${o.time}\n`;
  });

  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition","attachment; filename=sales.csv");
  res.send(csv);
});

const fs = require("fs");

function saveStock(stock){
  fs.writeFileSync("stock.json", JSON.stringify(stock,null,2));
}

// ===== FILE PATHS =====
const DATA_FILE = "data.json";
const STOCK_FILE = "stock.json";
const ORDERS_FILE = "orders.json";
const SETTLE_FILE = "settlements.json";

// ===== SIMPLE ADMIN LOGIN =====
const ADMIN_USER = "adminbill";
const ADMIN_PASS = "saikhan1234";

app.post("/api/admin/login",(req,res)=>{
  const {username,password} = req.body;
  if(username===ADMIN_USER && password===ADMIN_PASS){
    res.json({ok:true});
  } else {
    res.json({ok:false});
  }
});

// ===== READ JSON =====
function readJSON(path){
  if(!fs.existsSync(path)) fs.writeFileSync(path,"[]");
  return JSON.parse(fs.readFileSync(path));
}
app.get("/api/admin/today",(req,res)=>{
  const orders = readJSON(ORDERS_FILE);

  let total = 0;
  orders.forEach(o=> total += o.total);

  res.json({
    count: orders.length,
    total: total
  });
});
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

  newOrder.items.forEach(item=>{
    const menuData = readJSON(DATA_FILE).menu;
    const m = menuData.find(x=>x.name===item.name);

    if(["Ус","Ундаа","Цай"].includes(m.cat)){
      const s = stock.find(x=>x.name===item.name);
      if(s){
        s.qty -= item.qty;
        if(s.qty < 0) s.qty = 0;
      }
    }
  });

  orders.push(newOrder);
  writeJSON(ORDERS_FILE,orders);
  writeJSON(STOCK_FILE,stock);

  res.json({ok:true});
});
// GET STOCK
app.get("/api/admin/stock",(req,res)=>{
  res.json(readJSON(STOCK_FILE));
});

// UPDATE STOCK
app.post("/api/admin/stock",(req,res)=>{
  const stock = readJSON(STOCK_FILE);
  const {name, qty} = req.body;

  const s = stock.find(x=>x.name===name);
  if(s){
    s.qty += Number(qty);
  }

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






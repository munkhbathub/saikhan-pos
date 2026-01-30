const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("."));

const FILE = "./data.json";
const read = () => JSON.parse(fs.readFileSync(FILE));
const write = d => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));

app.get("/data",(req,res)=>res.json(read()));

/* ADMIN */
app.post("/menu/add",(req,res)=>{
  const d=read();
  d.menu.push(req.body);
  write(d); res.sendStatus(200);
});

/* WAITER – ОРЛОГО (зөвхөн нэмэх) */
app.post("/income",(req,res)=>{
  const d=read();
  const {type,name,qty}=req.body;
  let arr=d.inventory[type];
  let f=arr.find(i=>i.name===name);
  if(f) f.qty+=qty;
  else arr.push({name,qty});
  write(d); res.sendStatus(200);
});

/* БОРЛУУЛАЛТ */
app.post("/bill",(req,res)=>{
  const d=read();
  const bill=req.body;
  bill.no=d.billNo++;
  d.bills.push(bill);

  bill.items.forEach(it=>{
    ["water","drink","tea"].forEach(t=>{
      const f=d.inventory[t].find(x=>x.name===it.name);
      if(f) f.qty-=it.qty;
    });
  });

  write(d); res.json(bill);
});

/* НЭГТГЭЛ */
app.post("/settlement",(req,res)=>{
  const d=read();
  d.settlements.push({
    date:new Date().toLocaleString(),
    bills:d.bills
  });
  d.bills=[];
  write(d); res.sendStatus(200);
});

app.listen(3000,()=>console.log("Saikhan POS running"));

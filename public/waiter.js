let menu = [], stock = [], order = [], table = null, bill = 0;
const info = document.getElementById("info");

// ===== LOAD MENU & STOCK =====
async function load() {
  menu = await fetch("/api/menu").then(r => r.json());
  stock = await fetch("/api/stock").then(r => r.json());
  drawTables();
  drawMenu();
  drawOrder();
}
load();

// ===== TABLES =====
function drawTables() {
  const tables = document.getElementById("tables");
  tables.innerHTML = "";
  ["1","2","3","4","5","6","7","8","9","VIP1","VIP2"].forEach(t=>{
    const b = document.createElement("button");
    b.textContent = t;
    b.onclick = () => { 
      table = t; 
      info.innerText = `Ширээ: ${t} | Bill: ${bill+1}`; 
    };
    tables.appendChild(b);
  });
}

// ===== MENU =====
function drawMenu() {
  const menuDiv = document.getElementById("menu");
  menuDiv.innerHTML = "";
  menu.forEach(m => {
    const s = stock.find(x => x.name === m.name);
    const qty = s ? s.qty : "-";
    const outOfStock = (["Ус","Ундаа","Цай"].includes(m.cat) && qty === 0);

    const card = document.createElement("div");
    card.className = "card" + (outOfStock ? " out" : "");
    card.innerHTML = `<b>${m.name}</b><br>${m.price}₮<br>Үлд: ${qty}`;
    card.onclick = () => {
      if(outOfStock) return;
      addToOrder(m);
    };
    menuDiv.appendChild(card);
    function drawMenu(){
  const menuDiv = document.getElementById("menu");
  menuDiv.innerHTML="";

  menu.forEach(m=>{

    const s = stock.find(x=>x.name===m.name);
    const qty = s ? s.qty : 0;

    let cls = "card";

    if(qty === 0){
      cls += " out";
    }else if(qty <= 10){
      cls += " low";
    }

    const d = document.createElement("div");
    d.className = cls;

    d.innerHTML = `
      <b>${m.name}</b><br>
      ${m.price}₮<br>
      Үлд: ${qty}
    `;

    if(qty > 0){
      d.onclick = ()=> addToOrder(m);
    }

    menuDiv.appendChild(d);

  });
}
  });
}

// ===== ORDER =====
function drawOrder() {
  const orderDiv = document.getElementById("order");
  orderDiv.innerHTML = "";
  let total = 0;
  order.forEach((o,i) => {
    const row = document.createElement("div");
    row.className = "order-row";
    row.innerHTML = `
      ${o.name} x ${o.qty} = ${o.price*o.qty}₮
      <button onclick="inc(${i})">+</button>
      <button onclick="dec(${i})">-</button>
      <button onclick="remove(${i})">❌</button>
    `;
    orderDiv.appendChild(row);
    total += o.price * o.qty;
  });
  document.getElementById("total").innerText = total;
}

// ===== ORDER ACTIONS =====
function addToOrder(item) {
  const existing = order.find(x => x.name === item.name);
  if(existing){
    existing.qty++;
  } else {
    order.push({name:item.name, price:item.price, qty:1, cat:item.cat});
  }
  drawOrder();
}

function inc(i){ order[i].qty++; drawOrder(); }
function dec(i){ 
  order[i].qty--; 
  if(order[i].qty <= 0) order.splice(i,1); 
  drawOrder(); 
}
function remove(i){ order.splice(i,1); drawOrder(); }

// ===== SEND ORDER =====
async function sendOrder() {
  if(!table || order.length===0){ alert("Ширээ болон захиалга сонгоно уу"); return; }

  const total = order.reduce((s,o)=>s+o.price*o.qty,0);

  const res = await fetch("/api/order",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      table, items: order, total, time: new Date().toISOString()
    })
  }).then(r=>r.json());

  bill = res.bill || bill;

  // ===== UPDATE STOCK =====
  order.forEach(o=>{
    if(["Ус","Ундаа","Цай"].includes(o.cat)){
      const s = stock.find(x=>x.name===o.name);
      if(s) s.qty -= o.qty;
    }
  });
  drawMenu();
  drawOrder();
  order = [];
  alert("✔ Захиалга хадгалагдлаа");
}

// ===== SETTLEMENT =====
async function settle() {
  let data;
  try {
    const res = await fetch("/api/settlement",{method:"POST"});
    data = await res.json();
  } catch(e){ alert("Нэгтгэл ачааллахад алдаа гарлаа"); return; }

  if(!data || Object.keys(data).length===0){ alert("Нэгтгэх захиалга алга"); return; }

  let html = `<div class="print-area"><h3>📊 ӨДРИЙН НЭГТГЭЛ</h3><hr>`;
  let total = 0;
  Object.keys(data).forEach(name=>{
    html += `<p><b>${name}</b><br>${data[name].qty} ширхэг = ${data[name].sum}₮</p>`;
    total += data[name].sum;
  });
  html += `<hr><b>НИЙТ: ${total}₮</b></div>`;

  const p = document.getElementById("print-cash");
  p.innerHTML = html;
  p.style.left = "0";

  setTimeout(()=>{
    window.print();
    p.style.left = "-9999px";
  },100);
}

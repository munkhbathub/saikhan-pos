let menu=[], stock=[], order=[], table=null, bill=0;
const info = document.getElementById("info");

// ===== LOAD DATA =====
async function load(){
  try {
    menu = await fetch("/api/menu").then(r=>r.json());
    stock = await fetch("/api/stock").then(r=>r.json());
    drawTables();
    drawMenu();
    drawOrder();
  } catch(e) {
    alert("Menu болон stock ачаалахад алдаа гарлаа");
  }
}
load();

// ===== TABLES =====
function drawTables(){
  const tables = document.getElementById("tables");
  tables.innerHTML="";
  ["0","1","2","3","4","5","6","7","8","9","VIP Наад","VIP Цаад","Авч явах"].forEach(t=>{
    const b = document.createElement("button");
    b.textContent = t;
    b.onclick = ()=>{ table=t; info.innerText=`Ширээ: ${t} | Bill: ${bill+1}`; };
    tables.appendChild(b);
  });
}

// ===== MENU =====
function drawMenu(){
  const menuDiv = document.getElementById("menu");
  menuDiv.innerHTML="";
  menu.forEach(m=>{
    const s = stock.find(x=>x.name===m.name);
    const q = s ? s.qty : "-";
    const outOfStock = (["Ус","Ундаа","Цай"].includes(m.cat) && q === 0);
    const d = document.createElement("div");
    d.className = "card" + (q !== "-" && q < 10 ? " low" : "");
    if(outOfStock) d.classList.add("out");
    d.innerHTML = `<b>${m.name}</b><br>${m.price}₮<br>Үлд:${q}`;
    if(!outOfStock) d.onclick = ()=>addItem(m);
    menuDiv.appendChild(d);
  });
}

// ===== ORDER =====
function addItem(m){
  if(!table){ alert("Ширээ сонгоно уу"); return; }
  const s = stock.find(x=>x.name===m.name);
  if(["Ус","Ундаа","Цай"].includes(m.cat) && s && s.qty===0){
    alert("Үлдэгдэл дууссан тул захиалагдах боломжгүй");
    return;
  }
  const i = order.find(x=>x.name===m.name);
  i ? i.qty++ : order.push({name:m.name, price:m.price, qty:1});
  drawOrder();
}

function drawOrder(){
  const d = document.getElementById("order");
  d.innerHTML="";
  let total=0;
  order.forEach((i,idx)=>{
    const sum = i.price*i.qty;
    total += sum;
    const r = document.createElement("div");
    r.className="order-row";
    r.innerHTML = `
      <div><b>${i.name}</b><br>${i.price}₮ × ${i.qty} = <b>${sum}₮</b></div>
      <div>
        <button onclick="chgQty(${idx},-1)">➖</button>
        <button onclick="chgQty(${idx},1)">➕</button>
        <button onclick="delItem(${idx})">❌</button>
      </div>
    `;
    d.appendChild(r);
  });
  document.getElementById("total").textContent = total;
}

function chgQty(i,delta){
  order[i].qty += delta;
  if(order[i].qty<=0) order.splice(i,1);
  drawOrder();
}

function delItem(i){
  order.splice(i,1);
  drawOrder();
}

// ===== SEND ORDER =====
async function sendOrder(){
  if(!table || order.length===0){ alert("Ширээ болон захиалга сонгоно уу"); return; }
  const now = new Date().toISOString();
  let totalSum=0;
  order.forEach(i=> totalSum += i.qty*i.price );

  // Хадгалах
  await fetch("/api/order",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ table, items:order, total:totalSum, time:now })
  });

  alert("✔ Захиалга хадгалагдлаа");
  order=[]; table=null;
  drawOrder(); drawTables();
}

// ===== SETTLEMENT (ӨДРИЙН НЭГТГЭЛ ХЭВЛЭХ) =====
async function settle(){
  let data;
  try{
    const res = await fetch("/api/settlement",{method:"POST"});
    data = await res.json();
  }catch(e){
    alert("Нэгтгэл ачааллахад алдаа гарлаа");
    return;
  }

  if(!data || Object.keys(data).length===0){
    alert("Нэгтгэх захиалга алга");
    return;
  }

  let html = `<div class="print-area">
    <h3>📊 ӨДРИЙН НЭГТГЭЛ</h3><hr>`;
  let total = 0;

  Object.keys(data).forEach(name=>{
    html += `<p>
      <b>${name}</b><br>
      ${data[name].qty} ширхэг = ${data[name].sum}₮
    </p>`;
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

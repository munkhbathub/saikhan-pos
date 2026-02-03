// ===== SETTLEMENT (ӨДРИЙН НЭГТГЭЛ ХЭВЛЭХ) =====
async function settle(){
  let data;
  try{
    const res = await fetch("/api/settlement", { method:"POST" });
    data = await res.json();
  }catch(e){
    alert("Нэгтгэл ачааллахад алдаа гарлаа");
    return;
  }

  if(!data || Object.keys(data).length === 0){
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

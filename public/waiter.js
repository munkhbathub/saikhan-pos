async function settle(){
  const settlements = await fetch("/api/settlement",{method:"POST"}).then(r=>r.json());

  let html = `<h3>📊 НЭГТГЭЛ</h3><hr>`;
  let total = 0;
  Object.keys(settlements.today).forEach(k=>{
    html += `<p>${k}<br>${settlements.today[k].qty} ширхэг = ${settlements.today[k].sum}₮</p>`;
    total += settlements.today[k].sum;
  });
  html += `<hr><b>НИЙТ: ${total}₮</b>`;

  const p = document.getElementById("print-cash");
  p.innerHTML = html;
  p.style.left = "0";
  window.print();
  p.style.left = "-9999px";
}

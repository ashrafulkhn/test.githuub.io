function calculate() {
  const purchasePrice = parseFloat(document.getElementById('purchasePrice').value);
  const quantity = parseFloat(document.getElementById('quantity').value);
  const billingPart = parseFloat(document.getElementById('billingPart').value) / 100;
  const gst = parseFloat(document.getElementById('gst').value) / 100;
  const cess = parseFloat(document.getElementById('cess').value) / 100;
  const profit = parseFloat(document.getElementById('profit').value) / 100;

  // Calculations
  const billedBasic = purchasePrice * billingPart;
  const unbilledBasic = purchasePrice * (1 - billingPart);
  const gstOnBilled = billedBasic * gst;
  const cessOnBilled = billedBasic * cess;
  const totalLandingPricePerUnit = billedBasic + unbilledBasic + gstOnBilled + cessOnBilled;

  const noSeparationPrice = purchasePrice + (purchasePrice * gst) + (purchasePrice * cess);
  const differenceAmount = totalLandingPricePerUnit - noSeparationPrice;

  // Calculate Sell Basic Price (excluding GST and CESS)
  const sellBasicPrice = totalLandingPricePerUnit / (1 + gst + cess);

  // Calculate Sale Price (Sell Basic Price + Margin + GST + CESS)
  const salePricePerUnit = sellBasicPrice * (1 + profit) * (1 + gst + cess);

  const profitPerCartoon = salePricePerUnit - totalLandingPricePerUnit;
  const totalProfit = profitPerCartoon * quantity;

  // Total values (price × quantity)
  const totalLandingPrice = totalLandingPricePerUnit * quantity;
  const totalSellingPrice = salePricePerUnit * quantity;

  // Display results in the table
  const resultTable = document.getElementById('resultTable');
  resultTable.innerHTML = `
    <tr><td>Billed Basic (A)</td><td>${billedBasic.toFixed(2)}</td></tr>
    <tr><td>Unbilled Basic (B)</td><td>${unbilledBasic.toFixed(2)}</td></tr>
    <tr><td>GST on Billed Basic (C)</td><td>${gstOnBilled.toFixed(2)}</td></tr>
    <tr><td>CESS on Billed Basic (D)</td><td>${cessOnBilled.toFixed(2)}</td></tr>
    <tr><td>Total Landing Price (E) (Per Unit)</td><td>${totalLandingPricePerUnit.toFixed(2)}</td></tr>
    <tr><td>Price without Separation</td><td>${noSeparationPrice.toFixed(2)}</td></tr>
    <tr><td>Difference Amount</td><td>${differenceAmount.toFixed(2)}</td></tr>
    <tr><td>Sell Basic Price</td><td>${sellBasicPrice.toFixed(2)}</td></tr>
    <tr><td>Sale Price (Per Unit)</td><td>${salePricePerUnit.toFixed(2)}</td></tr>
    <tr><td>Profit per Cartoon</td><td>${profitPerCartoon.toFixed(2)}</td></tr>
  `;

  // Display summary in a different color
  const summary = document.getElementById('summary');
  summary.innerHTML = `
    <h2>Summary</h2>
    <p><strong>Total Landing Price:</strong> ${totalLandingPrice.toFixed(2)}</p>
    <p><strong>Total Selling Price:</strong> ${totalSellingPrice.toFixed(2)}</p>
    <p><strong>Profit Per Cartoon:</strong> ${profitPerCartoon.toFixed(2)}</p>
    <p><strong>Total Profit:</strong> ${totalProfit.toFixed(2)}</p>
  `;
}
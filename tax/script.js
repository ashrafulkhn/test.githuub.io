document.getElementById("taxForm").addEventListener("submit", function(event) {
    event.preventDefault();

    let income = parseFloat(document.getElementById("income").value);
    let deductions = parseFloat(document.getElementById("deductions").value) || 0;

    if (income < 0 || deductions < 0) {
        alert("Income and Deductions must be non-negative.");
        return;
    }

    let regime1Tax = calculateRegime1Tax(income - deductions);
    let regime2Tax = calculateRegime2Tax(income);
    let regime3Tax = calculateRegime3Tax(income);

    let bestRegime = Math.min(regime1Tax, regime2Tax, regime3Tax);
    let bestRegimeText = bestRegime === regime1Tax ? "Regime 1 (Old)" :
                         bestRegime === regime2Tax ? "Regime 2 (New)" :
                         "Regime 3 (New)";

    document.getElementById("result").innerHTML = `
        <h3>Tax Calculation Result</h3>
        <p><strong>Regime 1 (Old Tax Regime):</strong> ₹${regime1Tax.toLocaleString()}</p>
        <p><strong>Regime 2 (New Tax Regime 1):</strong> ₹${regime2Tax.toLocaleString()}</p>
        <p><strong>Regime 3 (New Tax Regime 2):</strong> ₹${regime3Tax.toLocaleString()}</p>
        <h4>Most Tax-Efficient Regime: ${bestRegimeText}</h4>
    `;
});

function calculateRegime1Tax(income) {
    if (income <= 500000) return 0;  // Tax rebate for income up to ₹5,00,000

    let tax = 0;
    if (income > 1000000) tax += (income - 1000000) * 0.30, income = 1000000;
    if (income > 500000) tax += (income - 500000) * 0.20, income = 500000;
    if (income > 250000) tax += (income - 250000) * 0.05;

    return tax;
}

function calculateRegime2Tax(income) {
    if (income <= 700000) return 0;  // Tax rebate for income up to ₹7,00,000

    let tax = 0;
    if (income > 1500000) tax += (income - 1500000) * 0.30, income = 1500000;
    if (income > 1200000) tax += (income - 1200000) * 0.20, income = 1200000;
    if (income > 1000000) tax += (income - 1000000) * 0.15, income = 1000000;
    if (income > 700000) tax += (income - 700000) * 0.10, income = 700000;
    if (income > 300000) tax += (income - 300000) * 0.05;

    return tax;
}

function calculateRegime3Tax(income) {
    if (income <= 1200000) return 0;  // Tax rebate for income up to ₹12,00,000

    let tax = 0;
    if (income > 2400000) tax += (income - 2400000) * 0.30, income = 2400000;
    if (income > 2000000) tax += (income - 2000000) * 0.25, income = 2000000;
    if (income > 1600000) tax += (income - 1600000) * 0.20, income = 1600000;
    if (income > 1200000) tax += (income - 1200000) * 0.15, income = 1200000;
    if (income > 800000) tax += (income - 800000) * 0.10, income = 800000;
    if (income > 400000) tax += (income - 400000) * 0.05;

    return tax;
}

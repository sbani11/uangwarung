import { loadFromFirebase, saveToFirebase } from './firebase.js';

export const pockets = [
  "Dagangan Sembako",
  "Uang BCA",
  "Uang BRI",
  "Uang Bank Lain",
  "Griyabayar",
  "Pulsa/Paket"
];

window.state = JSON.parse(localStorage.getItem('warungState')) || {
  saldo: {}, riwayat: []
};

pockets.forEach(name => {
  if (window.state.saldo[name] === undefined) window.state.saldo[name] = 0;
});

window.saveState = function() {
  localStorage.setItem('warungState', JSON.stringify(window.state));
  saveToFirebase(window.state);
}

window.updatePocket = function(name) {
  const input = document.getElementById(`input-${name}`);
  const value = parseFloat(input.value);
  if (!isNaN(value)) {
    window.state.saldo[name] += value;
    window.state.riwayat.push({
      pocket: name,
      jumlah: value,
      waktu: new Date().toISOString()
    });
    saveState();
    renderPockets();
  }
}

window.resetPocket = function(name) {
  if (confirm(`Reset saldo "${name}" ke Rp 0? Riwayat akan tetap disimpan.`)) {
    const selisih = -window.state.saldo[name];
    window.state.saldo[name] = 0;
    window.state.riwayat.push({
      pocket: name,
      jumlah: selisih,
      waktu: new Date().toISOString()
    });
    saveState();
    renderPockets();
  }
}

window.transferAntarPocket = function() {
  const from = document.getElementById('transferFrom').value;
  const to = document.getElementById('transferTo').value;
  const amount = parseFloat(document.getElementById('transferAmount').value);

  if (!from || !to || from === to) {
    alert("Pilih pocket asal dan tujuan yang berbeda.");
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    alert("Masukkan jumlah yang valid.");
    return;
  }
  if (window.state.saldo[from] < amount) {
    alert("Saldo tidak cukup di pocket asal.");
    return;
  }

  window.state.saldo[from] -= amount;
  window.state.saldo[to] += amount;

  const now = new Date().toISOString();
  window.state.riwayat.push({ pocket: from, jumlah: -amount, waktu: now });
  window.state.riwayat.push({ pocket: to, jumlah: amount, waktu: now });

  saveState();
  renderPockets();
  document.getElementById('transferAmount').value = '';
}

window.renderPockets = function() {
  const container = document.getElementById('pocketContainer');
  const filter = document.getElementById('filterDate').value;
  container.innerHTML = '';

  const fromSelect = document.getElementById('transferFrom');
  const toSelect = document.getElementById('transferTo');
  fromSelect.innerHTML = '<option disabled selected>Dari Pocket</option>';
  toSelect.innerHTML = '<option disabled selected>Ke Pocket</option>';
  pockets.forEach(p => {
    const option1 = document.createElement('option');
    option1.value = option1.textContent = p;
    const option2 = document.createElement('option');
    option2.value = option2.textContent = p;
    fromSelect.appendChild(option1);
    toSelect.appendChild(option2);
  });

  pockets.forEach(name => {
    const div = document.createElement('div');
    div.className = 'pocket';
    const saldo = window.state.saldo[name];
    const inputId = `input-${name}`;

    const riwayat = window.state.riwayat
      .filter(r => r.pocket === name)
      .filter(r => {
        if (!filter) return true;
        return r.waktu.startsWith(filter);
      })
      .reverse();

    const riwayatHTML = riwayat.length === 0
      ? '<div class="riwayat-entry">Tidak ada transaksi.</div>'
      : riwayat.map(r => `
          <div class="riwayat-entry">
            ${new Date(r.waktu).toLocaleString()} : Rp ${r.jumlah.toLocaleString()}
          </div>`).join('');

    div.innerHTML = `
      <h3>${name}</h3>
      <p><strong>Rp ${saldo.toLocaleString()}</strong></p>
      <input type="number" id="${inputId}" placeholder="Masukkan nilai...">
      <button onclick="updatePocket('${name}')">Tambah</button>
      <button onclick="resetPocket('${name}')" style="background: orange; color: white;">Reset Saldo Pocket</button>
      <div class="riwayat">${riwayatHTML}</div>
    `;
    container.appendChild(div);
  });
}

window.downloadCSV = function() {
  let csv = 'Tanggal,Pocket,Nilai\n';
  window.state.riwayat.forEach(r => {
    csv += `"${r.waktu}","${r.pocket}",${r.jumlah}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "riwayat_uang_warung.csv");
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.resetSemuaData = function() {
  if (confirm("Yakin ingin menghapus SEMUA data dan riwayat?")) {
    localStorage.removeItem('warungState');
    location.reload();
  }
}

// Load awal dari Firebase (atau localStorage fallback)
loadFromFirebase();

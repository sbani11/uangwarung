// ====== Firebase Setup ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCMjhDLBxADuVKAXu63GaTCo-whHtgZ2s4",
  authDomain: "pocketwarungbuyusuf.firebaseapp.com",
  projectId: "pocketwarungbuyusuf",
  storageBucket: "pocketwarungbuyusuf.appspot.com",
  messagingSenderId: "43296073935",
  appId: "1:43296073935:web:7d36db866697d59c1f2fba",
  measurementId: "G-MPD31CMZPW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, "warung", "user-pribadi");

async function loadFromFirebase() {
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      localStorage.setItem('warungState', JSON.stringify(data));
      window.state = data;
      window.renderPockets();
    } else {
      window.renderPockets(); // fallback
    }
  } catch (e) {
    console.error("Gagal ambil dari Firebase:", e);
    window.renderPockets(); // fallback local
  }
}

function saveToFirebase(state) {
  setDoc(docRef, state).catch(err => {
    console.error("Gagal simpan ke Firebase:", err);
  });
}

// ====== Aplikasi Warung ======
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
  if (!window.state.saldo[name]) {
    window.state.saldo[name] = { rekening: 0, laci: 0 };
  } else {
    // migrasi data lama (jika hanya angka)
    if (typeof window.state.saldo[name] === "number") {
      window.state.saldo[name] = { rekening: window.state.saldo[name], laci: 0 };
    }
  }
});

window.saveState = function() {
  localStorage.setItem('warungState', JSON.stringify(window.state));
  saveToFirebase(window.state);
}

// ====== Transfer & Tarik Tunai ======
window.transferRekeningKeLaci = function(name) {
  const input = document.getElementById(`input-${name}`);
  const value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) return alert("Jumlah tidak valid");

  if (window.state.saldo[name].rekening < value) {
    return alert("Saldo rekening tidak cukup");
  }

  window.state.saldo[name].rekening -= value;
  window.state.saldo[name].laci += value;

  window.state.riwayat.push({
    pocket: name,
    jumlah: value,
    waktu: new Date().toISOString(),
    deskripsi: `Transfer Rekening → Laci`
  });

  saveState();
  renderPockets();
  input.value = '';
}

window.tarikTunai = function(name) {
  const input = document.getElementById(`input-${name}`);
  const value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) return alert("Jumlah tidak valid");

  if (window.state.saldo[name].laci < value) {
    return alert("Saldo laci tidak cukup");
  }

  window.state.saldo[name].laci -= value;
  window.state.saldo[name].rekening += value;

  window.state.riwayat.push({
    pocket: name,
    jumlah: value,
    waktu: new Date().toISOString(),
    deskripsi: `Tarik Tunai Laci → Rekening`
  });

  saveState();
  renderPockets();
  input.value = '';
}

// ====== Render Pockets ======
window.renderPockets = function() {
  const container = document.getElementById('pocketContainer');
  const filter = document.getElementById('filterDate').value;
  container.innerHTML = '';

  pockets.forEach(name => {
    const div = document.createElement('div');
    div.className = 'pocket';

    const saldo = window.state.saldo[name];
    if (!saldo.rekening) saldo.rekening = 0;
    if (!saldo.laci) saldo.laci = 0;

    const riwayat = window.state.riwayat
      .filter(r => r.pocket === name)
      .filter(r => !filter || r.waktu.startsWith(filter))
      .reverse();

    const riwayatHTML = riwayat.length === 0
      ? '<div class="riwayat-entry">Tidak ada transaksi.</div>'
      : riwayat.map(r => `
        <div class="riwayat-entry">
          ${new Date(r.waktu).toLocaleString()} : Rp ${r.jumlah.toLocaleString()}
          ${r.deskripsi ? ` - ${r.deskripsi}` : ''}
        </div>`).join('');

    div.innerHTML = `
      <h3>${name}</h3>
      <p><strong>Saldo Rekening: Rp ${saldo.rekening.toLocaleString()}</strong></p>
      <p><strong>Saldo Laci: Rp ${saldo.laci.toLocaleString()}</strong></p>
      <input type="number" id="input-${name}" placeholder="Masukkan jumlah...">
      <button onclick="transferRekeningKeLaci('${name}')">Transfer</button>
      <button onclick="tarikTunai('${name}')" style="background: orange; color:white;">Tarik Tunai</button>
      <div class="riwayat">${riwayatHTML}</div>
    `;
    container.appendChild(div);
  });
}

// ====== Ekspor Excel ======
window.downloadExcel = function() {
  const data = window.state.riwayat.map(r => ({
    Tanggal: new Date(r.waktu).toLocaleString(),
    Pocket: r.pocket,
    Nilai: r.jumlah,
    Deskripsi: r.deskripsi || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat");

  XLSX.writeFile(workbook, "riwayat_uang_warung.xlsx");
}

// ====== Reset Semua Data ======
window.resetSemuaData = function() {
  if (confirm("Yakin ingin menghapus SEMUA saldo? Riwayat akan tetap disimpan.")) {
    const now = new Date().toISOString();

    pockets.forEach(name => {
      const saldo = window.state.saldo[name];
      if (saldo.rekening !== 0 || saldo.laci !== 0) {
        window.state.riwayat.push({
          pocket: name,
          jumlah: -(saldo.rekening + saldo.laci),
          waktu: now,
          deskripsi: 'Reset semua data'
        });
        saldo.rekening = 0;
        saldo.laci = 0;
      }
    });

    saveState();
    renderPockets();
  }
}

window.hapusSemuaRiwayat = function() {
  if (confirm("Yakin ingin menghapus semua riwayat transaksi? Saldo akan tetap disimpan.")) {
    window.state.riwayat = [];
    saveState();
    renderPockets();
  }
}

// Load awal dari Firebase (atau localStorage fallback)
loadFromFirebase();

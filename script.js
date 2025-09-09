// ====== Firebase Setup ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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

const saldoRef = doc(db, "warung/user-pribadi/saldo/data");
const riwayatCol = collection(db, "warung/user-pribadi/riwayat");

// ====== Aplikasi Warung ======
export const pockets = [
  "Dagangan Sembako",
  "Uang BCA",
  "Uang BRI",
  "Uang Bank Lain",
  "Griyabayar",
  "Pulsa/Paket"
];

// State lokal
window.state = {
  saldo: {},
  riwayat: []
};

// Inisialisasi saldo default
pockets.forEach(name => {
  window.state.saldo[name] = { rekening: 0, laci: 0 };
});

// ====== Load Data dari Firestore ======
async function loadFromFirebase() {
  try {
    // Ambil saldo
    const snapSaldo = await getDoc(saldoRef);
    if (snapSaldo.exists()) {
      window.state.saldo = snapSaldo.data();
    }

    // Ambil riwayat
    const snapRiwayat = await getDocs(riwayatCol);
    window.state.riwayat = [];
    snapRiwayat.forEach(doc => {
      window.state.riwayat.push(doc.data());
    });

    localStorage.setItem('warungState', JSON.stringify(window.state));
    window.renderPockets();
  } catch (e) {
    console.error("Gagal load Firebase:", e);
    // fallback dari localStorage
    const saved = JSON.parse(localStorage.getItem('warungState'));
    if (saved) window.state = saved;
    window.renderPockets();
  }
}

// ====== Save ke Firestore ======
async function saveSaldo() {
  await setDoc(saldoRef, window.state.saldo);
}

async function addRiwayat(entry) {
  await addDoc(riwayatCol, entry);
}

// ====== Fungsi Tambah ======
window.tambahKeRekening = async function(name) {
  const input = document.getElementById(`input-${name}`);
  const value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) return alert("Jumlah tidak valid");

  window.state.saldo[name].rekening += value;
  const entry = {
    pocket: name,
    jumlah: value,
    waktu: new Date().toISOString(),
    deskripsi: "Tambah ke Rekening"
  };
  window.state.riwayat.push(entry);

  await saveSaldo();
  await addRiwayat(entry);

  localStorage.setItem('warungState', JSON.stringify(window.state));
  renderPockets();
  input.value = '';
}

window.tambahKeLaci = async function(name) {
  const input = document.getElementById(`input-${name}`);
  const value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) return alert("Jumlah tidak valid");

  window.state.saldo[name].laci += value;
  const entry = {
    pocket: name,
    jumlah: value,
    waktu: new Date().toISOString(),
    deskripsi: "Tambah ke Laci"
  };
  window.state.riwayat.push(entry);

  await saveSaldo();
  await addRiwayat(entry);

  localStorage.setItem('warungState', JSON.stringify(window.state));
  renderPockets();
  input.value = '';
}

// ====== Transfer & Tarik Tunai ======
window.transferRekeningKeLaci = async function(name) {
  const input = document.getElementById(`input-${name}`);
  const value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) return alert("Jumlah tidak valid");
  if (window.state.saldo[name].rekening < value) return alert("Saldo rekening tidak cukup");

  window.state.saldo[name].rekening -= value;
  window.state.saldo[name].laci += value;

  const entry = {
    pocket: name,
    jumlah: value,
    waktu: new Date().toISOString(),
    deskripsi: "Transfer Rekening → Laci"
  };
  window.state.riwayat.push(entry);

  await saveSaldo();
  await addRiwayat(entry);

  localStorage.setItem('warungState', JSON.stringify(window.state));
  renderPockets();
  input.value = '';
}

window.tarikTunai = async function(name) {
  const input = document.getElementById(`input-${name}`);
  const value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) return alert("Jumlah tidak valid");
  if (window.state.saldo[name].laci < value) return alert("Saldo laci tidak cukup");

  window.state.saldo[name].laci -= value;
  window.state.saldo[name].rekening += value;

  const entry = {
    pocket: name,
    jumlah: value,
    waktu: new Date().toISOString(),
    deskripsi: "Tarik Tunai Laci → Rekening"
  };
  window.state.riwayat.push(entry);

  await saveSaldo();
  await addRiwayat(entry);

  localStorage.setItem('warungState', JSON.stringify(window.state));
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

    const saldo = window.state.saldo[name] || { rekening: 0, laci: 0 };

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
      <div class="saldo-box">
        <div class="saldo-item saldo-rekening">Saldo Rekening: Rp ${saldo.rekening.toLocaleString()}</div>
        <div class="saldo-item saldo-laci">Saldo Laci: Rp ${saldo.laci.toLocaleString()}</div>
      </div>
      <input type="number" id="input-${name}" placeholder="Masukkan jumlah...">
      <button onclick="tambahKeRekening('${name}')">+ Rekening</button>
      <button onclick="tambahKeLaci('${name}')" style="background:#2e7d32; color:white;">+ Laci</button>
      <button onclick="transferRekeningKeLaci('${name}')">Transfer</button>
      <button onclick="tarikTunai('${name}')" style="background: orange; color:white;">Tarik Tunai</button>
      <button onclick="hapusRiwayatPocket('${name}')" style="background:#b71c1c;color:white;">Hapus Riwayat</button>
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
window.resetSemuaData = async function() {
  if (confirm("Yakin ingin menghapus SEMUA saldo? Riwayat akan tetap disimpan.")) {
    const now = new Date().toISOString();

    pockets.forEach(name => {
      const saldo = window.state.saldo[name];
      if (saldo.rekening !== 0 || saldo.laci !== 0) {
        const entry = {
          pocket: name,
          jumlah: -(saldo.rekening + saldo.laci),
          waktu: now,
          deskripsi: 'Reset semua data'
        };
        window.state.riwayat.push(entry);
        saldo.rekening = 0;
        saldo.laci = 0;
      }
    });

    await saveSaldo();
    for (const entry of window.state.riwayat) {
      await addRiwayat(entry);
    }

    localStorage.setItem('warungState', JSON.stringify(window.state));
    renderPockets();
  }
}

window.hapusSemuaRiwayat = async function() {
  if (confirm("Yakin ingin menghapus semua riwayat transaksi? Saldo akan tetap disimpan.")) {
    window.state.riwayat = [];
    localStorage.setItem('warungState', JSON.stringify(window.state));
    renderPockets();
    // (opsional) hapus di Firestore: loop deleteDoc di riwayatCol
  }
}



window.hapusSemuaRiwayat = async function() {
  if (!confirm("Yakin ingin menghapus SEMUA riwayat transaksi? Saldo akan tetap disimpan.")) return;

  try {
    // Hapus semua dari Firestore
    const snapshot = await getDocs(riwayatCol);
    const batchDeletes = [];
    snapshot.forEach(d => {
      batchDeletes.push(deleteDoc(doc(db, "warung/user-pribadi/riwayat", d.id)));
    });
    await Promise.all(batchDeletes);

    // Kosongkan riwayat lokal
    window.state.riwayat = [];
    localStorage.setItem('warungState', JSON.stringify(window.state));

    renderPockets();
    alert("Semua riwayat berhasil dihapus.");
  } catch (err) {
    console.error("Gagal hapus riwayat:", err);
    alert("Terjadi kesalahan saat hapus riwayat.");
  }
}

window.hapusRiwayatPocket = async function(name) {
  if (!confirm(`Yakin ingin menghapus semua riwayat untuk pocket ${name}?`)) return;

  try {
    // Hapus dari Firestore
    const snapshot = await getDocs(riwayatCol);
    const batchDeletes = [];
    snapshot.forEach(d => {
      if (d.data().pocket === name) {
        batchDeletes.push(deleteDoc(doc(db, "warung/user-pribadi/riwayat", d.id)));
      }
    });
    await Promise.all(batchDeletes);

    // Hapus dari state lokal
    window.state.riwayat = window.state.riwayat.filter(r => r.pocket !== name);
    localStorage.setItem('warungState', JSON.stringify(window.state));

    renderPockets();
    alert(`Riwayat pocket ${name} berhasil dihapus.`);
  } catch (err) {
    console.error("Gagal hapus riwayat pocket:", err);
    alert("Terjadi kesalahan saat hapus riwayat.");
  }
}



// ====== Load Awal ======
loadFromFirebase();


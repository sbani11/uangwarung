// ====== Firebase Setup ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, query, where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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
window.state = { saldo: {}, riwayatCache: {} };

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
          <button onclick="tambahKeRekening('${name}')" style="background:#1565c0;color:white;">+ Rekening</button>
          <button onclick="tambahKeLaci('${name}')" style="background:#2e7d32;color:white;">+ Laci</button>
          <button onclick="transferRekeningKeLaci('${name}')" style="background:#0288d1;color:white;">Transfer</button>
          <button onclick="tarikTunai('${name}')" style="background:orange;color:white;">Tarik Tunai</button>
          <button onclick="hapusRiwayatPocket('${name}')" style="background:#c62828;color:white;">Hapus Riwayat</button>
          <button onclick="toggleRiwayat('${name}')" style="background:#455a64;color:white;">Lihat Riwayat</button>
          <button onclick="hapusDataPocket('${name}')" style="background:#b71c1c;color:white;">Hapus Data Pocket</button>
          <div id="riwayat-${name}" class="riwayat" style="display:none;"></div>
        `;
    container.appendChild(div);
  });
}

// ====== Ekspor Excel ======
window.downloadExcel = function() {
  const data = window.state.riwayat.map(r => ({
    Tanggal: new Date(r.waktu).toLocaleString("id-ID", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false
    }),
    Pocket: r.pocket,
    Nilai: r.jumlah,
    Deskripsi: r.deskripsi || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat");

  // buat nama file dengan tanggal saat export
  const now = new Date();
  const tanggal = now.toLocaleDateString("id-ID", {
    year: "numeric", month: "2-digit", day: "2-digit"
  }).replace(/\//g, "-"); // biar aman jadi format 08-09-2025

  const filename = `riwayat_uang_warung_per_${tanggal}.xlsx`;

  XLSX.writeFile(workbook, filename);
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

window.toggleRiwayat = async function(name) {
  const div = document.getElementById(`riwayat-${name}`);
  if (!div) return;

  if (div.style.display === "none") {
    // Kalau cache belum ada → ambil dari Firestore
    if (!window.state.riwayatCache[name]) {
      const q = query(riwayatCol, where("pocket", "==", name));
      const snap = await getDocs(q);
      const hasil = [];
      snap.forEach(d => hasil.push(d.data()));
      // urutkan terbaru dulu
      hasil.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
      window.state.riwayatCache[name] = hasil;
    }

    // Render riwayat
    const riwayat = window.state.riwayatCache[name];
    div.innerHTML = riwayat.length === 0
      ? '<div class="riwayat-entry">Tidak ada transaksi.</div>'
      : riwayat.map(r => `
          <div class="riwayat-entry">
            ${new Date(r.waktu).toLocaleString("id-ID", {
              year: "numeric", month: "2-digit", day: "2-digit",
              hour: "2-digit", minute: "2-digit", second: "2-digit",
              hour12: false
            })} : Rp ${r.jumlah.toLocaleString()} - ${r.deskripsi || ''}
          </div>`).join('');
    div.style.display = "block";
  } else {
    div.style.display = "none";
  }
}

window.hapusDataPocket = async function(name) {
  if (!confirm(`Yakin ingin menghapus semua data (saldo + riwayat) untuk pocket ${name}?`)) return;

  try {
    // Reset saldo pocket ke 0
    window.state.saldo[name] = { rekening: 0, laci: 0 };
    await saveSaldo();

    // Hapus riwayat di Firestore untuk pocket ini
    const snapshot = await getDocs(riwayatCol);
    const deletes = [];
    snapshot.forEach(d => {
      if (d.data().pocket === name) deletes.push(deleteDoc(d.ref));
    });
    await Promise.all(deletes);

    // Hapus riwayat di cache lokal
    window.state.riwayatCache[name] = [];
    localStorage.setItem('warungState', JSON.stringify(window.state));

    renderPockets();
    alert(`Data pocket ${name} berhasil dihapus.`);
  } catch (err) {
    console.error("Gagal hapus data pocket:", err);
    alert("Terjadi kesalahan saat hapus data pocket.");
  }
}

// ====== Load Awal ======
loadFromFirebase();

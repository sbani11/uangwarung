// ====== Aplikasi Warung (LocalStorage Only) ======
export const pockets = [
  "Dagangan Sembako",
  "Uang BCA",
  "Uang BRI",
  "Uang Bank Lain",
  "Griyabayar",
  "Pulsa/Paket"
];

// State lokal
window.state = { saldo: {}, riwayat: [] };

// Inisialisasi saldo default jika belum ada
pockets.forEach(name => {
  window.state.saldo[name] = { rekening: 0, laci: 0 };
});

// ====== Local Storage Helpers ======
function loadFromLocal() {
  const saved = JSON.parse(localStorage.getItem("warungState"));
  if (saved) {
    window.state = saved;
  }
  window.renderPockets();
}

function saveToLocal() {
  localStorage.setItem("warungState", JSON.stringify(window.state));
}

// ====== Fungsi Tambah ======
window.tambahKeRekening = function (name) {
  const input = document.getElementById(`input-${name}`);
  const value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) return alert("Jumlah tidak valid");

  window.state.saldo[name].rekening += value;
  const entry = {
    pocket: name,
    jumlah: value,
    waktu: new Date().toISOString(),
    deskripsi: "Tambah ke Rekening",
  };
  window.state.riwayat.push(entry);

  saveToLocal();
  renderPockets();
  input.value = "";
};

window.tambahKeLaci = function (name) {
  const input = document.getElementById(`input-${name}`);
  const value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) return alert("Jumlah tidak valid");

  window.state.saldo[name].laci += value;
  const entry = {
    pocket: name,
    jumlah: value,
    waktu: new Date().toISOString(),
    deskripsi: "Tambah ke Laci",
  };
  window.state.riwayat.push(entry);

  saveToLocal();
  renderPockets();
  input.value = "";
};

// ====== Transfer & Tarik Tunai ======
window.transferRekeningKeLaci = function (name) {
  const input = document.getElementById(`input-${name}`);
  const value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) return alert("Jumlah tidak valid");
  if (window.state.saldo[name].rekening < value)
    return alert("Saldo rekening tidak cukup");

  window.state.saldo[name].rekening -= value;
  window.state.saldo[name].laci += value;

  const entry = {
    pocket: name,
    jumlah: value,
    waktu: new Date().toISOString(),
    deskripsi: "Transfer Rekening → Laci",
  };
  window.state.riwayat.push(entry);

  saveToLocal();
  renderPockets();
  input.value = "";
};

window.tarikTunai = function (name) {
  const input = document.getElementById(`input-${name}`);
  const value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) return alert("Jumlah tidak valid");
  if (window.state.saldo[name].laci < value)
    return alert("Saldo laci tidak cukup");

  window.state.saldo[name].laci -= value;
  window.state.saldo[name].rekening += value;

  const entry = {
    pocket: name,
    jumlah: value,
    waktu: new Date().toISOString(),
    deskripsi: "Tarik Tunai Laci → Rekening",
  };
  window.state.riwayat.push(entry);

  saveToLocal();
  renderPockets();
  input.value = "";
};

// ====== Render Pockets ======
window.renderPockets = function () {
  const container = document.getElementById("pocketContainer");
  const filter = document.getElementById("filterDate").value;
  container.innerHTML = "";

  pockets.forEach((name) => {
    const div = document.createElement("div");
    div.className = "pocket";

    const saldo = window.state.saldo[name] || { rekening: 0, laci: 0 };

    const riwayat = window.state.riwayat
      .filter((r) => r.pocket === name)
      .filter((r) => !filter || r.waktu.startsWith(filter))
      .reverse();

    const riwayatHTML =
      riwayat.length === 0
        ? '<div class="riwayat-entry">Tidak ada transaksi.</div>'
        : riwayat
            .map(
              (r) => `
        <div class="riwayat-entry">
          ${new Date(r.waktu).toLocaleString()} : Rp ${r.jumlah.toLocaleString()}
          ${r.deskripsi ? ` - ${r.deskripsi}` : ""}
        </div>`
            )
            .join("");

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
      <div id="riwayat-${name}" class="riwayat" style="display:none;">${riwayatHTML}</div>
    `;
    container.appendChild(div);
  });
};

// ====== Ekspor Excel ======
window.downloadExcel = function () {
  const data = window.state.riwayat.map((r) => ({
    Tanggal: new Date(r.waktu).toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
    Pocket: r.pocket,
    Nilai: r.jumlah,
    Deskripsi: r.deskripsi || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat");

  const now = new Date();
  const tanggal = now
    .toLocaleDateString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "-");

  const filename = `riwayat_uang_warung_per_${tanggal}.xlsx`;

  XLSX.writeFile(workbook, filename);
};

// ====== Reset & Hapus ======
window.resetSemuaData = function () {
  if (
    confirm("Yakin ingin menghapus SEMUA saldo? Riwayat akan tetap disimpan.")
  ) {
    const now = new Date().toISOString();

    pockets.forEach((name) => {
      const saldo = window.state.saldo[name];
      if (saldo.rekening !== 0 || saldo.laci !== 0) {
        const entry = {
          pocket: name,
          jumlah: -(saldo.rekening + saldo.laci),
          waktu: now,
          deskripsi: "Reset semua data",
        };
        window.state.riwayat.push(entry);
        saldo.rekening = 0;
        saldo.laci = 0;
      }
    });

    saveToLocal();
    renderPockets();
  }
};

window.hapusSemuaRiwayat = function () {
  if (
    !confirm(
      "Yakin ingin menghapus SEMUA riwayat transaksi? Saldo akan tetap disimpan."
    )
  )
    return;

  window.state.riwayat = [];
  saveToLocal();
  renderPockets();
};

window.hapusRiwayatPocket = function (name) {
  if (!confirm(`Yakin ingin menghapus semua riwayat untuk pocket ${name}?`))
    return;

  window.state.riwayat = window.state.riwayat.filter((r) => r.pocket !== name);
  saveToLocal();
  renderPockets();
};

window.toggleRiwayat = function (name) {
  const div = document.getElementById(`riwayat-${name}`);
  if (!div) return;

  if (div.style.display === "none") {
    const riwayat = window.state.riwayat
      .filter((r) => r.pocket === name)
      .sort((a, b) => new Date(b.waktu) - new Date(a.waktu));

    div.innerHTML =
      riwayat.length === 0
        ? '<div class="riwayat-entry">Tidak ada transaksi.</div>'
        : riwayat
            .map(
              (r) => `
          <div class="riwayat-entry">
            ${new Date(r.waktu).toLocaleString("id-ID", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })} : Rp ${r.jumlah.toLocaleString()} - ${r.deskripsi || ""}
          </div>`
            )
            .join("");
    div.style.display = "block";
  } else {
    div.style.display = "none";
  }
};

window.hapusDataPocket = function (name) {
  if (
    !confirm(
      `Yakin ingin menghapus semua data (saldo + riwayat) untuk pocket ${name}?`
    )
  )
    return;

  window.state.saldo[name] = { rekening: 0, laci: 0 };
  window.state.riwayat = window.state.riwayat.filter((r) => r.pocket !== name);

  saveToLocal();
  renderPockets();
};

// ====== Load Awal ======
loadFromLocal();

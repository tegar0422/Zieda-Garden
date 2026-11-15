"use strict";

// Fitur muat keranjang dari penyimpanan, buang data yang tidak valid
function muatKeranjang() {
  const data = bacaData("keranjang", []);
  return (Array.isArray(data) ? data : [])
    .filter(function (i) {
      return i && cariKartu(i.id) && Number(i.jumlah) >= 1;
    })
    .map(function (i) {
      return {
        id: Number(i.id),
        jumlah: Math.min(99, Math.floor(Number(i.jumlah))),
      };
    });
}
// Fitur data keranjang dan menu yang sedang dibuka
let keranjang = muatKeranjang();
let menuDibuka = null;
let tujuanSetelahLogin = "#/";

// Fitur ambil elemen berdasarkan id
function ambil(id) {
  return document.getElementById(id);
}

// Fitur baca dan tulis localStorage dengan aman
function bacaData(kunci, bawaan) {
  try {
    const nilai = JSON.parse(localStorage.getItem(kunci));
    return nilai === null ? bawaan : nilai;
  } catch (e) {
    return bawaan;
  }
}
function tulisData(kunci, nilai) {
  try {
    localStorage.setItem(kunci, JSON.stringify(nilai));
  } catch (e) {}
}

// Fitur ambil kartu menu berdasarkan id
function cariKartu(id) {
  return (
    Array.from(document.querySelectorAll(".kartu")).find(function (k) {
      return k.dataset.id === String(id);
    }) || null
  );
}

// Fitur harga menu saat ini
function hargaMenu(id) {
  const menu = cariKartu(id);
  return menu ? Number(menu.dataset.harga) : 0;
}

// Fitur format harga rupiah
function rupiah(angka) {
  return "Rp" + String(angka).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Fitur cek status login (kedaluwarsa 8 jam)
function sudahMasuk() {
  try {
    const waktu = Number(localStorage.getItem("masuk"));
    return waktu > 0 && Date.now() - waktu < 8 * 60 * 60 * 1000;
  } catch (e) {
    return false;
  }
}

/* MENU HEADER */
// Fitur pencarian menu
ambil("input-cari").addEventListener("input", function () {
  location.hash = "#/";
  tampilkanKatalog();
});

// Fitur tombol cari
ambil("form-cari").addEventListener("submit", function (e) {
  e.preventDefault();
  location.hash = "#/";
  tampilkanKatalog();
});

// Fitur keluar (logout)
ambil("tombol-keluar").addEventListener("click", function () {
  try {
    localStorage.removeItem("masuk");
  } catch (e) {}
  aturHalaman();
});

// Sinkron antar tab (event storage hanya muncul di tab lain)
window.addEventListener("storage", function (e) {
  if (e.key !== "keranjang" && e.key !== "masuk") {
    return;
  }
  keranjang = muatKeranjang();
  ambil("lencana-keranjang").textContent = jumlahBarang();
  const halaman = document.body.dataset.halaman;
  if (e.key === "masuk") {
    aturHalaman();
  } else if (halaman === "keranjang") {
    tampilkanKeranjang();
  } else if (halaman === "checkout") {
    tampilkanCheckout();
  }
});

/* MENU KATALOG */
// Fitur filter kategori dan pencarian menu
function tampilkanKatalog() {
  const kategori = document.querySelector(
    'input[name="kategori"]:checked',
  ).value;
  const kata = ambil("input-cari").value.trim().toLowerCase();

  document.querySelectorAll("#grid-produk .kartu").forEach(function (k) {
    k.hidden = !(
      (kategori === "semua" || k.dataset.kategori === kategori) &&
      k.dataset.nama.toLowerCase().includes(kata)
    );
  });
}

// Fitur filter kategori
ambil("halaman-katalog").addEventListener("change", tampilkanKatalog);

/* MENU LOGIN */
// Fitur akun login
// CATATAN: login ini hanya simulasi untuk demo (tanpa server).
// Jangan memakai password sungguhan di sini.
// (Hash password di klien tidak menambah keamanan. Login sungguhan butuh backend.)
const USERNAME = "galang";
const PASSWORD = "1111";

// Fitur masuk (login), setelah berhasil kembali ke katalog
ambil("form-login").addEventListener("submit", function (e) {
  e.preventDefault();
  const benar =
    ambil("isian-username").value.trim().toLowerCase() === USERNAME &&
    ambil("isian-password").value === PASSWORD;
  ambil("login-salah").hidden = benar;
  if (benar) {
    try {
      localStorage.setItem("masuk", String(Date.now()));
    } catch (e) {}
    this.reset();
    const tujuan = tujuanSetelahLogin;
    tujuanSetelahLogin = "#/";
    if (location.hash === tujuan) {
      aturHalaman();
    } else {
      location.hash = tujuan;
    }
  }
});

/* MENU DETAIL MENU */
// Fitur tampilan detail menu
function tampilkanDetail(id) {
  menuDibuka = cariKartu(id);
  ambil("detail-tidak-ada").hidden = Boolean(menuDibuka);
  ambil("isi-detail").hidden = !menuDibuka;
  if (!menuDibuka) {
    return;
  }

  ambil("detail-gambar").src = menuDibuka.querySelector(".foto").src;
  ambil("detail-gambar").alt = menuDibuka.dataset.nama;
  ambil("detail-nama").textContent = menuDibuka.dataset.nama;
  ambil("detail-deskripsi").textContent = menuDibuka.dataset.deskripsi;
  ambil("isian-jumlah").value = 1;
  hitungKasir();
}

// Fitur kasir (harga x jumlah)
function hitungKasir() {
  const kolom = ambil("isian-jumlah");
  kolom.value = Math.min(99, Math.max(1, Math.floor(Number(kolom.value)) || 1));
  ambil("tombol-kurang").disabled = Number(kolom.value) <= 1;
  ambil("kasir-nama").textContent = menuDibuka.dataset.nama;
  ambil("kasir-harga").textContent = rupiah(menuDibuka.dataset.harga);
  document.querySelectorAll(".total-teks").forEach(function (el) {
    el.textContent = rupiah(menuDibuka.dataset.harga * kolom.value);
  });
}

// Fitur tombol kurangi, tambah, dan isian jumlah
ambil("tombol-kurang").addEventListener("click", function () {
  ambil("isian-jumlah").stepDown();
  hitungKasir();
});
ambil("tombol-tambah").addEventListener("click", function () {
  ambil("isian-jumlah").stepUp();
  hitungKasir();
});
ambil("isian-jumlah").addEventListener("change", hitungKasir);

// Fitur masukkan menu ke keranjang
function masukKeranjang() {
  const id = Number(menuDibuka.dataset.id);
  const jumlah = Number(ambil("isian-jumlah").value);
  const item = keranjang.find(function (i) {
    return i.id === id;
  });
  if (item) {
    item.jumlah = Math.min(99, item.jumlah + jumlah);
  } else {
    keranjang.push({ id: id, jumlah: jumlah });
  }
  simpanKeranjang();
}

// Fitur tombol tambah ke keranjang
ambil("tombol-keranjang").addEventListener("click", function () {
  masukKeranjang();
  const tombol = this;
  tombol.textContent = "Ditambahkan ✓";
  setTimeout(function () {
    tombol.textContent = "Tambah ke keranjang";
  }, 1500);
});

// Fitur tombol pesan sekarang
ambil("tombol-pesan").addEventListener("click", function () {
  masukKeranjang();
  location.hash = "#/checkout";
});

/* ===== MENU KERANJANG ===== */
// Fitur hitung jumlah barang dan total harga
function jumlahBarang() {
  return keranjang.reduce(function (t, i) {
    return t + i.jumlah;
  }, 0);
}
function totalHarga() {
  return keranjang.reduce(function (t, i) {
    return t + hargaMenu(i.id) * i.jumlah;
  }, 0);
}
// Fitur simpan keranjang dan lencana jumlah di header
function simpanKeranjang() {
  tulisData("keranjang", keranjang);
  ambil("lencana-keranjang").textContent = jumlahBarang();
}
// Fitur daftar barang dari template baris
function isiBaris(wadah, daftar) {
  wadah.replaceChildren();
  daftar.forEach(function (item) {
    const menu = cariKartu(item.id);
    if (!menu) {
      return;
    }
    const harga = item.harga !== undefined ? item.harga : hargaMenu(item.id);
    const baris = ambil("templat-baris").content.cloneNode(true);
    baris.querySelector(".baris-keranjang").dataset.id = item.id;
    baris.querySelector(".foto").src = menu.querySelector(".foto").src;
    baris.querySelector(".baris-info a").textContent = menu.dataset.nama;
    baris.querySelector(".baris-info a").href = "#/detail/" + item.id;
    baris.querySelector(".baris-info p").textContent = rupiah(harga);
    baris.querySelector(".jumlah").textContent = item.jumlah;
    baris.querySelector('[data-aksi="kurang"]').disabled = item.jumlah <= 1;
    baris.querySelector(".baris-subtotal").textContent = rupiah(
      harga * item.jumlah,
    );
    wadah.append(baris);
  });
}
// Fitur tampilan keranjang
function tampilkanKeranjang() {
  isiBaris(ambil("daftar-keranjang"), keranjang);
  ambil("keranjang-jumlah").textContent = jumlahBarang();
  ambil("keranjang-subtotal").textContent = rupiah(totalHarga());
}
// Fitur kurangi, tambah, dan hapus barang
ambil("daftar-keranjang").addEventListener("click", function (e) {
  const aksi = e.target.dataset.aksi;
  if (!aksi) {
    return;
  }
  const id = Number(e.target.closest("[data-id]").dataset.id);
  const item = keranjang.find(function (i) {
    return i.id === id;
  });
  if (aksi === "kurang") {
    item.jumlah -= 1;
  }
  if (aksi === "tambah" && item.jumlah < 99) {
    item.jumlah += 1;
  }
  if (aksi === "hapus") {
    keranjang = keranjang.filter(function (i) {
      return i !== item;
    });
  }
  simpanKeranjang();
  tampilkanKeranjang();
});
/* ===== MENU CHECKOUT ===== */
// Fitur validasi isian teks: spasi saja tidak dihitung
function periksaTeks(id, minimal) {
  const kolom = ambil(id);
  const cukup = kolom.value.trim().length >= minimal;
  kolom.setCustomValidity(cukup ? "" : "Isian terlalu pendek.");
}
function periksaCheckout() {
  periksaTeks("isian-alamat", 10);
  periksaTeks("isian-kota", 3);
}
ambil("isian-alamat").addEventListener("input", periksaCheckout);
ambil("isian-kota").addEventListener("input", periksaCheckout);
periksaCheckout();

// Fitur ringkasan pesanan
function tampilkanCheckout() {
  isiBaris(ambil("ringkasan-checkout"), keranjang);
  ambil("checkout-total").textContent = rupiah(totalHarga());
}
// Fitur buat pesanan (form sudah divalidasi oleh HTML)
ambil("form-checkout").addEventListener("submit", function (e) {
  e.preventDefault();
  if (keranjang.length === 0) {
    location.hash = "#/keranjang";
    return;
  }
  const pesanan = {
    nama: ambil("isian-nama").value.trim(),
    hp: ambil("isian-hp").value.trim(),
    alamat: ambil("isian-alamat").value.trim(),
    kota: ambil("isian-kota").value.trim(),
    pembayaran: ambil("isian-pembayaran").value,
    catatan: ambil("isian-catatan").value.trim(),
    barang: keranjang.map(function (i) {
      return { id: i.id, jumlah: i.jumlah, harga: hargaMenu(i.id) };
    }),
    total: totalHarga(),
    waktu: new Date().toISOString(),
  };
  tulisData("pesananTerakhir", pesanan);
  keranjang = [];
  simpanKeranjang();
  this.reset();
  periksaCheckout();
  location.hash = "#/sukses";
});

/* ===== MENU SUKSES ===== */
// Fitur rincian pesanan yang baru dibuat
function tampilkanSukses() {
  const pesanan = bacaData("pesananTerakhir", null);
  ambil("isi-sukses").hidden = !pesanan;
  ambil("sukses-tidak-ada").hidden = Boolean(pesanan);
  if (!pesanan) {
    return;
  }
  ambil("sukses-pemesan").textContent =
    "Terima kasih, " + pesanan.nama + ". Pesananmu sudah tercatat.";
  ambil("sukses-rincian").textContent = pesanan.alamat
    ? pesanan.pembayaran + " · " + pesanan.alamat + ", " + pesanan.kota
    : "";
  isiBaris(ambil("sukses-daftar"), pesanan.barang);
  ambil("sukses-total").textContent = rupiah(pesanan.total);
}
/* ===== FITUR PINDAH HALAMAN (berlaku di semua menu) ===== */
// Judul halaman untuk aksesibilitas
const JUDUL = {
  katalog: "Katalog",
  login: "Masuk",
  detail: "Detail menu",
  keranjang: "Keranjang",
  checkout: "Checkout",
  sukses: "Pesanan berhasil",
};

// Fitur pindah halaman berdasarkan hash URL, contoh: #/detail/3
function aturHalaman() {
  const bagian = location.hash.replace("#/", "").split("/");
  let halaman = bagian[0] || "katalog";
  if (
    !["katalog", "login", "detail", "keranjang", "checkout", "sukses"].includes(
      halaman,
    )
  ) {
    halaman = "katalog";
  }
  if (halaman === "login" && sudahMasuk()) {
    return location.replace("#/");
  }
  if (halaman === "checkout" && keranjang.length === 0) {
    return location.replace("#/keranjang");
  }
  // Fitur wajib login: semua menu selain katalog dan login
  if (halaman !== "katalog" && halaman !== "login" && !sudahMasuk()) {
    tujuanSetelahLogin = location.hash || "#/";
    halaman = "login";
  }
  document.documentElement.classList.toggle("sudah-masuk", sudahMasuk());
  document.body.dataset.halaman = halaman;
  window.scrollTo(0, 0);
  if (halaman === "katalog") {
    tampilkanKatalog();
  }
  if (halaman === "login") {
    ambil("login-salah").hidden = true;
  }
  if (halaman === "detail") {
    tampilkanDetail(bagian[1]);
  }
  if (halaman === "keranjang") {
    tampilkanKeranjang();
  }
  if (halaman === "checkout") {
    tampilkanCheckout();
  }
  if (halaman === "sukses") {
    tampilkanSukses();
  }
  document.title = JUDUL[halaman] + " - Zieda Garden";
  const judulHalaman = document.querySelector("#halaman-" + halaman + " h1");
  if (judulHalaman && document.activeElement !== ambil("input-cari")) {
    judulHalaman.setAttribute("tabindex", "-1");
    judulHalaman.focus({ preventScroll: true });
  }
}
/* ===== FITUR MULAI ===== */
window.addEventListener("hashchange", aturHalaman);
simpanKeranjang();
aturHalaman();

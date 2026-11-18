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
    return true;
  } catch (e) {
    return false;
  }
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

// Fitur buat ID unik transaksi (timestamp + random)
function buatIdTransaksi() {
  return (
    "TRX" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
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

// Fitur kotak konfirmasi di tengah layar, mengembalikan Promise<boolean>
function konfirmasi(judul, pesan, teksYa) {
  const kotak = ambil("kotak-konfirmasi");
  if (!kotak || typeof kotak.showModal !== "function") {
    return Promise.resolve(window.confirm(pesan));
  }
  ambil("konfirmasi-judul").textContent = judul;
  ambil("konfirmasi-pesan").textContent = pesan;
  ambil("konfirmasi-ya").textContent = teksYa || "Ya";
  return new Promise(function (selesai) {
    function tutup(hasil) {
      ambil("konfirmasi-ya").onclick = null;
      ambil("konfirmasi-batal").onclick = null;
      kotak.onclose = null;
      if (kotak.open) {
        kotak.close();
      }
      selesai(hasil);
    }
    ambil("konfirmasi-ya").onclick = function () {
      tutup(true);
    };
    ambil("konfirmasi-batal").onclick = function () {
      tutup(false);
    };
    // Tombol Esc menutup kotak sama dengan Batal
    kotak.onclose = function () {
      tutup(false);
    };
    kotak.showModal();
    ambil("konfirmasi-batal").focus();
  });
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

/* ===== FITUR AUTOCOMPLETE PENCARIAN ===== */
// Saran menu muncul saat mengetik, diambil dari kartu menu yang sudah ada di katalog
(function () {
  const kolom = ambil("input-cari");
  const form = ambil("form-cari");
  const daftar = document.createElement("ul");
  daftar.id = "saran-cari";
  daftar.className = "saran-cari";
  daftar.setAttribute("role", "listbox");
  daftar.setAttribute("aria-label", "Saran menu");
  daftar.hidden = true;
  form.appendChild(daftar);
  kolom.setAttribute("role", "combobox");
  kolom.setAttribute("aria-autocomplete", "list");
  kolom.setAttribute("aria-controls", "saran-cari");
  kolom.setAttribute("aria-expanded", "false");

  let hasil = [];
  let aktif = -1;

  // Samakan huruf besar/kecil dan tanda aksen supaya pencocokan fleksibel
  function normal(teks) {
    return String(teks)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
  function cari(kata) {
    const bagian = normal(kata).split(/\s+/).filter(Boolean);
    if (bagian.length === 0) {
      return [];
    }
    return Array.from(document.querySelectorAll("#grid-produk .kartu"))
      .filter(function (k) {
        const nama = normal(k.dataset.nama);
        return bagian.every(function (b) {
          return nama.includes(b);
        });
      })
      .sort(function (a, b) {
        // Nama yang diawali kata pertama tampil lebih dulu
        const awal = function (k) {
          return normal(k.dataset.nama).startsWith(bagian[0]) ? 0 : 1;
        };
        return awal(a) - awal(b);
      })
      .slice(0, 6);
  }

  function tutup() {
    daftar.hidden = true;
    kolom.setAttribute("aria-expanded", "false");
    kolom.removeAttribute("aria-activedescendant");
    aktif = -1;
  }
  function sorot(indeks) {
    const item = daftar.querySelectorAll(".saran-item");
    item.forEach(function (el, i) {
      el.setAttribute("aria-selected", String(i === indeks));
    });
    aktif = indeks;
    if (indeks >= 0 && item[indeks]) {
      kolom.setAttribute("aria-activedescendant", item[indeks].id);
      item[indeks].scrollIntoView({ block: "nearest" });
    } else {
      kolom.removeAttribute("aria-activedescendant");
    }
  }
  function tampil() {
    const kata = kolom.value.trim();
    if (!kata) {
      tutup();
      return;
    }
    hasil = cari(kata);
    daftar.replaceChildren();
    aktif = -1;
    if (hasil.length === 0) {
      const kosong = document.createElement("li");
      kosong.className = "saran-kosong";
      kosong.setAttribute("role", "presentation");
      kosong.textContent = "Menu “" + kata + "” tidak ditemukan";
      daftar.appendChild(kosong);
    }
    hasil.forEach(function (k, i) {
      const li = document.createElement("li");
      li.className = "saran-item";
      li.id = "saran-cari-" + k.dataset.id;
      li.dataset.indeks = i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      const foto = k.querySelector(".foto");
      if (foto) {
        const img = document.createElement("img");
        img.src = foto.src;
        img.alt = "";
        img.width = 40;
        img.height = 40;
        li.appendChild(img);
      }
      const teks = document.createElement("span");
      teks.className = "saran-teks";
      const nama = document.createElement("span");
      nama.className = "saran-nama";
      nama.textContent = k.dataset.nama;
      const harga = document.createElement("span");
      harga.className = "saran-harga";
      harga.textContent = rupiah(k.dataset.harga);
      teks.append(nama, harga);
      li.appendChild(teks);
      daftar.appendChild(li);
    });
    daftar.hidden = false;
    kolom.setAttribute("aria-expanded", "true");
  }
  // Pilih saran: buka detail menu, kosongkan kolom agar katalog tidak tersaring
  function pilih(indeks) {
    const kartu = hasil[indeks];
    if (!kartu) {
      return;
    }
    kolom.value = "";
    tutup();
    kolom.blur();
    location.hash = "#/detail/" + kartu.dataset.id;
  }

  kolom.addEventListener("input", tampil);
  kolom.addEventListener("focus", function () {
    if (kolom.value.trim()) {
      tampil();
    }
  });
  kolom.addEventListener("keydown", function (e) {
    const buka = !daftar.hidden;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!buka) {
        tampil();
        return;
      }
      if (hasil.length === 0) {
        return;
      }
      e.preventDefault();
      const arah = e.key === "ArrowDown" ? 1 : -1;
      sorot((aktif + arah + hasil.length) % hasil.length);
    } else if (e.key === "Enter" && buka && aktif >= 0) {
      e.preventDefault();
      pilih(aktif);
    } else if (e.key === "Escape" && buka) {
      e.preventDefault();
      tutup();
    }
  });
  // mousedown dicegah agar kolom tidak kehilangan fokus sebelum klik terbaca
  daftar.addEventListener("mousedown", function (e) {
    e.preventDefault();
  });
  daftar.addEventListener("click", function (e) {
    const item = e.target.closest(".saran-item");
    if (item) {
      pilih(Number(item.dataset.indeks));
    }
  });
  // Tutup saat klik/sentuh di luar pencarian, fokus pindah, kirim form, atau ganti halaman
  document.addEventListener("pointerdown", function (e) {
    if (!form.contains(e.target)) {
      tutup();
    }
  });
  form.addEventListener("focusout", function (e) {
    if (!form.contains(e.relatedTarget)) {
      tutup();
    }
  });
  form.addEventListener("submit", tutup);
  // Handler pencarian lama mengubah hash saat mengetik; jangan tutup selama kolom masih dipakai
  window.addEventListener("hashchange", function () {
    if (document.activeElement !== kolom) {
      tutup();
    }
  });
})();

// Fitur keluar (logout)
ambil("tombol-keluar").addEventListener("click", function () {
  konfirmasi("Keluar dari akun?", "Yakin ingin keluar?", "Keluar").then(
    function (yakin) {
      if (!yakin) {
        return;
      }
      try {
        localStorage.removeItem("masuk");
      } catch (e) {}
      aturHalaman();
    },
  );
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

  let visibleCount = 0;

  document.querySelectorAll("#grid-produk .kartu").forEach(function (k) {
    const cocok =
      (kategori === "semua" || k.dataset.kategori === kategori) &&
      k.dataset.nama.toLowerCase().includes(kata);
    k.hidden = !cocok;
    if (cocok) visibleCount++;
  });

  tampilkanRekomendasi(visibleCount === 0, kategori, kata);
}

// Fitur tampilkan rekomendasi saat kosong
function tampilkanRekomendasi(kosong, kategoriFilter, kataKunci) {
  const kosongEl = ambil("katalog-kosong");
  const rekomendasiSection = ambil("rekomendasi-section");
  const gridRekomendasi = ambil("grid-rekomendasi");

  if (!kosong) {
    kosongEl.hidden = true;
    rekomendasiSection.hidden = true;
    gridRekomendasi.innerHTML = "";
    return;
  }

  kosongEl.hidden = false;
  // Pesan menyesuaikan kata kunci dan kategori yang sedang dipakai
  const namaKategori = kategoriFilter === "semua" ? "" : kategoriFilter;
  kosongEl.querySelector(".kosong-deskripsi").textContent = kataKunci
    ? "Tidak ada menu yang cocok dengan “" +
      kataKunci +
      "”" +
      (namaKategori ? " di kategori " + namaKategori : "") +
      "."
    : "Belum ada menu di kategori " + namaKategori + ".";

  // Kumpulkan menu dari KATEGORI YANG SAMA saja (bukan kategori lain)
  const semuaKartu = Array.from(
    document.querySelectorAll("#grid-produk .kartu"),
  );
  const kandidat = semuaKartu.filter(function (k) {
    const cocokKategori =
      kategoriFilter === "semua" || k.dataset.kategori === kategoriFilter;
    const cocokKata = k.dataset.nama.toLowerCase().includes(kataKunci);
    return cocokKategori && !cocokKata; // Hanya kategori sama, tapi tidak cocok kata kunci
  });

  // Ambil 3 acak (atau kurang jika tidak cukup)
  const acak = kandidat
    .sort(function () {
      return Math.random() - 0.5;
    })
    .slice(0, 3);

  if (acak.length === 0) {
    rekomendasiSection.hidden = true;
    gridRekomendasi.innerHTML = "";
    return;
  }

  // Clone kartu asli untuk rekomendasi
  gridRekomendasi.innerHTML = "";
  acak.forEach(function (k) {
    const clone = k.cloneNode(true);
    // Reset hidden state untuk rekomendasi
    clone.hidden = false;
    // Lepas status animasi (reveal dan skeleton) milik kartu asli agar salinan tetap tampil
    clone.classList.remove("reveal", "tampil");
    clone.style.transitionDelay = "";
    clone.querySelectorAll(".memuat").forEach(function (el) {
      el.classList.remove("memuat");
    });
    // Hapus event listener duplikat jika ada (kloning tidak menyalin listener)
    gridRekomendasi.appendChild(clone);
  });

  rekomendasiSection.hidden = false;
}

// Fitur tombol "Lihat semua menu" pada keadaan menu tidak ditemukan
ambil("tombol-reset-cari").addEventListener("click", function () {
  ambil("input-cari").value = "";
  document.querySelector('input[name="kategori"][value="semua"]').checked = true;
  tampilkanKatalog();
});

// Fitur filter kategori
// Fitur pindah kategori dengan jeda dan animasi halus:
// daftar memudar, menunggu sebentar, lalu kartu muncul bergantian
let penundaKategori = null;
ambil("halaman-katalog").addEventListener("change", function (e) {
  const hasil = document.querySelector("#halaman-katalog .hasil");
  const tanpaGerak =
    !hasil ||
    !hasil.animate ||
    !e.target.matches('input[name="kategori"]') ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (tanpaGerak) {
    tampilkanKatalog();
    return;
  }

  // Klik cepat berturut-turut: batalkan jadwal sebelumnya, pakai yang terbaru
  clearTimeout(penundaKategori);
  hasil.getAnimations().forEach(function (a) {
    a.cancel();
  });

  // Tahap 1: daftar lama memudar dan turun sedikit
  const keluar = hasil.animate(
    [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(10px)" },
    ],
    { duration: 220, easing: "ease-in", fill: "forwards" },
  );

  // Tahap 2: jeda singkat, ganti isi, lalu kartu baru muncul satu per satu
  penundaKategori = setTimeout(function () {
    tampilkanKatalog();
    keluar.cancel();
    const kartu = document.querySelectorAll("#grid-produk .kartu:not([hidden])");
    kartu.forEach(function (k, i) {
      k.animate(
        [
          { opacity: 0, transform: "translateY(18px) scale(0.96)" },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ],
        {
          duration: 450,
          delay: i * 70,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards",
        },
      );
    });
    hasil.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 250,
      easing: "ease-out",
    });
  }, 320);
});

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

// Fitur toggle password
(function () {
  const toggleBtn = ambil("toggle-password");
  const passwordInput = ambil("isian-password");
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener("click", function () {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      toggleBtn.setAttribute("aria-pressed", String(isPassword));
      toggleBtn.setAttribute(
        "aria-label",
        isPassword ? "Sembunyikan password" : "Tampilkan password",
      );
    });
  }
})();

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

  // Simpan salinan keranjang sebelum perubahan untuk rollback jika gagal
  const keranjangSebelumnya = keranjang.map(function (i) {
    return { id: i.id, jumlah: i.jumlah };
  });

  const item = keranjang.find(function (i) {
    return i.id === id;
  });
  if (item) {
    item.jumlah = Math.min(99, item.jumlah + jumlah);
  } else {
    keranjang.push({ id: id, jumlah: jumlah });
  }

  const berhasil = simpanKeranjang();

  if (!berhasil) {
    // Rollback ke kondisi sebelumnya
    keranjang = keranjangSebelumnya;
    // Sinkronkan lencana dengan data yang sudah di-rollback
    ambil("lencana-keranjang").textContent = jumlahBarang();
    alert("Gagal menyimpan keranjang. Silakan coba lagi.");
    return false;
  }
  return true;
}

// Fitur animasi kartu mengecil terbang ke ikon keranjang
function animasiKeKeranjang(jumlah) {
  const kartu = document.querySelector("#isi-detail .detail-gambar");
  const ikon = document.querySelector(".nav-keranjang img");
  const lencana = ambil("lencana-keranjang");

  // Efek pantul pada lencana + tulisan +N yang naik dan memudar
  function pantulkanLencana() {
    const pos = lencana.getBoundingClientRect();
    const plus = document.createElement("span");
    plus.textContent = "+" + jumlah;
    plus.setAttribute("aria-hidden", "true");
    Object.assign(plus.style, {
      position: "fixed",
      left: pos.left + pos.width / 2 + "px",
      top: pos.bottom + "px",
      zIndex: "1001",
      pointerEvents: "none",
      padding: "2px 8px",
      borderRadius: "999px",
      background: "#fff",
      color: "#1f3d2f",
      fontWeight: "700",
      fontSize: "0.85rem",
      boxShadow: "0 2px 8px rgba(0,0,0,.25)",
    });
    document.body.appendChild(plus);
    if (plus.animate) {
      const a = plus.animate(
        [
          { transform: "translate(-50%, -4px) scale(0.5)", opacity: 0 },
          { transform: "translate(-50%, 8px) scale(1.15)", opacity: 1, offset: 0.25 },
          { transform: "translate(-50%, 30px) scale(1)", opacity: 0 },
        ],
        { duration: 900, easing: "ease-out", fill: "forwards" },
      );
      a.onfinish = function () {
        plus.remove();
      };
    } else {
      setTimeout(function () {
        plus.remove();
      }, 900);
    }
    if (lencana.animate) {
      lencana.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.45)", offset: 0.4 },
          { transform: "scale(1)" },
        ],
        { duration: 400, easing: "ease-out" },
      );
    }
  }

  // Lewati animasi jika pengguna meminta gerakan dikurangi atau tidak didukung
  if (
    !kartu ||
    !ikon ||
    !kartu.animate ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    pantulkanLencana();
    return;
  }

  const awal = kartu.getBoundingClientRect();
  const tujuan = ikon.getBoundingClientRect();
  if (awal.width === 0 || awal.height === 0) {
    return;
  }

  // Salin kartu sebagai bayangan yang terbang, kartu asli tetap di tempatnya
  const salinan = kartu.cloneNode(true);
  salinan.removeAttribute("id");
    salinan.querySelectorAll("[id]").forEach(function (el) {
    el.removeAttribute("id");
  });
  salinan.setAttribute("aria-hidden", "true");
  salinan.inert = true;
  Object.assign(salinan.style, {
    position: "fixed",
    left: awal.left + "px",
    top: awal.top + "px",
    width: awal.width + "px",
    height: awal.height + "px",
    margin: "0",
    zIndex: "1000",
    pointerEvents: "none",
    transformOrigin: "0 0",
    willChange: "transform, opacity",
  });
  document.body.appendChild(salinan);

  // Hitung posisi dan skala akhir supaya pusat kartu berhenti di pusat ikon
  const skalaAkhir = Math.max(
    0.04,
    tujuan.width / Math.max(awal.width, awal.height),
  );
  const geser = function (skala, xPusat, yPusat) {
    const x = xPusat - (awal.width * skala) / 2 - awal.left;
    const y = yPusat - (awal.height * skala) / 2 - awal.top;
    return "translate(" + x + "px, " + y + "px) scale(" + skala + ")";
  };
  const pusatAwalX = awal.left + awal.width / 2;
  const pusatAwalY = awal.top + awal.height / 2;
  const pusatTujuanX = tujuan.left + tujuan.width / 2;
  const pusatTujuanY = tujuan.top + tujuan.height / 2;

  const gerak = salinan.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      {
        // Tahap 1: mengecil di tempat
        transform: geser(
          0.45,
          pusatAwalX,
          pusatAwalY - 10,
        ),
        opacity: 1,
        offset: 0.35,
        easing: "cubic-bezier(0.55, 0, 0.85, 0.4)",
      },
      {
        // Tahap 2: meluncur ke ikon keranjang sambil memudar
        transform: geser(skalaAkhir, pusatTujuanX, pusatTujuanY),
        opacity: 0.2,
      },
    ],
    { duration: 800, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
  );

  const selesai = function () {
    salinan.remove();
    pantulkanLencana();
  };
  gerak.onfinish = selesai;
  gerak.oncancel = function () {
    salinan.remove();
  };
}

// Fitur tombol tambah ke keranjang
ambil("tombol-keranjang").addEventListener("click", function () {
  const jumlahDitambah = Number(ambil("isian-jumlah").value) || 1;
  const berhasil = masukKeranjang();
  if (berhasil) {
    animasiKeKeranjang(jumlahDitambah);
    tampilkanToast(
      jumlahDitambah + "× " + menuDibuka.dataset.nama + " ditambahkan ke keranjang",
    );
    const tombol = this;
    tombol.textContent = "Ditambahkan ✓";
    setTimeout(function () {
      tombol.textContent = "Tambah ke keranjang";
    }, 1500);
  }
});

// Fitur tombol pesan sekarang
ambil("tombol-pesan").addEventListener("click", function () {
  const berhasil = masukKeranjang();
  if (berhasil) {
    location.hash = "#/checkout";
  }
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
// Mengembalikan true jika berhasil, false jika gagal
function simpanKeranjang() {
  const berhasil = tulisData("keranjang", keranjang);
  if (berhasil) {
    ambil("lencana-keranjang").textContent = jumlahBarang();
  }
  return berhasil;
}

// Fitur paksa kosongkan keranjang (fallback jika simpanKeranjang gagal)
// Mengembalikan true hanya jika localStorage benar-benar tidak menyimpan data keranjang lagi
function paksaKosongkanKeranjang() {
  keranjang = [];
  // Coba simpan array kosong
  let berhasil = tulisData("keranjang", []);
  if (berhasil) {
    // Verifikasi: pastikan localStorage benar-benar kosong
    const verif = bacaData("keranjang", null);
    if (verif === null || (Array.isArray(verif) && verif.length === 0)) {
      ambil("lencana-keranjang").textContent = "0";
      return true;
    }
    // Jika verifikasi gagal, lanjut ke fallback removeItem
    berhasil = false;
  }
  // Fallback: hapus langsung dari localStorage
  try {
    localStorage.removeItem("keranjang");
    // Verifikasi setelah removeItem
    const verif = bacaData("keranjang", null);
    if (verif === null || (Array.isArray(verif) && verif.length === 0)) {
      ambil("lencana-keranjang").textContent = "0";
      return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
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
  // Fitur verifikasi sebelum menghapus menu dari keranjang
  if (aksi === "hapus") {
    const menu = cariKartu(id);
    const nama = menu ? menu.dataset.nama : "menu ini";
    konfirmasi(
      "Hapus dari keranjang?",
      "Yakin ingin menghapus " + nama + " dari keranjang?",
      "Hapus",
    ).then(function (yakin) {
      if (yakin) {
        sobekBaris(e.target.closest(".baris-keranjang"), function () {
          ubahKeranjang(aksi, id);
          // Toast hanya jika menu benar-benar sudah terhapus (bukan rollback)
          const masihAda = keranjang.some(function (i) {
            return i.id === id;
          });
          if (!masihAda) {
            tampilkanToast(nama + " dihapus dari keranjang");
          }
        });
      }
    });
    return;
  }
  ubahKeranjang(aksi, id);
});

// Fitur animasi baris keranjang disobek jadi banyak serpihan yang jatuh dan memudar,
// setelah itu panggil selesai()
let sedangSobek = false;
function sobekBaris(baris, selesai) {
  if (
    !baris ||
    sedangSobek ||
    !baris.animate ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    selesai();
    return;
  }
  const kotak = baris.getBoundingClientRect();
  if (kotak.width === 0 || kotak.height === 0) {
    selesai();
    return;
  }
  sedangSobek = true;

  // Bagi baris jadi kisi serpihan dengan sudut yang digeser acak (bergerigi).
  // Titik sudut dipakai bersama antar serpihan supaya tepinya saling pas.
  const kolom = 8;
  const baber = 3;
  const acak = function (min, max) {
    return min + Math.random() * (max - min);
  };
  const sudut = [];
  for (let r = 0; r <= baber; r++) {
    sudut.push([]);
    for (let c = 0; c <= kolom; c++) {
      let x = (c / kolom) * 100;
      let y = (r / baber) * 100;
      if (c > 0 && c < kolom) {
        x += acak(-4.5, 4.5);
      }
      if (r > 0 && r < baber) {
        y += acak(-14, 14);
      }
      sudut[r].push([x, y]);
    }
  }

  const wadah = baris.parentNode;
  const serpihan = [];
  for (let r = 0; r < baber; r++) {
    for (let c = 0; c < kolom; c++) {
      const t = [
        sudut[r][c],
        sudut[r][c + 1],
        sudut[r + 1][c + 1],
        sudut[r + 1][c],
      ];
      const clip =
        "polygon(" +
        t
          .map(function (v) {
            return v[0].toFixed(1) + "% " + v[1].toFixed(1) + "%";
          })
          .join(", ") +
        ")";
      const pusatX = (t[0][0] + t[1][0] + t[2][0] + t[3][0]) / 4;
      const pusatY = (t[0][1] + t[1][1] + t[2][1] + t[3][1]) / 4;

      const el = baris.cloneNode(true);
      el.setAttribute("aria-hidden", "true");
      el.inert = true;
      Object.assign(el.style, {
        position: "fixed",
        left: kotak.left + "px",
        top: kotak.top + "px",
        width: kotak.width + "px",
        height: kotak.height + "px",
        margin: "0",
        zIndex: "1000",
        pointerEvents: "none",
        clipPath: clip,
        transformOrigin: pusatX + "% " + pusatY + "%",
        willChange: "transform, opacity",
      });
      // Taruh di wadah yang sama supaya gaya CSS baris keranjang tetap berlaku
      wadah.appendChild(el);
      serpihan.push({ el: el, pusatX: pusatX });
    }
  }

  // Sembunyikan baris asli supaya tata letak tidak melompat selama animasi
  baris.style.visibility = "hidden";

  let tersisa = serpihan.length;
  serpihan.forEach(function (sp) {
    // Serpihan di tepi menyebar ke samping, semuanya jatuh dengan putaran acak
    const arah = (sp.pusatX - 50) / 50;
    const geserX = arah * acak(20, 70) + acak(-15, 15);
    const jatuh = acak(140, 280);
    const putar = acak(-45, 45);
    const tunda = acak(0, 300);
    const gerak = sp.el.animate(
      [
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
        {
          transform:
            "translate(" +
            geserX * 0.25 +
            "px, " +
            -acak(2, 8) +
            "px) rotate(" +
            putar * 0.2 +
            "deg)",
          opacity: 1,
          offset: 0.15,
        },
        {
          transform:
            "translate(" +
            geserX +
            "px, " +
            jatuh +
            "px) rotate(" +
            putar +
            "deg)",
          opacity: 0,
        },
      ],
      {
        duration: acak(650, 950),
        delay: tunda,
        easing: "cubic-bezier(0.4, 0, 0.9, 0.6)",
        fill: "both",
      },
    );
    gerak.onfinish = function () {
      sp.el.remove();
      tersisa -= 1;
      if (tersisa === 0) {
        sedangSobek = false;
        selesai();
      }
    };
  });
}

// Fitur ubah isi keranjang (kurang, tambah, hapus)
function ubahKeranjang(aksi, id) {
  const item = keranjang.find(function (i) {
    return i.id === id;
  });
  if (!item) {
    return;
  }

  // Simpan salinan keranjang sebelum perubahan untuk rollback jika gagal
  const keranjangSebelumnya = keranjang.map(function (i) {
    return { id: i.id, jumlah: i.jumlah };
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

  const berhasil = simpanKeranjang();

  if (!berhasil) {
    // Rollback ke kondisi sebelumnya
    keranjang = keranjangSebelumnya;
    // Perbarui lencana jumlah keranjang
    ambil("lencana-keranjang").textContent = jumlahBarang();
    // Tampilkan pesan kesalahan
    alert("Gagal menyimpan perubahan keranjang. Silakan coba lagi.");
    // Render ulang keranjang menggunakan data yang sudah dipulihkan
    tampilkanKeranjang();
    return;
  }

  // Jika berhasil, tampilkan perubahan seperti biasa
  tampilkanKeranjang();
}
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
// Proteksi double submission checkout
let checkoutSedangDiproses = false;

// Fitur buat pesanan (form sudah divalidasi oleh HTML)
ambil("form-checkout").addEventListener("submit", function (e) {
  e.preventDefault();

  // Cegah double submission
  if (checkoutSedangDiproses) {
    return;
  }

  if (keranjang.length === 0) {
    location.hash = "#/keranjang";
    return;
  }

  // Buat ID unik transaksi
  const idTransaksi = buatIdTransaksi();

  const pesanan = {
    id: idTransaksi,
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

  // Set flag proteksi double submission
  checkoutSedangDiproses = true;
  const tombolKirim = document.querySelector('button[form="form-checkout"]');
  const teksAsli = tombolKirim.textContent;
  tombolKirim.textContent = "Memproses...";
  tombolKirim.disabled = true;

  try {
    // Simpan ke riwayatPesanan (array, tidak menimpa)
    const riwayat = bacaData("riwayatPesanan", []);
    riwayat.unshift(pesanan); // Pesanan terbaru di depan
    const berhasilSimpanRiwayat = tulisData("riwayatPesanan", riwayat);

    if (!berhasilSimpanRiwayat) {
      throw new Error("Gagal menyimpan pesanan ke localStorage");
    }

    // Kompatibilitas mundur: simpan juga ke pesananTerakhir untuk halaman sukses lama
    tulisData("pesananTerakhir", pesanan);

    // HAPUS keranjang HANYA setelah transaksi berhasil disimpan
    keranjang = [];
    const berhasilKosongkanKeranjang = simpanKeranjang();

    if (!berhasilKosongkanKeranjang) {
      // Fallback: paksa kosongkan keranjang untuk mencegah keranjang lama muncul setelah reload
      const berhasilPaksa = paksaKosongkanKeranjang();
      if (!berhasilPaksa) {
        // Critical: tidak bisa kosongkan keranjang, user harus diinformasikan
        console.error(
          "Kritis: Gagal mengosongkan keranjang setelah transaksi. User perlu clear manual.",
        );
        alert(
          "Pesanan berhasil dibuat, tapi keranjang gagal dikosongkan. Silakan refresh halaman atau hapus keranjang manual.",
        );
      }
    }

    this.reset();
    periksaCheckout();
    tampilkanToast("Pesanan berhasil diproses");
    // Redirect ke halaman sukses dengan ID transaksi
    location.hash = "#/sukses/" + idTransaksi;
  } catch (error) {
    // Tampilkan pesan kesalahan, pertahankan isi keranjang
    alert("Gagal membuat pesanan: " + error.message + ". Silakan coba lagi.");
  } finally {
    // Reset flag dan tombol
    checkoutSedangDiproses = false;
    tombolKirim.textContent = teksAsli;
    tombolKirim.disabled = false;
  }
});

/* ===== MENU SUKSES ===== */
// Fitur rincian pesanan yang baru dibuat
// Mencari pesanan berdasarkan ID dari URL hash (#/sukses/ID_TRANSAKSI)
function tampilkanSukses(idTransaksi) {
  const riwayat = bacaData("riwayatPesanan", []);

  // Validasi data riwayat - pastikan array dan item memiliki ID
  const riwayatValid = Array.isArray(riwayat)
    ? riwayat.filter(function (p) {
        return p && typeof p.id === "string";
      })
    : [];

  let pesanan = null;
  let idDitemukan = false;

  if (idTransaksi) {
    // URL mengandung ID transaksi - wajib cocok, tidak fallback ke pesanan lain
    pesanan =
      riwayatValid.find(function (p) {
        return p.id === idTransaksi;
      }) || null;
    idDitemukan = !!pesanan;
  } else {
    // Tidak ada ID di URL - fallback ke pesanan terbaru (kompatibilitas lama)
    pesanan =
      (riwayatValid.length > 0 ? riwayatValid[0] : null) ||
      bacaData("pesananTerakhir", null);
    idDitemukan = !!pesanan;
  }

  // Tampilkan status tidak ditemukan jika ID ada tapi tidak cocok
  const adaIdTapiTidakCocok = idTransaksi && !idDitemukan;

  ambil("isi-sukses").hidden = adaIdTapiTidakCocok || !pesanan;
  ambil("sukses-tidak-ada").hidden = !(adaIdTapiTidakCocok || !pesanan);

  if (adaIdTapiTidakCocok) {
    // ID transaksi ada di URL tapi tidak ditemukan di riwayat
    // Buat elemen dengan createElement untuk keamanan dan tautan yang bisa diklik
    const wadah = ambil("sukses-tidak-ada");
    wadah.replaceChildren();

    const teks = document.createTextNode(
      "Pesanan dengan ID " + idTransaksi + " tidak ditemukan. ",
    );
    wadah.appendChild(teks);

    const tautan = document.createElement("a");
    tautan.href = "#/";
    tautan.className = "tautan";
    tautan.textContent = "Kembali ke katalog";
    wadah.appendChild(tautan);

    return;
  }

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

/* ===== FITUR ANIMASI PERPINDAHAN & MASUK HALAMAN ===== */
// Fitur animasi transisi halaman: bagian yang aktif muncul dengan fade + slide ringan.
// Tanpa fill supaya tidak menyisakan gaya pada elemen setelah animasi selesai.
function animasiTransisiHalaman(halaman) {
  if (tahanAnimasiHalaman) {
    return;
  }
  const bagianEl = document.getElementById("halaman-" + halaman);
  if (
    !bagianEl ||
    !bagianEl.animate ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  bagianEl.animate(
    [
      { opacity: 0, transform: "translateY(14px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
}

// Fitur animasi masuk halaman login: kartu muncul dengan fade + slide,
// lalu elemen formulir menyusul satu per satu (stagger ringan).
// Desain dan mekanisme autentikasi tidak diubah, ini murni tampilan.
function animasiMasukLogin() {
  if (tahanAnimasiHalaman) {
    return;
  }
  const kartu = document.querySelector(".masuk");
  if (
    !kartu ||
    !kartu.animate ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  kartu.animate(
    [
      { opacity: 0, transform: "translateY(18px) scale(0.98)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ],
    { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
  kartu.querySelectorAll(".masuk-form > *").forEach(function (el, i) {
    el.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 280,
        delay: 80 + i * 40,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "backwards",
      },
    );
  });
}

// Fitur animasi centang sukses: ikon muncul dengan scale + fade.
// Hanya jalan bila pesanan benar-benar ditemukan (bukan status "tidak ada").
function animasiCekSukses() {
  const isi = ambil("isi-sukses");
  if (
    !isi ||
    isi.hidden ||
    !isi.animate ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  const ikon = isi.querySelector(".sukses-ikon");
  if (ikon) {
    ikon.animate(
      [
        { opacity: 0, transform: "scale(0.3)" },
        { opacity: 1, transform: "scale(1.12)", offset: 0.7 },
        { opacity: 1, transform: "scale(1)" },
      ],
      {
        duration: 420,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        fill: "backwards",
      },
    );
  }
  // Isi lainnya (judul, ucapan, struk, tombol) menyusul bergantian
  isi.querySelectorAll(":scope > *:not(.sukses-ikon)").forEach(function (
    el,
    i,
  ) {
    el.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 280,
        delay: 120 + i * 50,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "backwards",
      },
    );
  });
}

// Fitur pindah halaman berdasarkan hash URL, contoh: #/detail/3, #/sukses/TRX123
function aturHalaman() {
  const hash = location.hash.replace("#/", "");
  const bagian = hash.split("/");
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
  // Fitur animasi pergantian tampilan (login punya animasi masuk tersendiri)
  if (halaman === "login") {
    animasiMasukLogin();
  } else {
    animasiTransisiHalaman(halaman);
  }
  if (halaman === "katalog") {
    tampilkanKatalog();
  }
  if (halaman === "login") {
    ambil("login-salah").hidden = true;
  }
  if (halaman === "detail") {
    tampilkanDetail(bagian[1]);
    animasiMasukDetail();
  }
  if (halaman === "keranjang") {
    tampilkanKeranjang();
    animasiDaftarMasuk("#daftar-keranjang .baris-keranjang, #keranjang-isi .struk");
  }
  if (halaman === "checkout") {
    tampilkanCheckout();
    animasiDaftarMasuk("#form-checkout .kotak, #halaman-checkout .struk");
  }
  if (halaman === "sukses") {
    // bagian[1] berisi ID transaksi jika ada (format: #/sukses/ID_TRANSAKSI)
    tampilkanSukses(bagian[1]);
    animasiCekSukses();
  }
  document.title = JUDUL[halaman] + " - Zieda Garden";
  const judulHalaman = document.querySelector("#halaman-" + halaman + " h1");
  if (judulHalaman && document.activeElement !== ambil("input-cari")) {
    judulHalaman.setAttribute("tabindex", "-1");
    judulHalaman.focus({ preventScroll: true });
  }
}
/* ===== FITUR ANIMASI MENGETIK PADA PLACEHOLDER CARI ===== */
// Placeholder mengetik "Cari <nama menu>..." bergantian sesuai daftar menu
(function () {
  const kolom = ambil("input-cari");
  const asli = kolom.placeholder;
  const daftar = Array.from(document.querySelectorAll("#grid-produk .kartu"))
    .map(function (k) {
      return k.dataset.nama;
    })
    .filter(Boolean);
  if (
    daftar.length === 0 ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  let timer = null;
  let indeks = 0;
  let aktif = false;

  function ketik(teks, posisi, menghapus) {
    if (!aktif) {
      return;
    }
    kolom.placeholder = "Cari " + teks.slice(0, posisi) + "|";
    let tunda = menghapus ? 45 : 90;
    if (!menghapus && posisi === teks.length) {
      // Selesai mengetik: berhenti sebentar sebelum dihapus
      kolom.placeholder = "Cari " + teks + "...";
      timer = setTimeout(function () {
        ketik(teks, posisi, true);
      }, 1400);
      return;
    }
    if (menghapus && posisi === 0) {
      // Selesai menghapus: lanjut ke menu berikutnya
      indeks = (indeks + 1) % daftar.length;
      timer = setTimeout(function () {
        ketik(daftar[indeks], 0, false);
      }, 350);
      return;
    }
    timer = setTimeout(function () {
      ketik(teks, posisi + (menghapus ? -1 : 1), menghapus);
    }, tunda);
  }

  function mulai() {
    if (aktif || kolom.value) {
      return;
    }
    aktif = true;
    ketik(daftar[indeks], 0, false);
  }
  function henti() {
    aktif = false;
    clearTimeout(timer);
    kolom.placeholder = asli;
  }

  // Berhenti saat kolom dipakai, lanjut lagi jika kosong dan tidak difokus
  kolom.addEventListener("focus", henti);
  kolom.addEventListener("blur", mulai);
  // Hemat tenaga saat tab tidak terlihat
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      henti();
    } else if (document.activeElement !== kolom) {
      mulai();
    }
  });
  mulai();
})();

/* ===== FITUR TOAST NOTIFIKASI ===== */
// Satu elemen toast dipakai bergantian; pesan yang sama berturut-turut diabaikan
let elemenToast = null;
let timerToast = null;
let pesanToastTerakhir = "";
let waktuToastTerakhir = 0;
function tampilkanToast(pesan) {
  const sekarang = Date.now();
  if (pesan === pesanToastTerakhir && sekarang - waktuToastTerakhir < 800) {
    return;
  }
  pesanToastTerakhir = pesan;
  waktuToastTerakhir = sekarang;
  if (!elemenToast) {
    elemenToast = document.createElement("div");
    elemenToast.className = "toast";
    elemenToast.setAttribute("role", "status");
    elemenToast.setAttribute("aria-live", "polite");
    document.body.appendChild(elemenToast);
  }
  elemenToast.textContent = pesan;
  // Paksa reflow agar animasi masuk berjalan juga saat toast sebelumnya masih tampil
  elemenToast.classList.remove("tampil");
  void elemenToast.offsetWidth;
  elemenToast.classList.add("tampil");
  clearTimeout(timerToast);
  timerToast = setTimeout(function () {
    elemenToast.classList.remove("tampil");
  }, 2600);
}

/* ===== FITUR SKELETON LOADING GAMBAR ===== */
// Wadah gambar diberi kelas "memuat" (shimmer) sampai gambar selesai atau gagal dimuat
(function () {
  const utama = document.querySelector("main");
  if (!utama) {
    return;
  }
  function awasi(img) {
    const wadah = img.parentElement;
    if (!wadah || !img.getAttribute("src") || img.complete) {
      return;
    }
    wadah.classList.add("memuat");
    function selesai() {
      wadah.classList.remove("memuat");
      img.removeEventListener("load", selesai);
      img.removeEventListener("error", selesai);
      clearTimeout(batas);
    }
    img.addEventListener("load", selesai);
    img.addEventListener("error", selesai);
    // Pengaman: skeleton tidak pernah tertinggal lebih dari 8 detik
    const batas = setTimeout(selesai, 8000);
  }
  function periksa(simpul) {
    if (simpul.nodeType !== 1) {
      return;
    }
    if (simpul.tagName === "IMG") {
      awasi(simpul);
    } else {
      simpul.querySelectorAll("img").forEach(awasi);
    }
  }
  periksa(utama);
  // Gambar yang dibuat atau diganti sumbernya lewat JavaScript (detail, keranjang, dll)
  new MutationObserver(function (catatan) {
    catatan.forEach(function (c) {
      if (c.type === "attributes") {
        awasi(c.target);
      } else {
        c.addedNodes.forEach(periksa);
      }
    });
  }).observe(utama, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });
})();

/* ===== FITUR SCROLL REVEAL ===== */
// Kartu menu, kategori, dan info toko muncul halus sekali saja saat masuk layar
(function () {
  if (
    !("IntersectionObserver" in window) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  const pengamat = new IntersectionObserver(
    function (daftar) {
      daftar.forEach(function (d) {
        if (!d.isIntersecting) {
          return;
        }
        const el = d.target;
        pengamat.unobserve(el);
        el.classList.add("tampil");
        // Setelah selesai, lepas kelas supaya efek hover kartu kembali normal
        setTimeout(function () {
          el.classList.remove("reveal", "tampil");
          el.style.transitionDelay = "";
        }, 1200);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -30px 0px" },
  );
  function pasang(selektor, selang, maks) {
    document.querySelectorAll(selektor).forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = (i % maks) * selang + "ms";
      pengamat.observe(el);
    });
  }
  pasang("#grid-produk .kartu", 80, 4);
  pasang(".sisi", 0, 1);
  pasang(".kaki-kolom > *", 120, 3);
})();

/* ===== FITUR ANIMASI KARTU DIPILIH ===== */
// Kartu terbang ke tengah sambil berbalik (tampak siluet halaman detail), memutar jadi landscape,
// memenuhi layar, lalu halaman berganti di baliknya tanpa terlihat
const EASE_HALUS = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_PUTAR = "cubic-bezier(0.65, 0, 0.35, 1)";
function tanpaGerak() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Saat true, animasi masuk bawaan halaman ditahan (penutup layar yang mengurusnya)
let tahanAnimasiHalaman = false;

(function () {
  let sedangMemilih = false;

  document.addEventListener("click", function (e) {
    const tautan = e.target.closest(".kartu-tautan");
    if (
      !tautan ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0
    ) {
      return; // Ctrl/Cmd/klik tengah tetap membuka tab baru
    }
    const kartu = tautan.closest(".kartu");
    const tujuan = tautan.getAttribute("href");
    if (!kartu || !document.body.animate || tanpaGerak()) {
      return; // tautan bekerja seperti biasa
    }
    const r = kartu.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      return;
    }
    e.preventDefault();
    if (sedangMemilih) {
      return;
    }
    sedangMemilih = true;

    const W = r.width;
    const H = r.height;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    // Ukuran akhir sebelum diputar 90deg: setelah diputar, lebar tampil = hF, tinggi tampil = wF
    const wF = Math.ceil(vh) + 4;
    const hF = Math.ceil(vw) + 4;
    const px = function (n) {
      return n + "px";
    };

    // Latar gelap di belakang kartu (juga mencegah klik saat animasi)
    const tirai = document.createElement("div");
    tirai.className = "balik-tirai";
    tirai.setAttribute("aria-hidden", "true");

    // Wadah 3D tepat di atas kartu asli
    const wadah = document.createElement("div");
    wadah.className = "balik-wadah";
    wadah.setAttribute("aria-hidden", "true");
    Object.assign(wadah.style, {
      left: px(r.left),
      top: px(r.top),
      width: px(W),
      height: px(H),
    });
    const kotak = document.createElement("div");
    kotak.className = "balik-kotak";

    // Sisi depan: salinan kartu
    const depan = document.createElement("div");
    depan.className = "balik-sisi balik-depan";
    const salinan = kartu.cloneNode(true);
    salinan.classList.remove("reveal", "tampil");
    salinan.style.transitionDelay = "";
    salinan.inert = true;
    salinan.querySelectorAll(".memuat").forEach(function (el) {
      el.classList.remove("memuat");
    });
    depan.appendChild(salinan);

    // Sisi belakang: siluet tata letak halaman detail (header + panel detail menu)
    const belakang = document.createElement("div");
    belakang.className = "balik-sisi balik-belakang";
    const isi = document.createElement("div");
    isi.className = "balik-isi";
    isi.style.width = px(H);
    isi.style.height = px(W);

    // Halaman detail masih tersembunyi, jadi aman diisi data menu ini lebih dulu
    tampilkanDetail(kartu.dataset.id);
    const replika = document.createElement("div");
    replika.className = "balik-halaman";
    replika.inert = true;
    // Ukuran layar sebenarnya; diperkecil muat ke dalam kartu, lalu membesar jadi 1:1
    const skalaAwal = Math.min(H / vw, W / vh);
    Object.assign(replika.style, {
      width: px(vw),
      height: px(vh),
      marginLeft: px(-vw / 2),
      marginTop: px(-vh / 2),
      transform: "scale(" + skalaAwal + ")",
    });
    const kepalaSalinan = document.querySelector(".kepala").cloneNode(true);
    const utamaSalinan = document.createElement("div");
    utamaSalinan.className = "wadah balik-utama";
    ambil("halaman-detail").childNodes.forEach(function (n) {
      utamaSalinan.appendChild(n.cloneNode(true));
    });
    utamaSalinan.querySelectorAll("[id]").forEach(function (el) {
      el.removeAttribute("id");
    });
    replika.append(kepalaSalinan, utamaSalinan);
    isi.appendChild(replika);
    belakang.appendChild(isi);
    kotak.append(depan, belakang);
    wadah.appendChild(kotak);

    kartu.style.visibility = "hidden";
    document.body.append(tirai, wadah);

    // Satu garis waktu utuh: 0 - TENGAH = terbang ke tengah sambil berbalik,
    // TENGAH - TAHAN = jeda singkat, TAHAN - 1 = memutar 90deg dan memenuhi layar
    const DURASI = 1750;
    const TENGAH = 0.44;
    const TAHAN = 0.5;
    const KURVA_TERBANG = "cubic-bezier(0.45, 0, 0.15, 1)";
    const KURVA_BUKA = "cubic-bezier(0.7, 0, 0.2, 1)";
    const diTengah = {
      left: px((vw - W) / 2),
      top: px((vh - H) / 2),
      width: px(W),
      height: px(H),
      transform: "rotate(0deg) scale(1.18)",
    };

    const gerak = wadah.animate(
      [
        {
          offset: 0,
          left: px(r.left),
          top: px(r.top),
          width: px(W),
          height: px(H),
          transform: "rotate(0deg) scale(1)",
          easing: KURVA_TERBANG,
        },
        Object.assign({ offset: TENGAH, easing: "linear" }, diTengah),
        Object.assign({ offset: TAHAN, easing: KURVA_BUKA }, diTengah),
        {
          offset: 1,
          left: px((vw - wF) / 2),
          top: px((vh - hF) / 2),
          width: px(wF),
          height: px(hF),
          transform: "rotate(90deg) scale(1)",
        },
      ],
      { duration: DURASI, fill: "forwards" },
    );
    kotak.animate(
      [
        { offset: 0, transform: "rotateY(0deg)", easing: KURVA_TERBANG },
        { offset: TENGAH, transform: "rotateY(180deg)" },
        { offset: 1, transform: "rotateY(180deg)" },
      ],
      { duration: DURASI, fill: "forwards" },
    );
    // Isi sisi belakang selalu seukuran sisinya (lebar/tinggi tertukar karena diputar)
    isi.animate(
      [
        { offset: 0, width: px(H), height: px(W), easing: KURVA_TERBANG },
        { offset: TENGAH, width: px(H), height: px(W), easing: "linear" },
        { offset: TAHAN, width: px(H), height: px(W), easing: KURVA_BUKA },
        { offset: 1, width: px(hF), height: px(wF) },
      ],
      { duration: DURASI, fill: "forwards" },
    );
    // Siluet halaman membesar dari miniatur sampai pas 1:1 dengan halaman detail asli
    const skAwal = "scale(" + skalaAwal + ")";
    replika.animate(
      [
        { offset: 0, transform: skAwal, easing: KURVA_TERBANG },
        { offset: TENGAH, transform: skAwal, easing: "linear" },
        { offset: TAHAN, transform: skAwal, easing: KURVA_BUKA },
        { offset: 1, transform: "scale(1)" },
      ],
      { duration: DURASI, fill: "forwards" },
    );
    tirai.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: DURASI * TENGAH,
      easing: "ease-out",
      fill: "forwards",
    });

    gerak.finished
      .then(function () {
        // Layar sudah tertutup penuh: ganti halaman di baliknya
        return new Promise(function (selesai) {
          tahanAnimasiHalaman = true;
          window.addEventListener("hashchange", selesai, { once: true });
          setTimeout(selesai, 400);
          location.hash = tujuan;
        });
      })
      .then(function () {
        tahanAnimasiHalaman = false;
        // Tunggu dua frame agar halaman baru sempat tergambar di balik penutup
        return new Promise(function (selesai) {
          requestAnimationFrame(function () {
            requestAnimationFrame(selesai);
          });
        });
      })
      .then(function () {
        // Penutup memudar, isi halaman baru masuk bersamaan
        const halaman = document.body.dataset.halaman;
        if (halaman === "detail") {
          animasiMasukDetail();
        } else if (halaman === "login") {
          animasiMasukLogin();
        }
        return wadah.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 650,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "forwards",
        }).finished;
      })
      .catch(function () {
        tahanAnimasiHalaman = false;
        if (location.hash !== tujuan) {
          location.hash = tujuan;
        }
      })
      .finally(function () {
        tahanAnimasiHalaman = false;
        wadah.remove();
        tirai.remove();
        kartu.style.visibility = "";
        sedangMemilih = false;
      });
  });
})();

/* ===== FITUR ANIMASI TAMBAHAN: detail, keranjang, checkout, total harga ===== */
// Elemen detail masuk bergantian: foto dari kiri, info menyusul dari bawah
function animasiMasukDetail() {
  if (tahanAnimasiHalaman || tanpaGerak() || !document.body.animate) {
    return;
  }
  const gambar = document.querySelector("#isi-detail .detail-gambar");
  if (gambar && !ambil("isi-detail").hidden) {
    gambar.animate(
      [
        { opacity: 0, transform: "translateX(-24px) scale(0.97)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 600, easing: EASE_HALUS, fill: "backwards" },
    );
  }
  document
    .querySelectorAll("#isi-detail .detail-info > *")
    .forEach(function (el, i) {
      el.animate(
        [
          { opacity: 0, transform: "translateY(14px)" },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: 480,
          delay: 140 + i * 70,
          easing: EASE_HALUS,
          fill: "backwards",
        },
      );
    });
}

// Daftar item muncul satu per satu (dipakai saat halaman keranjang/checkout dibuka)
function animasiDaftarMasuk(selektor) {
  if (tanpaGerak() || !document.body.animate) {
    return;
  }
  document.querySelectorAll(selektor).forEach(function (el, i) {
    el.animate(
      [
        { opacity: 0, transform: "translateY(16px)" },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: 450,
        delay: 80 + i * 70,
        easing: EASE_HALUS,
        fill: "backwards",
      },
    );
  });
}

// Angka total membal sedikit saat jumlah diubah
function pantulTotal() {
  if (tanpaGerak() || !document.body.animate) {
    return;
  }
  document
    .querySelectorAll(
      ".kasir-subtotal, .kasir-total strong, .tombol-pesan .total-teks",
    )
    .forEach(function (el) {
      el.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.14)", offset: 0.4 },
          { transform: "scale(1)" },
        ],
        { duration: 340, easing: EASE_HALUS },
      );
    });
}
["tombol-kurang", "tombol-tambah"].forEach(function (id) {
  ambil(id).addEventListener("click", pantulTotal);
});
ambil("isian-jumlah").addEventListener("change", pantulTotal);

/* ===== FITUR MULAI ===== */
window.addEventListener("hashchange", aturHalaman);
simpanKeranjang();
aturHalaman();
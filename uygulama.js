/* Meydan Taksi - sayfa davranışları
   Ayarlar için ayarlar.js dosyasını düzenleyin; bu dosyaya dokunmanız gerekmez. */
(function () {
  "use strict";

  var S = window.SITE || {};

  function $(secici, kok) { return (kok || document).querySelector(secici); }
  function $$(secici, kok) { return Array.prototype.slice.call((kok || document).querySelectorAll(secici)); }

  /* ---------- Telefon ve WhatsApp ---------- */

  function uluslararasi(metin) {
    var r = String(metin || "").replace(/\D/g, "");
    if (r.indexOf("00") === 0) { r = r.slice(2); }
    if (r.charAt(0) === "0") { r = "90" + r.slice(1); }
    else if (r.length === 10) { r = "90" + r; }
    return r;
  }

  var telNo = uluslararasi(S.telefon);
  var waNo = uluslararasi(S.whatsapp || S.telefon);

  function waBaglanti(mesaj) {
    return "https://wa.me/" + waNo + "?text=" + encodeURIComponent(mesaj);
  }

  $$("[data-tel]").forEach(function (a) {
    a.setAttribute("href", "tel:+" + telNo);
  });

  $$("[data-tel-text]").forEach(function (e) {
    e.textContent = S.telefon || "";
  });

  $$("[data-wa]").forEach(function (a) {
    var mesaj = a.getAttribute("data-mesaj") || S.karsilama || "Merhaba, taksi istiyorum.";
    a.setAttribute("href", waBaglanti(mesaj));
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
  });

  /* ---------- Adres, saat, harita ---------- */

  function bilgiSatiri(ad, deger) {
    var satir = $('[data-satir="' + ad + '"]');
    if (!satir) { return; }
    if (!deger) { satir.parentNode.removeChild(satir); return; }
    $("dd", satir).textContent = deger;
  }
  bilgiSatiri("adres", S.adres);
  bilgiSatiri("saat", S.saatler);

  var haritaKutu = $("#harita-kutu");
  var yolTarifi = $("#yol-tarifi");
  var iletisim = $("#iletisim");
  if (S.harita) {
    var sorgu = encodeURIComponent(S.harita);
    $("iframe", haritaKutu).setAttribute("src", "https://www.google.com/maps?q=" + sorgu + "&output=embed");
    haritaKutu.hidden = false;
    iletisim.classList.add("harita-var");
    if (yolTarifi) {
      yolTarifi.setAttribute("href", "https://www.google.com/maps/search/?api=1&query=" + sorgu);
      yolTarifi.setAttribute("target", "_blank");
      yolTarifi.setAttribute("rel", "noopener");
      yolTarifi.hidden = false;
    }
  }

  var yil = $("[data-yil]");
  if (yil) { yil.textContent = new Date().getFullYear(); }

  /* ---------- Arama motorları için işletme bilgisi ---------- */

  var ld = {
    "@context": "https://schema.org",
    "@type": "TaxiService",
    "name": "Meydan Taksi",
    "telephone": "+" + telNo,
    "url": location.href.split("#")[0]
  };
  if (S.adres) {
    ld.address = { "@type": "PostalAddress", "streetAddress": S.adres, "addressCountry": "TR" };
  }
  var ldEtiket = document.createElement("script");
  ldEtiket.type = "application/ld+json";
  ldEtiket.textContent = JSON.stringify(ld);
  document.head.appendChild(ldEtiket);

  /* ---------- Mobil menü ---------- */

  var menu = $("#menu");
  var menuDugme = $(".menu-dugme");

  function menuDurum(ac) {
    menu.classList.toggle("acik", ac);
    menuDugme.setAttribute("aria-expanded", ac ? "true" : "false");
    menuDugme.textContent = ac ? "Kapat" : "Menü";
  }

  if (menu && menuDugme) {
    menuDugme.addEventListener("click", function () {
      menuDurum(!menu.classList.contains("acik"));
    });
    $$("a", menu).forEach(function (a) {
      a.addEventListener("click", function () { menuDurum(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("acik")) {
        menuDurum(false);
        menuDugme.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 900) { menuDurum(false); }
    });
  }

  /* ---------- Taksi çağırma formu (WhatsApp'a mesaj hazırlar) ---------- */

  var form = $("#cagri-formu");
  var durum = $("#form-durum");
  var konum = null;

  function durumYaz(metin, hata) {
    durum.textContent = metin;
    durum.classList.toggle("hata", !!hata);
  }

  function yerelTarih(d) {
    function p(n) { return String(n).padStart(2, "0"); }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  if (form) {
    var zamanSec = $("#zaman");
    var zamanKutu = $("#zaman-kutu");
    var zamanDeger = $("#zaman-deger");
    var konumDugme = $("#konum-dugme");

    zamanDeger.min = yerelTarih(new Date());

    zamanSec.addEventListener("change", function () {
      var sonra = zamanSec.value === "sonra";
      zamanKutu.hidden = !sonra;
      if (sonra) { zamanDeger.focus(); }
    });

    konumDugme.addEventListener("click", function () {
      if (!navigator.geolocation) {
        durumYaz("Bu tarayıcı konum paylaşamıyor. Adresi elle yazın.", true);
        return;
      }
      konumDugme.disabled = true;
      durumYaz("Konumunuz alınıyor...", false);
      navigator.geolocation.getCurrentPosition(
        function (p) {
          konum = { enlem: p.coords.latitude.toFixed(6), boylam: p.coords.longitude.toFixed(6) };
          konumDugme.disabled = false;
          konumDugme.querySelector("span").textContent = "Konum eklendi";
          durumYaz("Konumunuz mesaja eklenecek.", false);
        },
        function () {
          konumDugme.disabled = false;
          durumYaz("Konum alınamadı. İzin vermediyseniz adresi elle yazabilirsiniz.", true);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var nereden = $("#nereden").value.trim();
      var nereye = $("#nereye").value.trim();
      var ad = $("#ad").value.trim();

      if (!nereden && !konum) {
        durumYaz("Neredesiniz? Adresi yazın ya da \"Konumumu ekle\" düğmesine dokunun.", true);
        $("#nereden").focus();
        return;
      }

      var zaman = "Hemen";
      if (zamanSec.value === "sonra") {
        if (!zamanDeger.value) {
          durumYaz("Gün ve saati seçin.", true);
          zamanDeger.focus();
          return;
        }
        zaman = new Date(zamanDeger.value).toLocaleString("tr-TR", {
          day: "numeric", month: "long", weekday: "long", hour: "2-digit", minute: "2-digit"
        });
      }

      var satirlar = [S.karsilama || "Merhaba, taksi istiyorum."];
      if (nereden) { satirlar.push("Nereden: " + nereden); }
      if (konum) { satirlar.push("Konumum: https://maps.google.com/?q=" + konum.enlem + "," + konum.boylam); }
      if (nereye) { satirlar.push("Nereye: " + nereye); }
      satirlar.push("Kişi sayısı: " + $("#kisi").value);
      satirlar.push("Zaman: " + zaman);
      if (ad) { satirlar.push("Adım: " + ad); }

      durumYaz("WhatsApp açılıyor. Mesajı göndermeyi unutmayın.", false);

      var adres = waBaglanti(satirlar.join("\n"));
      var pencere = window.open(adres, "_blank");
      if (pencere) {
        try { pencere.opener = null; } catch (hata) { /* yoksay */ }
      } else {
        window.location.href = adres;
      }
    });
  }

  /* ---------- Fotoğraflar ---------- */

  // Yerelde (bilgisayarınızda) açıldığında boş kutularda dosya adı ipucu gösterilir.
  var yerel = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (yerel) { document.documentElement.classList.add("yerel"); }

  // Fotoğraf .jpg değilse .jpeg, .png ve .webp uzantıları da denenir.
  var UZANTILAR = ["jpg", "jpeg", "png", "webp"];

  $$(".foto img").forEach(function (img) {
    var taban = img.getAttribute("data-ad");
    var kutu = img.closest(".foto");
    var dugme = $(".foto__ac", kutu);
    var sira = 1; // 0. uzantı (jpg) HTML içinde zaten denendi

    function sonrakiniDene() {
      if (sira >= UZANTILAR.length) {
        kutu.classList.add("bos");
        dugme.disabled = true;
        return;
      }
      img.src = taban + "." + UZANTILAR[sira];
      sira += 1;
    }

    img.addEventListener("error", sonrakiniDene);
    img.addEventListener("load", function () {
      kutu.classList.remove("bos");
      dugme.disabled = false;
    });

    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
      sonrakiniDene();
    }
  });

  var buyuk = $("#buyuk");
  if (buyuk && typeof buyuk.showModal === "function") {
    var buyukResim = $("img", buyuk);
    $$(".foto__ac").forEach(function (dugme) {
      dugme.addEventListener("click", function () {
        var resim = $("img", dugme);
        buyukResim.src = resim.currentSrc || resim.src;
        buyukResim.alt = resim.alt;
        buyuk.showModal();
      });
    });
    buyuk.addEventListener("click", function () { buyuk.close(); });
  }
})();

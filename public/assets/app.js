// ---------- GLOBAL CONFIG ----------
const API = "/api";
let TOKEN = localStorage.getItem("token") || "";
let CURRENT_LANG = localStorage.getItem("lang") || "tr";

// ---------- I18N (Dil Sistemi) ----------
const I18N = {
  tr: {
    login_title: "Portal Giriş",
    login_phone: "Telefon",
    login_password: "Şifre",
    login_button: "Giriş Yap",

    dashboard_title: "Müşteri Paneli",
    new_request: "Yeni EX1 Talebi Oluştur",
    eori_placeholder: "EORI",
    create_request_button: "Talep Oluştur",
    my_requests: "Taleplerim",

    admin_title: "Admin Paneli",
    requests_list: "Tüm EX1 Talepleri",
    users_list: "Kullanıcı Yönetimi"
  },
  en: {
    login_title: "Portal Login",
    login_phone: "Phone",
    login_password: "Password",
    login_button: "Login",

    dashboard_title: "Customer Panel",
    new_request: "Create New EX1 Request",
    eori_placeholder: "EORI Number",
    create_request_button: "Create Request",
    my_requests: "My Requests",

    admin_title: "Admin Panel",
    requests_list: "All EX1 Requests",
    users_list: "User Management"
  },
  fr: {
    login_title: "Connexion au Portail",
    login_phone: "Téléphone",
    login_password: "Mot de passe",
    login_button: "Se connecter",

    dashboard_title: "Panneau Client",
    new_request: "Créer une nouvelle demande EX1",
    eori_placeholder: "EORI",
    create_request_button: "Créer la demande",
    my_requests: "Mes demandes",

    admin_title: "Panneau Admin",
    requests_list: "Toutes les demandes EX1",
    users_list: "Gestion des utilisateurs"
  }
};

function applyLang() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.innerText = I18N[CURRENT_LANG][el.dataset.i18n] || el.innerText;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = I18N[CURRENT_LANG][el.dataset.i18nPlaceholder] || el.placeholder;
  });
}

function setLang(l) {
  CURRENT_LANG = l;
  localStorage.setItem("lang", l);
  applyLang();
}

// ---------- LOGIN ----------
async function login() {
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value.trim();

  const res = await fetch(API + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Giriş hatası");
    return;
  }

  TOKEN = data.token;
  localStorage.setItem("token", TOKEN);

  if (data.role === "admin") {
    window.location = "/admin.html";
  } else {
    window.location = "/dashboard.html";
  }
}

// ---------- GET REQUESTS ----------
async function loadRequests() {
  const res = await fetch(API + "/requests", {
    headers: { Authorization: "Bearer " + TOKEN }
  });
  const list = await res.json();

  const box = document.getElementById("requests");
  box.innerHTML = "";

  list.forEach(r => {
    const div = document.createElement("div");
    div.className = "request-item";

    div.innerHTML = `
      <b>Talep No:</b> ${r.id}<br>
      <b>Çıkış Kapısı:</b> ${r.exit_office}<br>
      <b>EORI:</b> ${r.eori_number}<br>
      <b>Durum:</b> ${r.status}<br><br>

      <input type="file" id="file_${r.id}" multiple>
      <button onclick="uploadDocs('${r.id}')">Evrak Yükle</button>

      <br><br>
      <button onclick="loadDocuments('${r.id}')">Evrakları Göster</button>
      <div id="docs_${r.id}" style="margin-top:10px;"></div>
    `;

    box.appendChild(div);
  });
}

// ---------- LOAD DOCUMENTS ----------
async function loadDocuments(reqId) {
  const res = await fetch(API + `/requests/${reqId}/documents`, {
    headers: { Authorization: "Bearer " + TOKEN }
  });
  const list = await res.json();

  const box = document.getElementById("docs_" + reqId);
  box.innerHTML = "";

  list.forEach(d => {
    const a = document.createElement("a");
    a.href = "/uploads/" + d.stored_name;
    a.innerText = d.display_name;
    a.download = d.display_name;

    box.appendChild(a);
    box.appendChild(document.createElement("br"));
  });
}

// ---------- UPLOAD DOCUMENT ----------
async function uploadDocs(reqId) {
  const files = document.getElementById("file_" + reqId).files;
  if (!files.length) {
    alert("Dosya seçilmedi");
    return;
  }

  const form = new FormData();
  for (const f of files) form.append("files", f);

  const res = await fetch(API + `/requests/${reqId}/upload`, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN },
    body: form
  });

  if (res.ok) {
    alert("Evrak yüklendi");
    loadRequests();
  } else alert("Hata oluştu");
}

// ---------- CREATE REQUEST ----------
async function createRequest() {
  const exit_office = document.getElementById("exit_office").value;
  const eori_number = document.getElementById("eori_number").value;
  const notes = document.getElementById("notes").value;

  const res = await fetch(API + "/requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + TOKEN
    },
    body: JSON.stringify({ exit_office, eori_number, notes })
  });

  if (res.ok) {
    alert("Talep oluşturuldu");
    loadRequests();
  } else {
    const data = await res.json();
    alert(data.error || "Hata");
  }
}

// ---------- ADMIN: LOAD REQUESTS ----------
async function loadAdminRequests() {
  const res = await fetch(API + "/requests", {
    headers: { Authorization: "Bearer " + TOKEN }
  });

  const list = await res.json();
  const box = document.getElementById("requests");
  box.innerHTML = "";

  list.forEach(r => {
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <b>Talep No:</b> ${r.id}<br>
      <b>Firma:</b> ${r.company_name || ''}<br>
      <b>Kapı:</b> ${r.exit_office}<br>
      <b>EORI:</b> ${r.eori_number}<br><br>

      <div class="upload-box">
        <input type="file" id="admin_${r.id}" multiple>
        <button onclick="adminUpload('${r.id}')">İşlem Evrakı Yükle</button>
      </div>

      <button onclick="loadDocuments('${r.id}')">Evrakları Göster</button>
      <div id="docs_${r.id}" style="margin-top:10px;"></div>
    `;

    box.appendChild(div);
  });
}

// ---------- ADMIN: UPLOAD DOC ----------
async function adminUpload(reqId) {
  const files = document.getElementById("admin_" + reqId).files;
  if (!files.length) return alert("Dosya seçin");

  const form = new FormData();
  for (const f of files) form.append("files", f);

  const res = await fetch(API + `/requests/${reqId}/admin-upload`, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN },
    body: form
  });

  if (res.ok) {
    alert("Admin evrağı yüklendi");
    loadAdminRequests();
  } else {
    alert("Hata oluştu");
  }
}

// ---------- ADMIN: USERS ----------
async function loadUsers() {
  const res = await fetch(API + "/users", {
    headers: { Authorization: "Bearer " + TOKEN }
  });

  const list = await res.json();
  const box = document.getElementById("users");
  if (!box) return;

  box.innerHTML = "";

  list.forEach(u => {
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <b>${u.full_name}</b> (${u.company_name})<br>
      Tel: ${u.phone}<br>
      Email: ${u.email}<br>
      Fiyat: <input type="number" id="price_${u.id}" value="${u.price_per_request}">
      Para Birimi: 
      <select id="cur_${u.id}">
        <option ${u.currency==="EUR"?"selected":""}>EUR</option>
        <option ${u.currency==="USD"?"selected":""}>USD</option>
        <option ${u.currency==="TRY"?"selected":""}>TRY</option>
      </select>
      Aktif: 
      <select id="active_${u.id}">
        <option value="1" ${u.is_active? "selected":""}>Evet</option>
        <option value="0" ${!u.is_active? "selected":""}>Hayır</option>
      </select>
      <button onclick="saveUser('${u.id}')">Kaydet</button>
    `;

    box.appendChild(div);
  });
}

async function saveUser(id) {
  const price = document.getElementById("price_" + id).value;
  const cur = document.getElementById("cur_" + id).value;
  const act = document.getElementById("active_" + id).value;

  const res = await fetch(API + "/users/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + TOKEN
    },
    body: JSON.stringify({
      id,
      price_per_request: price,
      currency: cur,
      is_active: act
    })
  });

  if (res.ok) alert("Güncellendi");
  else alert("Hata");
}

// INIT
applyLang();

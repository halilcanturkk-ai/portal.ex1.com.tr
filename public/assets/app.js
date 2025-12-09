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

/**



 * DIAW SHOOP - Core Application Script



 * Features: Authentication (Classic & Google), Responsive Cart, Sizing Guide,



 * WhatsApp Direct Order, Secure Role-based Admin Dashboard (CRUD & Orders),



 * and Multi-channel Senegalese Mobile Payment Simulation (Wave, OM, Free).



 */







// --- 1. CONFIGURATION & DEFAULT DATA SEEDING ---



const SELLER_WHATSAPP = "221705476061"; // Phone number for Senegalese WhatsApp ordering







// --- SUPABASE CONFIGURATION & DYNAMIC INITIALIZATION ---



// Priorité : 1. window.DIAWSHOOP_ENV / 2. /api/config (Vercel & Flask) / 3. Clés par défaut



const DEFAULT_SUPABASE_URL = 'https://flopepsxpsyrpmhadqkx.supabase.co';



const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_4oYJ9aK5pDiaEXo5GFgLbQ_Bf-LQKOH';







let SUPABASE_URL = (window.DIAWSHOOP_ENV && window.DIAWSHOOP_ENV.SUPABASE_URL) || 



                   (window.ENV && window.ENV.SUPABASE_URL) || 



                   DEFAULT_SUPABASE_URL;







let SUPABASE_KEY = (window.DIAWSHOOP_ENV && window.DIAWSHOOP_ENV.SUPABASE_ANON_KEY) || 



                   (window.ENV && window.ENV.SUPABASE_ANON_KEY) || 



                   DEFAULT_SUPABASE_ANON_KEY;







let supabaseClient = null;







function initSupabaseClient(url, key) {



    if (!window.supabase) {



        console.warn("Supabase SDK introuvable dans la page. Vérifiez le script CDN dans index.html.");



        return null;



    }



    try {



        const client = window.supabase.createClient(url, key, {



            auth: {



                persistSession: true,



                autoRefreshToken: true



            }



        });



        console.log("Supabase client connecté avec succès à :", url);



        return client;



    } catch (e) {



        console.error("Erreur initialisation client Supabase :", e);



        return null;



    }



}







// Initialisation immédiate



if (window.supabase) {



    supabaseClient = initSupabaseClient(SUPABASE_URL, SUPABASE_KEY);



}







// Récupération dynamique facultative depuis /api/config (Variables d'environnement Vercel ou Flask .env)



async function syncRemoteSupabaseConfig() {



    try {



        const res = await fetch('/api/config', { cache: 'no-store' });



        if (res.ok) {



            const cfg = await res.json();



            if (cfg && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) {



                if (cfg.SUPABASE_URL !== SUPABASE_URL || cfg.SUPABASE_ANON_KEY !== SUPABASE_KEY) {



                    console.log("Configuration Supabase mise à jour depuis /api/config");



                    SUPABASE_URL = cfg.SUPABASE_URL;



                    SUPABASE_KEY = cfg.SUPABASE_ANON_KEY;



                    supabaseClient = initSupabaseClient(SUPABASE_URL, SUPABASE_KEY);



                    loadProductsFromSupabase();



                    if (currentUser && currentUser.isAdmin) {



                        loadOrdersFromSupabase();



                    }



                }



            }



        }



    } catch (err) {



        console.debug("Config dynamique /api/config non active (mode statique / clés locales utilisées).");



    }



}



syncRemoteSupabaseConfig();







// --- 2. FONCTIONS SUPABASE CLOUD CENTRALISÉES (diawshoop_products & diawshoop_orders) ---



const db = {



    // Récupérer les produits actifs depuis diawshoop_products



    async getProducts() {
        if (!supabaseClient) return null;
        try {
            const { data, error } = await supabaseClient
                .from('diawshoop_products')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            if (error) {
                console.warn("Notice récupération diawshoop_products :", error.message);
                return null;
            }
            return data || [];
        } catch (e) {
            console.error("Erreur getProducts :", e);
            return null;
        }
    },







    // Récupérer tous les produits pour l'administration (diawshoop_products)



    async getAdminProducts() {



        if (!supabaseClient) return [];



        try {



            const { data, error } = await supabaseClient



                .from('diawshoop_products')



                .select('*')



                .order('created_at', { ascending: false });



            if (error) {



                console.warn("Notice admin products :", error.message);



                return [];



            }



            return data || [];



        } catch (e) {



            return [];



        }



    },







    // Inscription d'un utilisateur Supabase Auth



    async signUp(email, password, name) {



        if (!supabaseClient) return { error: "Supabase non initialisé" };



        const { data, error } = await supabaseClient.auth.signUp({



            email: email,



            password: password,



            options: { data: { full_name: name } }



        });



        return { data, error };



    },







    // Connexion d'un utilisateur Supabase Auth



    async signIn(email, password) {



        if (!supabaseClient) return { error: "Supabase non initialisé" };



        const { data, error } = await supabaseClient.auth.signInWithPassword({



            email: email,



            password: password



        });



        return { data, error };



    },







    // Enregistrer une nouvelle commande dans diawshoop_orders



    async createOrder(orderData) {



        if (!supabaseClient) return { error: "Supabase non initialisé" };



        const orderId = String(orderData.id || orderData.reference || ("DS-" + Math.floor(100000 + Math.random() * 900000)));



        const payload = {



            id: orderId,



            customer_name: orderData.customer_name || orderData.clientName || 'Client',



            customer_phone: orderData.customer_phone || orderData.clientPhone || '',



            items: orderData.items || [],



            total_amount: Number(orderData.total_amount || orderData.total || 0),



            payment_method: orderData.payment_method || orderData.paymentMethod || 'Paiement à la livraison',



            status: orderData.status || 'En attente',



            shipping_address: orderData.shipping_address || orderData.clientAddress || '',



            customer_email: orderData.customer_email || orderData.clientEmail || '',



            shipping_cost: Number(orderData.shipping_cost || orderData.shippingCost || 0),



            notes: orderData.notes || ''



        };



        const { data, error } = await supabaseClient.from('diawshoop_orders').insert([payload]);



        if (error) {



            console.error("Erreur enregistrement diawshoop_orders :", error);



        }



        return { data, error };



    },







    // Récupérer toutes les commandes depuis diawshoop_orders



    async getOrders() {



        if (!supabaseClient) return [];



        try {



            const { data, error } = await supabaseClient



                .from('diawshoop_orders')



                .select('*')



                .order('created_at', { ascending: false });



            if (error) {



                console.warn("Notice récupération diawshoop_orders :", error.message);



                const fallback = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });



                if (fallback && !fallback.error) return fallback.data || [];



                return [];



            }



            return data || [];



        } catch (e) {



            console.error("Erreur récupération commandes :", e);



            return [];



        }



    },







    // Mettre à jour le statut d'une commande dans diawshoop_orders



    async updateOrderStatus(orderId, newStatus) {



        if (!supabaseClient) return { error: "Supabase non initialisé" };



        const cleanId = String(orderId || "").trim();



        if (!cleanId) return { error: "Identifiant invalide" };



        const { data, error } = await supabaseClient



            .from('diawshoop_orders')



            .update({ status: String(newStatus || "") })



            .eq('id', cleanId);



        return { data, error };



    },







    // Supprimer une commande dans diawshoop_orders



    async deleteOrder(orderId) {



        if (!supabaseClient) return { error: "Supabase non initialisé" };



        const cleanId = String(orderId || "").trim();



        if (!cleanId) return { error: "Identifiant invalide" };



        const { data, error } = await supabaseClient



            .from('diawshoop_orders')



            .delete()



            .eq('id', cleanId);



        return { data, error };



    },







    // Ajouter un produit directement dans diawshoop_products



    async addProduct(productData) {



        if (!supabaseClient) return { error: "Supabase non initialisé" };



        const prodId = productData.id || ("prod-" + Math.floor(1000 + Math.random() * 9000));



        const stockQty = Number(productData.stock !== undefined ? productData.stock : (productData.stocks?.total || 20));



        const payload = {



            id: String(prodId),



            name: productData.name,



            price: Number(productData.price),



            category: productData.category || 'vetements',



            image_url: productData.image || productData.image_url || 'assets/abaya_silk.webp',



            description: productData.description || productData.name,



            stock: stockQty,



            is_active: productData.is_active !== false,



            old_price: Number(productData.oldPrice || productData.old_price || 0),



            is_promo: productData.isPromo === true || productData.is_promo === true,



            has_sizes: productData.hasSizes !== false && productData.has_sizes !== false,



            size_type: productData.sizeType || productData.size_type || 'multiple',



            video_url: productData.videoUrl || productData.video_url || '',



            stocks: productData.stocks || { S: stockQty, M: stockQty, L: stockQty, XL: stockQty, total: stockQty }



        };



        const { data, error } = await supabaseClient.from('diawshoop_products').insert([payload]).select().single();



        return { data, error };



    },







    // Mettre à jour un produit dans diawshoop_products



    async updateProduct(id, productData) {



        if (!supabaseClient) return { error: "Supabase non initialisé" };



        const stockQty = Number(productData.stock !== undefined ? productData.stock : (productData.stocks?.total || 20));



        const payload = {



            name: productData.name,



            price: Number(productData.price),



            category: productData.category,



            image_url: productData.image || productData.image_url,



            description: productData.description,



            stock: stockQty,



            is_active: productData.is_active !== false,



            old_price: Number(productData.oldPrice || productData.old_price || 0),



            is_promo: productData.isPromo === true || productData.is_promo === true,



            has_sizes: productData.hasSizes !== false && productData.has_sizes !== false,



            size_type: productData.sizeType || productData.size_type || 'multiple',



            video_url: productData.videoUrl || productData.video_url || '',



            stocks: productData.stocks



        };



        // Supprimer les clés indéfinies



        Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);



        const { data, error } = await supabaseClient.from('diawshoop_products').update(payload).eq('id', String(id));



        return { data, error };



    },







    // Supprimer un produit directement dans diawshoop_products



    async deleteProduct(id, prodName = "") {



        if (!supabaseClient) return { error: { message: "Supabase non initialisé" } };



        let res = null;



        if (id) {



            res = await supabaseClient.from('diawshoop_products').delete().eq('id', String(id));



            if (!res.error) return res;



        }



        if (prodName) {



            res = await supabaseClient.from('diawshoop_products').delete().eq('name', prodName);



            return res;



        }



        return res || { data: null, error: null };



    },







    // Obtenir la configuration de la boutique depuis Supabase



    async getSettings() {



        if (!supabaseClient) return null;



        try {



            const { data, error } = await supabaseClient.from('store_settings').select('*').eq('id', 'current').single();



            if (error) return null;



            return data;



        } catch { return null; }



    },







    // Sauvegarder la configuration de la boutique sur Supabase



    async saveSettings(settings) {



        if (!supabaseClient) return { error: "Supabase non initialisé" };



        const payload = {



            id: 'current',



            promotions_enabled: settings.promotionsEnabled !== false,



            promo_banner_text: settings.promoBannerText || "",



            whatsapp: settings.whatsapp || "221705476061",



            email: settings.email || "mamadoudiaw1105@gmail.com",



            shop_name: settings.shopName || "DIAW SHOOP",



            shop_logo: settings.shopLogo || "assets/logo_diaw_shoop.jpg",



            address: settings.address || "",



            hours: settings.hours || "",



            instagram: settings.instagram || "",



            facebook: settings.facebook || "",



            tiktok: settings.tiktok || "",



            payout_number: settings.payoutNumber || "770000000",



            payout_carrier: settings.payoutCarrier || "wave",



            delivery_pricing: settings.deliveryPricing || {},



            updated_at: new Date().toISOString()



        };



        const { data, error } = await supabaseClient.from('store_settings').upsert(payload);



        return { data, error };



    },







    // Récupérer les administrateurs partagés depuis Supabase



    async getAdmins() {



        if (!supabaseClient) return [];



        try {



            const { data, error } = await supabaseClient.from('store_admins').select('*');



            if (error) return [];



            return data || [];



        } catch { return []; }



    },







    // Enregistrer un administrateur partagé sur Supabase



    async saveAdmin(adminData) {



        if (!supabaseClient) return { error: "Supabase non initialisé" };



        const payload = {



            email: adminData.email.toLowerCase().trim(),



            name: adminData.name,



            password_hash: adminData.passwordHash,



            role: adminData.role || (adminData.isSuperAdmin ? 'superadmin' : 'admin'),



            is_super_admin: adminData.isSuperAdmin === true,



            permissions: adminData.permissions || { canAddEdit: true, canDelete: false, canManageOrders: true },



            avatar: adminData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(adminData.name)}`



        };



        const { data, error } = await supabaseClient.from('store_admins').upsert(payload);



        return { data, error };



    },







    // Supprimer un administrateur sur Supabase



    async deleteAdmin(email) {



        if (!supabaseClient) return { error: "Supabase non initialisé" };



        const { data, error } = await supabaseClient.from('store_admins').delete().eq('email', email.toLowerCase().trim());



        return { data, error };



    }



};







// Default beauty and women's fashion collections



const DEFAULT_PRODUCTS = [



    {



        id: "prod-001",



        name: "Abaya en Soie Premium Oud",



        category: "vetements",



        price: 24500,



        oldPrice: 28000,



        isPromo: true,



        hasSizes: false,



        sizeType: "none",



        description: "Robe abaya longue premium en soie de Médine fluide. Coupe évasée élégante idéale pour les occasions spéciales ou le quotidien. Matière respirante et opaque, adaptée pour les femmes voilées.",



        image: "assets/abaya_silk.webp",



        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-modeling-a-silk-green-dress-40995-large.mp4",



        stocks: { total: 34, S: 8, M: 12, L: 10, XL: 4 }



    },



    {



        id: "prod-002",



        name: "Robe Wax Moderne Dakar Gold",



        category: "robes",



        price: 18500,



        oldPrice: 22000,



        isPromo: true,



        hasSizes: true,



        sizeType: "multiple",



        description: "Superbe robe wax évasée avec broderies et détails en fil doré. Fabriquée à la main à Dakar avec un tissu wax de qualité supérieure, combinant tradition et modernité chic.",



        image: "assets/dress_wax.webp",



        stocks: { total: 38, S: 10, M: 15, L: 8, XL: 5 }



    },



    {



        id: "prod-003",



        name: "Crème Karité Fondante Bio",



        category: "beaute",



        price: 8500,



        oldPrice: 0,



        isPromo: false,



        hasSizes: false,



        sizeType: "none",



        description: "Soin corporel hydratant intense formulé à base de beurre de karité pur du Sénégal. Enrichi en huiles de coco et d'avocat pour nourrir et réparer en profondeur les peaux sèches.",



        image: "assets/shea_cream.webp",



        stocks: { total: 99, S: 99, M: 99, L: 99, XL: 99 }



    },



    {



        id: "prod-004",



        name: "Sérum Éclat aux Huiles Précieuses",



        category: "beaute",



        price: 14500,



        oldPrice: 0,



        isPromo: false,



        hasSizes: false,



        sizeType: "none",



        description: "Élixir régénérant visage aux huiles d'hibiscus et de baobab bio. Unifie le teint, lutte contre les imperfections et redonne un éclat naturel à votre peau.",



        image: "assets/serum_glow.webp",



        stocks: { total: 99, S: 99, M: 99, L: 99, XL: 99 }



    },



    {



        id: "prod-005",



        name: "Encens Thiouraye Royal & Brume Oud",



        category: "parfums",



        price: 12500,



        oldPrice: 15000,



        isPromo: true,



        hasSizes: false,



        sizeType: "none",



        description: "Coffret senteurs sénégalaises comprenant un pot de thiouraye d'encens traditionnel parfumé et une brume de corps au bois de oud oriental pour une tenue longue durée.",



        image: "assets/perfume_oud.webp",



        stocks: { total: 99, S: 99, M: 99, L: 99, XL: 99 }



    },



    {



        id: "prod-006",



        name: "Ensemble Détente Pastel Rose",



        category: "vetements",



        price: 19500,



        oldPrice: 0,



        isPromo: false,



        hasSizes: true,



        sizeType: "multiple",



        description: "Ensemble deux pièces ultra-doux en maille fine respirante. Teinte rose poudrée raffinée, confort absolu pour vos journées décontractées ou vos sorties légères.",



        image: "assets/set_pink.webp",



        stocks: { total: 41, S: 12, M: 15, L: 8, XL: 6 }



    },



    {



        id: "prod-007",



        name: "Ensemble Élégance Noir Satiné",



        category: "vetements",



        price: 22000,



        oldPrice: 0,



        isPromo: false,



        hasSizes: true,



        sizeType: "multiple",



        description: "Ensemble coordonné noir profond avec finitions haut de gamme. Coupe moderne et valorisante, confectionné pour allier prestance et liberté de mouvement.",



        image: "assets/set_black.webp",



        stocks: { total: 36, S: 10, M: 12, L: 10, XL: 4 }



    },



    {



        id: "prod-008",



        name: "Brassière Confort Soyeuse Corail",



        category: "vetements",



        price: 9500,



        oldPrice: 0,



        isPromo: false,



        hasSizes: true,



        sizeType: "multiple",



        description: "Brassière sans armature maintien parfait en microfibre soyeuse. Couleur corail vivante et douce, idéale sous vos tenues du quotidien ou pour le bien-être à la maison.",



        image: "assets/bra_coral.webp",



        stocks: { total: 55, S: 15, M: 20, L: 12, XL: 8 }



    },



    {



        id: "prod-009",



        name: "Legging Galbant Confort Anthracite",



        category: "vetements",



        price: 11500,



        oldPrice: 0,



        isPromo: false,



        hasSizes: true,



        sizeType: "multiple",



        description: "Legging taille haute sculptant avec effet seconde peau. Matière opaque haute densité, maintien doux du bassin et douceur incomparable.",



        image: "assets/leggings_gray.webp",



        stocks: { total: 52, S: 14, M: 18, L: 14, XL: 6 }



    },



    {



        id: "prod-010",



        name: "Flacon Parfum Prestige & Élixir Royal",



        category: "parfums",



        price: 16500,



        oldPrice: 0,



        isPromo: false,



        hasSizes: false,



        sizeType: "none",



        description: "Flacon bijou rechargeable aux essences orientales ambrées et florales. Une signature olfactive envoûtante créée pour les femmes d'exception.",



        image: "assets/bottle_luxury.webp",



        stocks: { total: 99, S: 99, M: 99, L: 99, XL: 99 }



    }



];







// Helper to escape HTML and prevent XSS (Cross-Site Scripting)



function escapeHTML(str) {



    if (!str) return '';



    return str.toString()



        .replace(/&/g, '&amp;')



        .replace(/</g, '&lt;')



        .replace(/>/g, '&gt;')



        .replace(/"/g, '&quot;')



        .replace(/'/g, '&#039;');



}







// Cryptographic SHA-256 Implementation for password hashing



function sha256(ascii) {



    function rightRotate(value, amount) {



        return (value >>> amount) | (value << (32 - amount));



    }



    var mathPow = Math.pow;



    var maxWord = mathPow(2, 32);



    var lengthProperty = 'length';



    var i, j;



    var result = '';



    var words = [];



    var asciiLength = ascii[lengthProperty] * 8;



    var hash = sha256.h = sha256.h || [];



    var k = sha256.k = sha256.k || [];



    var primeCounter = k[lengthProperty];



    var isComposite = {};



    for (var candidate = 2; primeCounter < 64; candidate++) {



        if (!isComposite[candidate]) {



            for (i = 0; i < 313; i += candidate) {



                isComposite[i] = candidate;



            }



            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;



            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;



        }



    }



    ascii += '\x80';



    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';



    for (i = 0; i < ascii[lengthProperty]; i++) {



        j = ascii.charCodeAt(i);



        if (j >> 8) return; // Only support ASCII



        words[i >> 2] |= j << (24 - (i % 4) * 8);



    }



    words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);



    words[words[lengthProperty]] = (asciiLength);



    for (j = 0; j < words[lengthProperty];) {



        var w = words.slice(j, j += 16);



        var oldHash = hash.slice(0);



        for (i = 0; i < 64; i++) {



            var w16 = w[i - 16], w15 = w[i - 15], w7 = w[i - 7], w2 = w[i - 2];



            var a = hash[0], e = hash[4], temp1, temp2;



            w[i] = i < 16 ? w[i] : (



                w[i - 16] +



                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +



                w7 +



                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))



            ) | 0;



            temp1 = (hash[7] +



                (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +



                ((e & hash[5]) ^ (~e & hash[6])) +



                k[i] +



                w[i]) | 0;



            temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +



                ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;



            hash = [(temp1 + temp2) | 0].concat(hash);



            hash[4] = (hash[4] + temp1) | 0;



            hash.length = 8;



        }



        for (i = 0; i < 8; i++) {



            hash[i] = (hash[i] + oldHash[i]) | 0;



        }



    }



    for (i = 0; i < 8; i++) {



        for (j = 31; j >= 0; j -= 4) {



            var digit = (hash[i] >> j) & 0xf;



            result += digit.toString(16);



        }



    }



    return result;



}







// Salt applicatif fixe — renforce le hachage contre les rainbow tables



// Note : Pour une sécurité optimale en production, utiliser bcrypt côté serveur.



const APP_SALT = "DIAW_SHOOP_SALT_v2_#!sn2026";







function mockHashPassword(password) {



    // Hachage itéré avec salt : sha256(sha256(password + salt) + password)



    const saltedOnce = sha256(password + APP_SALT);



    return sha256(saltedOnce + password);



}







// Système anti-brute-force côté client : verrouillage après 5 tentatives échouées



const LOGIN_ATTEMPT_KEY = "diaw_shoop_login_attempts";



const MAX_LOGIN_ATTEMPTS = 5;



const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes







function getLoginAttempts() {



    try {



        return JSON.parse(sessionStorage.getItem(LOGIN_ATTEMPT_KEY)) || { count: 0, lockedUntil: null };



    } catch { return { count: 0, lockedUntil: null }; }



}







function recordFailedLoginAttempt() {



    const attempts = getLoginAttempts();



    attempts.count = (attempts.count || 0) + 1;



    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {



        attempts.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;



        attempts.count = 0;



    }



    sessionStorage.setItem(LOGIN_ATTEMPT_KEY, JSON.stringify(attempts));



    return attempts;



}







function resetLoginAttempts() {



    sessionStorage.removeItem(LOGIN_ATTEMPT_KEY);



}







function isLoginLocked() {



    const attempts = getLoginAttempts();



    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {



        const remainingMin = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);



        return { locked: true, remainingMin };



    }



    return { locked: false };



}







// Initialize LocalStorage Data



function initializeStorage() {



    // 1. Seed & update Products if needed (garantir la présence de tous les produits et photos officiels)



    const MIGRATION_KEY = "diaw_shoop_catalog_v5_migrated";



    // 1. Initialiser le catalogue local uniquement si totalement absent



    if (!localStorage.getItem("diaw_shoop_products")) {



        const deletedList = getDeletedProductIds();



        const initialList = DEFAULT_PRODUCTS.filter(dp => 



            !deletedList.includes(String(dp.id)) && (!dp.name || !deletedList.includes(dp.name.trim().toLowerCase()))



        );



        localStorage.setItem("diaw_shoop_products", JSON.stringify(initialList));



    }







    // 2. Seed default users (Admin & Client)



    if (localStorage.getItem("diaw_shoop_users")) {



        const usersCheck = JSON.parse(localStorage.getItem("diaw_shoop_users")) || [];



        const mamadou = usersCheck.find(u => u.isSuperAdmin === true || u.email === "mamadoudiaw1105@gmail.com" || u.email === "mamadoudiaw2005@gmail.com");



        // Force reset si l'ancien format (sans salt v2) ou sans permissions



        if (!mamadou || !mamadou.permissions || !mamadou.permissions.canAddEdit || !mamadou.passwordHash || mamadou.passwordHash.length !== 64 || !mamadou._saltVersion || mamadou._saltVersion !== 2) {



            localStorage.removeItem("diaw_shoop_users");



        } else {



            // Migration automatique de l'e-mail de Diarra Diaw si encore sous l'ancien domaine



            const oldDiarra = usersCheck.find(u => u.email === "diarra.diaw@diawshoop.sn");



            if (oldDiarra) {



                oldDiarra.email = "diarradiaw24@gmail.com";



                localStorage.setItem("diaw_shoop_users", JSON.stringify(usersCheck));



            }



        }



    }



    if (!localStorage.getItem("diaw_shoop_users")) {



        const defaultUsers = [



            {



                email: "mamadoudiaw2005@gmail.com",



                passwordHash: "0914a5700b54a6aaf1569c6d04774a440596b8e501b198fcf23fe1b405af9987",



                name: "Mamadou Diaw (SuperAdmin)",



                isAdmin: true,



                isSuperAdmin: true,



                _saltVersion: 2,



                permissions: { canAddEdit: true, canDelete: true, canManageOrders: true },



                avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100&h=100"



            },



            {



                email: "mamadoudiaw1105@gmail.com",



                passwordHash: "0914a5700b54a6aaf1569c6d04774a440596b8e501b198fcf23fe1b405af9987",



                name: "Mamadou Diaw (Grand Admin)",



                isAdmin: true,



                isSuperAdmin: true,



                _saltVersion: 2,



                permissions: { canAddEdit: true, canDelete: true, canManageOrders: true },



                avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100&h=100"



            },



            {



                email: "diarradiaw24@gmail.com",



                passwordHash: "0937d57901e72ea9fd2dafe5f851f9f7f68416c0041223f1f228db930aa24d85",



                name: "Diarra Diaw (Admin)",



                isAdmin: true,



                isSuperAdmin: false,



                _saltVersion: 2,



                permissions: { canAddEdit: true, canDelete: false, canManageOrders: true },



                avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=100&h=100"



            },



            {



                email: "client@gmail.com",



                passwordHash: "bfaa05eeb9a78fb486fbb56a109b562fb03ba1f3a11e535d89bb6fd50c110b64",



                name: "Awa Ndiaye",



                isAdmin: false,



                isSuperAdmin: false,



                _saltVersion: 2,



                avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100"



            }



        ];



        localStorage.setItem("diaw_shoop_users", JSON.stringify(defaultUsers));



    }







    // 3. Seed orders list if empty



    if (!localStorage.getItem("diaw_shoop_orders")) {



        localStorage.setItem("diaw_shoop_orders", JSON.stringify([]));



    }







    // Seed default reviews list if empty



    if (!localStorage.getItem("diaw_shoop_reviews")) {



        const defaultReviews = [



            {



                id: "rev-001",



                productId: "prod-001",



                author: "Sokhna Diop",



                rating: 5,



                text: "Abaya magnifique, la soie est d'une légèreté et d'une qualité exceptionnelle ! Je recommande vivement.",



                date: "2026-07-10T14:32:00.000Z",



                avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Sokhna%20Diop"



            },



            {



                id: "rev-002",



                productId: "prod-001",



                author: "Fatou Diene",



                rating: 4,



                text: "Très satisfaite de mon achat, la coupe est parfaite. Seul bémol : la livraison a pris 24h de plus que prévu.",



                date: "2026-07-09T10:15:00.000Z",



                avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Fatou%20Diene"



            },



            {



                id: "rev-003",



                productId: "prod-002",



                author: "Aminata Ndoye",



                rating: 5,



                text: "Le motif wax est sublime et les couleurs éclatantes. Parfait pour les grandes occasions !",



                date: "2026-07-11T09:45:00.000Z",



                avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Aminata%20Ndoye"



            },



            {



                id: "rev-004",



                productId: "prod-003",



                author: "Mariama Sy",



                rating: 5,



                text: "Excellent produit pour hydrater la peau en profondeur. Texture très agréable et odeur naturelle discrète.",



                date: "2026-07-08T16:20:00.000Z",



                avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Mariama%20Sy"



            }



        ];



        localStorage.setItem("diaw_shoop_reviews", JSON.stringify(defaultReviews));



    }







    // 4. Seed default shop settings if not present or migrate promo & delivery



    if (localStorage.getItem("diaw_shoop_settings")) {



        const settingsCheck = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || {};



        let changed = false;



        if (!settingsCheck.instagram || !settingsCheck.googleClientId || !settingsCheck.shopName || settingsCheck.googleClientId === "845239922097-n8l4g8i4e2j99p0lhq1f3c30r7o0p61i.apps.googleusercontent.com" || settingsCheck.googleClientId === "616654931328-ud8ebaplaov9lf99muj1tv87g8st6fse.apps.googleusercontent.com" || settingsCheck.whatsapp === "221785946427") {



            settingsCheck.googleClientId = "616654931328-e2qe49rge45fulu769pd21gemfhc2ovs.apps.googleusercontent.com";



            if (settingsCheck.whatsapp === "221785946427" || !settingsCheck.whatsapp) {



                settingsCheck.whatsapp = "221705476061";



            }



            changed = true;



        }



        if (settingsCheck.promotionsEnabled === undefined) {



            settingsCheck.promotionsEnabled = true;



            settingsCheck.promoBannerText = "🔥 OFFRES SPÉCIALES DIAW SHOOP : Jusqu'à -40% sur nos Robes & Abayas exclusives !";



            changed = true;



        }



        if (!settingsCheck.deliveryPricing) {



            settingsCheck.deliveryPricing = {



                dakarCentre: 1500,



                banlieue: 2500,



                regions: 4000,



                regionsEnabled: true,



                pickupEnabled: true,



                freeShippingThreshold: 35000



            };



            changed = true;



        }



        if (changed) {



            localStorage.setItem("diaw_shoop_settings", JSON.stringify(settingsCheck));



        }



    }



    if (!localStorage.getItem("diaw_shoop_settings")) {



        const defaultSettings = {



            whatsapp: "221705476061",



            email: "mamadoudiaw1105@gmail.com",



            address: "Liberté 6 Extension, Dakar, Sénégal",



            hours: "Lun - Ven : 10h - 22h / Sam : 10h - 18h",



            instagram: "https://instagram.com/",



            facebook: "https://facebook.com/",



            tiktok: "https://tiktok.com/",



            googleClientId: "616654931328-e2qe49rge45fulu769pd21gemfhc2ovs.apps.googleusercontent.com",



            shopName: "DIAW SHOOP",



            promotionsEnabled: true,



            promoBannerText: "🔥 OFFRES SPÉCIALES DIAW SHOOP : Jusqu'à -40% sur nos Robes & Abayas exclusives !",



            deliveryPricing: {



                dakarCentre: 1500,



                banlieue: 2500,



                regions: 4000,



                regionsEnabled: true,



                pickupEnabled: true,



                freeShippingThreshold: 35000



            }



        };



        localStorage.setItem("diaw_shoop_settings", JSON.stringify(defaultSettings));



    }



}







// Helper pour déterminer si un article nécessite la sélection obligatoire d'une taille



function productRequiresSize(prod) {



    if (!prod) return false;



    if (prod.hasSizes === false || prod.sizeType === "none") return false;



    if (prod.hasSizes === true || prod.sizeType === "multiple") return true;







    // Les cosmétiques et parfums n'ont jamais de taille



    if (prod.category === "beaute" || prod.category === "parfums") return false;







    // Vêtements en taille unique (Abayas, kimonos, voiles...)



    const lowerName = (prod.name || "").toLowerCase();



    if (



        lowerName.includes("abaya") ||



        lowerName.includes("voile") ||



        lowerName.includes("kimono") ||



        lowerName.includes("écharpe") ||



        lowerName.includes("echarpe") ||



        lowerName.includes("foulard") ||



        lowerName.includes("taille unique") ||



        lowerName.includes("unique")



    ) {



        return false;



    }







    return prod.category === "vetements" || prod.category === "robes";



}







initializeStorage();







// --- 2. GLOBAL STATE ---



let products = JSON.parse(localStorage.getItem("diaw_shoop_products")) || [];



let orders = JSON.parse(localStorage.getItem("diaw_shoop_orders")) || [];



let currentUser = JSON.parse(sessionStorage.getItem("diaw_shoop_current_user")) || null;



let cart = JSON.parse(localStorage.getItem("diaw_shoop_cart")) || [];



let reviews = JSON.parse(localStorage.getItem("diaw_shoop_reviews")) || [];







// Active shop filter state



let activeCategory = "all";



let searchFilter = "";



let sortOrder = "default";



let currentOrderFilter = "all";



let orderSearchQuery = "";







// Checkout wizard temporary state



let checkoutDetails = {



    name: "",



    phone: "",



    email: "",



    address: "",



    notes: "",



    deliveryZone: "dakar-centre",



    shippingCost: 1500,



    paymentMethod: "",



    items: [],



    subtotal: 0,



    total: 0



};







// Target edit product (for admin)



let editingProductId = null;



let customImageBase64 = "";



let customVideoBase64 = "";







// --- ADMIN TOMBSTONES & CUSTOM CONFIRMATION SYSTEM ---



function getDeletedProductIds() {



    try {



        return JSON.parse(localStorage.getItem("diaw_shoop_deleted_product_ids")) || [];



    } catch {



        return [];



    }



}







function addDeletedProductId(id, name = "") {



    const list = getDeletedProductIds();



    const toAdd = [String(id)];



    if (name) toAdd.push(name.trim().toLowerCase());



    toAdd.forEach(item => {



        if (!list.includes(item)) list.push(item);



    });



    localStorage.setItem("diaw_shoop_deleted_product_ids", JSON.stringify(list));



}







function getDeletedOrderIds() {



    try {



        return JSON.parse(localStorage.getItem("diaw_shoop_deleted_order_ids")) || [];



    } catch {



        return [];



    }



}







function addDeletedOrderId(orderId, reference = "", supabaseId = "") {



    const list = getDeletedOrderIds();



    [orderId, reference, supabaseId].filter(Boolean).forEach(item => {



        const str = String(item).trim();



        if (str && !list.includes(str)) list.push(str);



    });



    localStorage.setItem("diaw_shoop_deleted_order_ids", JSON.stringify(list));



}







function showAdminConfirmModal({ title = "Confirmer la suppression", message = "Êtes-vous sûr de vouloir supprimer définitivement cet élément ?", confirmText = "Supprimer" } = {}) {



    return new Promise((resolve) => {



        const modal = document.getElementById("admin-confirm-modal");



        const titleEl = document.getElementById("admin-confirm-title");



        const msgEl = document.getElementById("admin-confirm-message");



        const btnCancel = document.getElementById("admin-confirm-btn-cancel");



        const btnClose = document.getElementById("btn-close-admin-confirm");



        const btnDanger = document.getElementById("admin-confirm-btn-danger");







        if (!modal || !btnDanger) {



            const confirmed = window.confirm(message);



            resolve(confirmed);



            return;



        }







        if (titleEl) titleEl.textContent = title;



        if (msgEl) msgEl.textContent = message;



        if (btnDanger) btnDanger.innerHTML = `<i class="fa-solid fa-trash-can"></i> ${confirmText}`;







        modal.classList.add("open");







        const cleanup = () => {



            modal.classList.remove("open");



            if (btnCancel) btnCancel.removeEventListener("click", onCancel);



            if (btnClose) btnClose.removeEventListener("click", onCancel);



            if (btnDanger) btnDanger.removeEventListener("click", onConfirm);



            modal.removeEventListener("click", onBackdrop);



        };







        const onCancel = () => {



            cleanup();



            resolve(false);



        };







        const onConfirm = () => {



            cleanup();



            resolve(true);



        };







        const onBackdrop = (e) => {



            if (e.target === modal) {



                cleanup();



                resolve(false);



            }



        };







        if (btnCancel) btnCancel.addEventListener("click", onCancel, { once: true });



        if (btnClose) btnClose.addEventListener("click", onCancel, { once: true });



        if (btnDanger) btnDanger.addEventListener("click", onConfirm, { once: true });



        modal.addEventListener("click", onBackdrop, { once: true });



    });



}







// --- 3. DOM ELEMENTS ---



const elements = {



    // Header & Navigation



    loginTriggerBtn: document.getElementById("login-trigger-btn"),



    userDropdownContainer: document.getElementById("user-dropdown-container"),



    userProfileBtn: document.getElementById("user-profile-btn"),



    userAvatar: document.getElementById("user-avatar"),



    userNameDisplay: document.getElementById("user-name-display"),



    userEmailDisplay: document.getElementById("user-email-display"),



    userRoleBadge: document.getElementById("user-role-badge"),



    btnLogout: document.getElementById("btn-logout"),



    navAdmin: document.getElementById("nav-admin"),



    dropdownAdminBtn: document.getElementById("dropdown-admin-btn"),



    navHome: document.getElementById("nav-home"),



    navShop: document.getElementById("nav-shop"),







    // Product Catalogue Grid & Filters



    productsGrid: document.getElementById("products-grid"),



    categoryTabs: document.getElementById("category-tabs"),



    searchInput: document.getElementById("search-input"),



    searchBtn: document.getElementById("search-btn"),



    sortSelect: document.getElementById("sort-select"),



    activeFiltersInfo: document.getElementById("active-filters-info"),



    searchQueryText: document.getElementById("search-query-text"),



    clearSearchBtn: document.getElementById("clear-search-btn"),







    // Cart Sidebar Drawer



    cartSidebar: document.getElementById("cart-sidebar"),



    cartTriggerBtn: document.getElementById("cart-trigger-btn"),



    closeCartBtn: document.getElementById("close-cart-btn"),



    sidebarOverlay: document.getElementById("sidebar-overlay"),



    cartSidebarBody: document.getElementById("cart-sidebar-body"),



    cartSidebarFooter: document.getElementById("cart-sidebar-footer"),



    cartBadge: document.getElementById("cart-badge"),



    cartSubtotal: document.getElementById("cart-subtotal"),



    cartShippingCost: document.getElementById("cart-shipping-cost"),



    cartTotal: document.getElementById("cart-total"),



    cartDeliveryZone: document.getElementById("cart-delivery-zone"),



    btnCheckoutTrigger: document.getElementById("btn-checkout-trigger"),



    btnCartContinue: document.getElementById("btn-cart-continue"),







    // Auth Modal



    authModal: document.getElementById("auth-modal"),



    btnCloseAuthModal: document.getElementById("btn-close-auth-modal"),



    authTabs: document.querySelectorAll(".auth-tab-btn"),



    loginForm: document.getElementById("login-form"),



    registerForm: document.getElementById("register-form"),



    googleSigninContainer: document.getElementById("google-signin-btn-container"),







    // Product Detail Modal



    productDetailModal: document.getElementById("product-detail-modal"),



    btnCloseProductModal: document.getElementById("btn-close-product-modal"),



    modalProductImage: document.getElementById("modal-product-image"),



    modalProductCategory: document.getElementById("modal-product-category"),



    modalProductTitle: document.getElementById("modal-product-title"),



    modalProductPrice: document.getElementById("modal-product-price"),



    modalProductDesc: document.getElementById("modal-product-desc"),



    sizeOptionsContainer: document.getElementById("size-options-container"),



    modalStockStatus: document.getElementById("modal-stock-status"),



    modalBtnAddCart: document.getElementById("modal-btn-add-cart"),



    modalBtnWhatsapp: document.getElementById("modal-btn-whatsapp"),







    // User Orders Modal



    myOrdersModal: document.getElementById("my-orders-modal"),



    btnCloseMyOrders: document.getElementById("btn-close-my-orders"),



    btnCloseMyOrdersBtn: document.getElementById("btn-close-my-orders-btn"),



    btnMyOrders: document.getElementById("btn-my-orders"),



    myOrdersList: document.getElementById("my-orders-list"),







    // Checkout Modal & Senegalese Mobile Payment Wizards



    checkoutModal: document.getElementById("checkout-modal"),



    btnCloseCheckoutModal: document.getElementById("btn-close-checkout-modal"),



    shippingInfoForm: document.getElementById("shipping-info-form"),



    checkoutAmountSummary: document.getElementById("checkout-amount-summary"),



    btnProceedToSim: document.getElementById("btn-proceed-to-sim"),



    btnBackToStep1: document.getElementById("btn-back-to-step-1"),



    btnBackToStep2: document.getElementById("btn-back-to-step-2"),



    btnCheckoutCloseComplete: document.getElementById("btn-close-checkout-complete"),



    btnDownloadPdf: document.getElementById("btn-download-pdf"),



    invoiceReceiptDetails: document.getElementById("invoice-receipt-details"),



    transactionLoader: document.getElementById("transaction-loader"),



    simNavButtons: document.getElementById("sim-nav-buttons"),







    // Admin Section & Forms



    adminSection: document.getElementById("admin-section"),



    btnCloseAdmin: document.getElementById("btn-close-admin"),



    productAdminForm: document.getElementById("product-admin-form"),



    btnSaveProduct: document.getElementById("btn-save-product"),



    btnCancelEdit: document.getElementById("btn-cancel-edit"),



    editProductIdInput: document.getElementById("edit-product-id"),



    prodNameInput: document.getElementById("prod-name"),



    prodPriceInput: document.getElementById("prod-price"),



    prodCategorySelect: document.getElementById("prod-category"),



    prodDescTextarea: document.getElementById("prod-desc"),



    prodImagePresetSelect: document.getElementById("prod-image-preset"),



    prodImageUrlInput: document.getElementById("prod-image-url"),



    prodImageFileInput: document.getElementById("prod-image-file"),



    prodVideoInput: document.getElementById("prod-video"),



    prodVideoFileInput: document.getElementById("prod-video-file"),



    modalMediaContainer: document.getElementById("modal-media-container"),



    adminProductsTableBody: document.getElementById("admin-products-table-body"),



    adminOrdersGrid: document.getElementById("admin-orders-grid"),



    adminPendingBadge: document.getElementById("admin-pending-badge"),



    adminStatRevenue: document.getElementById("admin-stat-revenue"),



    adminStatOrders: document.getElementById("admin-stat-orders"),



    adminStatProducts: document.getElementById("admin-stat-products"),



    adminRolesTableBody: document.getElementById("admin-roles-table-body"),



    btnRefreshOrders: document.getElementById("btn-refresh-orders"),



    adminOrdersSearchInput: document.getElementById("admin-orders-search-input"),



    kpiOrdersCount: document.getElementById("kpi-orders-count"),



    kpiOrdersPending: document.getElementById("kpi-orders-pending"),



    kpiOrdersShipping: document.getElementById("kpi-orders-shipping"),



    kpiOrdersDelivered: document.getElementById("kpi-orders-delivered"),



    filterCountAll: document.getElementById("filter-count-all"),



    filterCountPending: document.getElementById("filter-count-pending"),



    filterCountShipping: document.getElementById("filter-count-shipping"),



    filterCountDelivered: document.getElementById("filter-count-delivered"),



    orderInvoiceModal: document.getElementById("order-invoice-modal"),



    adminInvoiceModalDetails: document.getElementById("admin-invoice-modal-details"),



    btnCloseInvoiceModal: document.getElementById("btn-close-invoice-modal"),



    btnCloseInvoiceModalBtn: document.getElementById("btn-close-invoice-modal-btn"),







    // Toasts Alert Wrapper



    toastContainer: document.getElementById("toast-container")



};







// Initial store settings application



applyStoreSettings();







// Add dynamic events for form toggle password



document.querySelectorAll(".btn-toggle-password").forEach(btn => {



    btn.addEventListener("click", function () {



        const input = this.previousElementSibling;



        const icon = this.querySelector("i");



        if (input.type === "password") {



            input.type = "text";



            icon.classList.replace("fa-eye", "fa-eye-slash");



        } else {



            input.type = "password";



            icon.classList.replace("fa-eye-slash", "fa-eye");



        }



    });



});







// --- 4. TOAST NOTIFICATION UTILITY ---



function showToast(message, type = "success") {



    const toast = document.createElement("div");



    toast.className = `toast ${type}`;







    let iconClass = "fa-circle-check";



    if (type === "error") iconClass = "fa-circle-exclamation";



    if (type === "info") iconClass = "fa-circle-info";







    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${escapeHTML(message)}</span>`;



    elements.toastContainer.appendChild(toast);







    setTimeout(() => {



        toast.style.animation = "toastIn 0.3s reverse forwards";



        setTimeout(() => toast.remove(), 300);



    }, 4000);



}







// --- 5. AUTHENTICATION FLOWS (CLASSIC & SIMULATED GOOGLE OAUTH) ---



function updateUserUI() {



    if (currentUser) {



        // Authenticated State



        elements.loginTriggerBtn.style.display = "none";



        elements.userDropdownContainer.style.display = "block";



        elements.userAvatar.src = currentUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100";



        elements.userNameDisplay.textContent = currentUser.name;



        elements.userEmailDisplay.textContent = currentUser.email;







        if (currentUser.isAdmin) {



            elements.userRoleBadge.textContent = currentUser.isSuperAdmin ? "Grand Admin" : "Admin Secondaire";



            elements.userRoleBadge.className = "badge badge-accent";



            document.querySelectorAll(".admin-only-link").forEach(el => el.style.display = "block");



            renderAdminDashboard();



        } else {



            elements.userRoleBadge.textContent = "Client";



            elements.userRoleBadge.className = "badge badge-success";



            document.querySelectorAll(".admin-only-link").forEach(el => el.style.display = "none");



            elements.adminSection.style.display = "none";



        }



    } else {



        // Guest State



        elements.loginTriggerBtn.style.display = "flex";



        elements.userDropdownContainer.style.display = "none";



        document.querySelectorAll(".admin-only-link").forEach(el => el.style.display = "none");



        elements.adminSection.style.display = "none";



    }



}







// Initial UI login check



updateUserUI();







// Open Auth Modal



elements.loginTriggerBtn.addEventListener("click", () => {



    elements.authModal.classList.add("open");



    if (typeof initializeGoogleSignIn === "function") {



        initializeGoogleSignIn();



    }



});



elements.btnCloseAuthModal.addEventListener("click", () => {



    elements.authModal.classList.remove("open");



});







// Tab Switch Logic in Auth Modal



elements.authTabs.forEach(tab => {



    tab.addEventListener("click", function () {



        elements.authTabs.forEach(t => t.classList.remove("active"));



        this.classList.add("active");







        const tabTarget = this.getAttribute("data-tab");



        document.querySelectorAll(".auth-tab-content").forEach(content => {



            content.classList.remove("active");



            content.style.display = "none";



        });



        const targetEl = document.getElementById(tabTarget);



        if (targetEl) {



            targetEl.classList.add("active");



            targetEl.style.display = "block";



        }



    });



});







// Handle Classic Email/Password Login



elements.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
        showToast("Veuillez remplir tous les champs.", "error");
        return;
    }

    if (password.length < 4) {
        showToast("Mot de passe trop court.", "error");
        return;
    }

    // =========================================================================
    // 1. ACCÈS SUPERADMIN DIRECT (Mamadou Diaw) - Mot de passe officiel : Diaw2005
    // =========================================================================
    if (email === "mamadoudiaw2005@gmail.com" || email === "mamadoudiaw1105@gmail.com") {
        if (password.toLowerCase() === "diaw2005") {
            resetLoginAttempts();
            const masterUser = {
                email: email,
                name: "Mamadou Diaw (SuperAdmin)",
                isAdmin: true,
                isSuperAdmin: true,
                permissions: { canAddEdit: true, canDelete: true, canManageOrders: true },
                avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100&h=100"
            };
            sessionStorage.setItem("diaw_shoop_current_user", JSON.stringify(masterUser));
            currentUser = masterUser;
            updateUserUI();
            elements.authModal.classList.remove("open");
            showToast("Bienvenue Mamadou Diaw ! Accès SuperAdmin activé avec succès.", "success");
            return;
        }
    }

    // =========================================================================
    // 2. ACCÈS ADMIN SECONDAIRE DIRECT (Diarra Diaw) - Mot de passe officiel : diarra123
    // =========================================================================
    if (email === "diarradiaw24@gmail.com") {
        if (password.toLowerCase() === "diarra123") {
            resetLoginAttempts();
            const diarraUser = {
                email: "diarradiaw24@gmail.com",
                name: "Diarra Diaw (Admin)",
                isAdmin: true,
                isSuperAdmin: false,
                permissions: { canAddEdit: true, canDelete: false, canManageOrders: true },
                avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=100&h=100"
            };
            sessionStorage.setItem("diaw_shoop_current_user", JSON.stringify(diarraUser));
            currentUser = diarraUser;
            updateUserUI();
            elements.authModal.classList.remove("open");
            showToast("Bienvenue Diarra Diaw ! Accès Admin activé avec succès.", "success");
            return;
        }
    }

    let users = JSON.parse(localStorage.getItem("diaw_shoop_users")) || [];
    let foundUser = null;

    // 3. Vérification dynamique sur Supabase Cloud (table store_admins) pour les autres admins
    if (supabaseClient) {
        try {
            const { data: cloudAdmin } = await supabaseClient
                .from('store_admins')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (cloudAdmin) {
                foundUser = {
                    email: cloudAdmin.email,
                    name: cloudAdmin.name,
                    passwordHash: cloudAdmin.password_hash,
                    isAdmin: true,
                    isSuperAdmin: cloudAdmin.is_super_admin === true || cloudAdmin.role === 'superadmin',
                    _saltVersion: 2,
                    permissions: cloudAdmin.permissions || { canAddEdit: true, canDelete: false, canManageOrders: true },
                    avatar: cloudAdmin.avatar || ""
                };
            }
        } catch (e) {
            console.debug("Notice vérification admin Cloud:", e);
        }
    }

    // 4. Fallback cache local
    if (!foundUser) {
        foundUser = users.find(u => u.email === email);
    }

    // 5. Validation par hachage ou mot de passe direct
    const isPasswordValid = foundUser && (
        foundUser.passwordHash === mockHashPassword(password) ||
        foundUser.passwordHash === password ||
        foundUser.plainPassword === password
    );

    if (foundUser && isPasswordValid) {
        resetLoginAttempts();
        const safeUser = {
            email: foundUser.email,
            name: foundUser.name,
            isAdmin: foundUser.isAdmin === true,
            isSuperAdmin: foundUser.isSuperAdmin === true,
            permissions: foundUser.permissions || { canAddEdit: true, canDelete: false, canManageOrders: true },
            avatar: foundUser.avatar || ""
        };

        sessionStorage.setItem("diaw_shoop_current_user", JSON.stringify(safeUser));
        currentUser = safeUser;
        updateUserUI();
        elements.authModal.classList.remove("open");
        showToast(`Heureux de vous revoir, ${escapeHTML(currentUser.name)} !`, "success");
    } else {
        showToast("Identifiants incorrects. Vérifiez votre email et mot de passe.", "error");
    }
});

// Handle Classic User registration
elements.registerForm.addEventListener("submit", async (e) => {



    e.preventDefault();







    // 1. Protection Anti-Robot Honeypot invisible



    const hpField = document.getElementById("register-hp");



    if (hpField && hpField.value && hpField.value.trim() !== "") {



        console.warn("Robot détecté via le piège Honeypot. Inscription bloquée.");



        // Rejet silencieux : le robot croit avoir réussi, mais rien n'est créé



        elements.authModal.classList.remove("open");



        return;



    }







    const name = document.getElementById("register-name").value.trim();



    const email = document.getElementById("register-email").value.trim().toLowerCase();



    const password = document.getElementById("register-password").value;







    if (!name || !email || !password) {



        showToast("Veuillez remplir tous les champs obligatoires.", "error");



        return;



    }







    if (password.length < 6) {



        showToast("Le mot de passe doit comporter au moins 6 caractères.", "error");



        return;



    }







    const users = JSON.parse(localStorage.getItem("diaw_shoop_users")) || [];



    if (users.some(u => u.email === email)) {



        showToast("Cette adresse e-mail est déjà enregistrée. Veuillez vous connecter.", "error");



        return;



    }







    const btnSubmit = document.getElementById("btn-submit-register") || document.querySelector('#register-form button[type="submit"]');



    const originalBtnText = btnSubmit ? btnSubmit.textContent : "Créer mon compte";



    if (btnSubmit) {



        btnSubmit.textContent = "Création du compte...";



        btnSubmit.disabled = true;



    }







    try {



        // Enregistrement dans Supabase en arrière-plan si disponible



        if (supabaseClient) {



            try {



                await db.signUp(email, password, name);



            } catch (err) {



                console.warn("Supabase background signup notice:", err);



            }



        }







        const newUser = {



            email,



            passwordHash: mockHashPassword(password),



            name,



            isAdmin: false,



            emailVerified: true,



            createdAt: new Date().toISOString(),



            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`



        };







        users.push(newUser);



        localStorage.setItem("diaw_shoop_users", JSON.stringify(users));







        // Connexion immédiate du client



        sessionStorage.setItem("diaw_shoop_current_user", JSON.stringify(newUser));



        currentUser = newUser;



        updateUserUI();







        elements.authModal.classList.remove("open");



        elements.registerForm.reset();



        showToast(`Bienvenue chez DIAW SHOOP, ${name} ! Votre compte est activé avec succès.`);



    } finally {



        if (btnSubmit) {



            btnSubmit.textContent = originalBtnText;



            btnSubmit.disabled = false;



        }



    }



});







// --- 5. AUTHENTICATION LOGOUT & SESSION FLOW ---







// Handle Logout



elements.btnLogout.addEventListener("click", (e) => {



    e.preventDefault();



    sessionStorage.removeItem("diaw_shoop_current_user");



    currentUser = null;







    // Restore client view visibility in case logout happened in admin dashboard



    const clientHeader = document.getElementById("main-header");



    const clientShopView = document.getElementById("client-shop-view");



    const clientFooter = document.querySelector(".main-footer");







    if (clientHeader) clientHeader.style.display = "block";



    if (clientShopView) clientShopView.style.display = "block";



    if (clientFooter) clientFooter.style.display = "block";







    updateUserUI();



    showToast("Vous avez été déconnecté.");



});







// --- 6. CATALOGUE INTERACTIVITY (DISPLAY, FILTER, SEARCH) ---



function renderProductList() {



    elements.productsGrid.innerHTML = "";







    const storeSettings = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || {};



    const promosActive = false;







    // Apply filters



    let filtered = products.filter(p => {



        const matchCategory = activeCategory === "all" || p.category === activeCategory;



        const safeName = p.name || "";



        const safeDesc = p.description || "";



        const safeCat = p.category || "";



        const q = searchFilter.toLowerCase().trim();



        const matchSearch = !q ||



            safeName.toLowerCase().includes(q) ||



            safeDesc.toLowerCase().includes(q) ||



            safeCat.toLowerCase().includes(q);



        return matchCategory && matchSearch;



    });







    // Sort



    if (sortOrder === "price-asc") {



        filtered.sort((a, b) => a.price - b.price);



    } else if (sortOrder === "price-desc") {



        filtered.sort((a, b) => b.price - a.price);



    }







    // Display results



    if (filtered.length === 0) {



        elements.productsGrid.innerHTML = `



            <div class="loading-spinner-wrapper" style="grid-column: 1 / -1; text-align: center; padding: 45px 20px;">



                <i class="fa-solid fa-magnifying-glass" style="font-size: 2.8rem; color: var(--accent); margin-bottom: 15px;"></i>



                <h3 style="margin-bottom: 8px;">Aucun article trouvé</h3>



                <p style="color: var(--text-muted); margin-bottom: 20px;">



                    ${searchFilter ? `Aucun produit ne correspond à "<strong>${escapeHTML(searchFilter)}</strong>".` : "Aucun article ne correspond aux critères sélectionnés."}



                </p>



                ${searchFilter ? '<button type="button" class="btn btn-secondary btn-sm" id="btn-reset-empty-search" style="padding: 10px 18px; border-radius: 50px;"><i class="fa-solid fa-rotate-left"></i> Voir tous les articles</button>' : ''}



            </div>



        `;



        const resetBtn = document.getElementById("btn-reset-empty-search");

        if (resetBtn) {

            resetBtn.addEventListener("click", () => {

                if (elements.searchInput) elements.searchInput.value = "";

                searchFilter = "";

                if (elements.activeFiltersInfo) elements.activeFiltersInfo.style.display = "none";

                renderProductList();

            });

        }



        return;



    }







    filtered.forEach(p => {



        // Calculate rating details



        const prodReviews = reviews.filter(r => r.productId === p.id);



        const reviewsCount = prodReviews.length;



        let ratingHtml = "";



        if (reviewsCount > 0) {



            const avgRating = prodReviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount;



            ratingHtml = `



                <div class="product-card-rating" style="margin-bottom: 8px; color: #eab308; font-size: 0.8rem; display: flex; align-items: center; gap: 4px; cursor: pointer;" onclick="openProductDetail('${p.id}')">



                    <span style="font-weight: 700;">${avgRating.toFixed(1)}</span>



                    <span><i class="fa-solid fa-star"></i></span>



                    <span style="color: var(--text-muted); font-size: 0.75rem;">(${reviewsCount} avis)</span>



                </div>



            `;



        } else {



            ratingHtml = `



                <div class="product-card-rating" style="margin-bottom: 8px; color: var(--text-muted); font-size: 0.75rem; font-style: italic; cursor: pointer;" onclick="openProductDetail('${p.id}')">



                    Aucun avis



                </div>



            `;



        }







        const priceContainerHtml = `<div class="product-card-price">${Number(p.price).toLocaleString("fr-FR")} FCFA</div>`;







        const card = document.createElement("div");



        card.className = "product-card";



        card.innerHTML = `



            <div class="product-card-image-wrapper" onclick="openProductDetail('${p.id}')">



                



                <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" onerror="this.src='https://placehold.co/400x500?text=${encodeURIComponent(p.name)}'">



            </div>



            <div class="product-card-body">



                <span class="product-category-tag">${escapeHTML(p.category)}</span>



                <h3 class="product-card-title" onclick="openProductDetail('${p.id}')">${escapeHTML(p.name)}</h3>



                ${ratingHtml}



                ${priceContainerHtml}



            </div>



            <div class="product-card-hover-actions">



                <button class="quick-add-btn" onclick="quickAddToCart('${p.id}')" title="Ajout rapide au panier">



                    <i class="fa-solid fa-plus"></i>



                </button>



            </div>



        `;



        elements.productsGrid.appendChild(card);



    });



}







// Normalisation des colonnes diawshoop_products vers le modèle de rendu



function normalizeProduct(p) {



    const stockQty = Number(p.stock !== undefined ? p.stock : (p.stocks && p.stocks.total ? p.stocks.total : 20));



    return {



        id: String(p.id),



        name: p.name || "",



        price: Number(p.price || 0),



        oldPrice: p.old_price ? Number(p.old_price) : undefined,



        category: p.category || 'vetements',



        description: p.description || p.name || "",



        image: p.image_url || p.image || 'assets/abaya_silk.webp',



        image_url: p.image_url || p.image || 'assets/abaya_silk.webp',



        videoUrl: p.video_url || "",



        stock: stockQty,



        stocks: (p.stocks && typeof p.stocks === 'object') ? p.stocks : {



            total: stockQty,



            S: stockQty,



            M: stockQty,



            L: stockQty,



            XL: stockQty



        },



        isPromo: p.is_promo === true,



        hasSizes: p.has_sizes !== false,



        sizeType: p.size_type || 'multiple',



        isActive: p.is_active !== false



    };



}







// Chargement direct du catalogue depuis Supabase Cloud (diawshoop_products)



async function loadProductsFromSupabase() {
    try {
        if (supabaseClient) {
            console.log("Chargement direct du catalogue depuis Supabase (diawshoop_products)...");
            const dbProducts = await db.getProducts();
            if (dbProducts !== null && Array.isArray(dbProducts)) {
                if (dbProducts.length > 0) {
                    products = dbProducts.map(normalizeProduct);
                    localStorage.setItem("diaw_shoop_products", JSON.stringify(products));
                    console.log(`Catalogue synchronisé : ${products.length} articles chargés depuis Supabase.`);
                } else {
                    products = [];
                    localStorage.setItem("diaw_shoop_products", JSON.stringify([]));
                    console.log("Catalogue Supabase : aucun article actif trouvé.");
                }
            } else {
                console.warn("Connexion à diawshoop_products impossible, conservation du catalogue local.");
            }
        }
    } catch (err) {
        console.error("Erreur lors du chargement Supabase:", err);
    } finally {
        renderProductList();
        if (currentUser && currentUser.isAdmin) {
            renderAdminDashboard();
        }
    }
}







// Écoute des modifications en temps réel sur Supabase (Realtime postgres_changes)



let realtimeChannelSubscribed = false;



function subscribeToProductUpdates() {



    if (!supabaseClient || realtimeChannelSubscribed) return;



    try {



        supabaseClient



            .channel('diawshoop_realtime_sync')



            .on('postgres_changes', { event: '*', schema: 'public', table: 'diawshoop_products' }, (payload) => {



                console.log("⚡ Changement détecté en temps réel sur diawshoop_products :", payload);



                loadProductsFromSupabase();



            })



            .on('postgres_changes', { event: '*', schema: 'public', table: 'diawshoop_orders' }, (payload) => {
                console.log("Nouvelle commande reçue en temps réel sur diawshoop_orders :", payload);
                if (currentUser && currentUser.isAdmin) {
                    loadOrdersFromSupabase();
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'store_admins' }, () => {
                console.log("Mise à jour des administrateurs reçue en temps réel sur store_admins.");
                if (currentUser && currentUser.isAdmin) {
                    renderAdminRolesTable();
                }
            })



            .subscribe((status) => {



                if (status === 'SUBSCRIBED') {



                    realtimeChannelSubscribed = true;



                    console.log("Abonnement Realtime Supabase actif.");



                }



            });



    } catch (e) {



        console.debug("Notice Realtime Supabase :", e);



    }



}







loadProductsFromSupabase();



subscribeToProductUpdates();







// Chargement et synchronisation des paramètres de boutique depuis Supabase Cloud



async function loadSettingsFromSupabase() {



    if (!supabaseClient) return;



    try {



        const cloudSettings = await db.getSettings();



        if (cloudSettings) {



            const current = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || {};



            const merged = {



                ...current,



                promotionsEnabled: cloudSettings.promotions_enabled !== false,



                promoBannerText: cloudSettings.promo_banner_text || current.promoBannerText,



                whatsapp: cloudSettings.whatsapp || current.whatsapp,



                email: cloudSettings.email || current.email,



                shopName: cloudSettings.shop_name || current.shopName,



                shopLogo: cloudSettings.shop_logo || current.shopLogo,



                address: cloudSettings.address || current.address,



                hours: cloudSettings.hours || current.hours,



                instagram: cloudSettings.instagram || current.instagram,



                facebook: cloudSettings.facebook || current.facebook,



                tiktok: cloudSettings.tiktok || current.tiktok,



                payoutNumber: cloudSettings.payout_number || current.payoutNumber,



                payoutCarrier: cloudSettings.payout_carrier || current.payoutCarrier,



                deliveryPricing: cloudSettings.delivery_pricing || current.deliveryPricing



            };



            localStorage.setItem("diaw_shoop_settings", JSON.stringify(merged));



            applyStoreSettings();



            if (typeof renderProductList === "function") {



                renderProductList();



            }



        }



    } catch (e) {



        console.warn("Could not load cloud settings:", e);



    }



}



loadSettingsFromSupabase();







// Chargement et synchronisation des commandes depuis Supabase



async function loadOrdersFromSupabase(showNotification = false) {



    try {



        if (supabaseClient) {



            console.log("Loading orders from Supabase...");



            const dbOrders = await db.getOrders();



            if (dbOrders && dbOrders.length > 0) {



                const deletedOrders = getDeletedOrderIds();



                const formattedRemote = dbOrders



                    .filter(row => !deletedOrders.includes(String(row.id)) && !deletedOrders.includes(String(row.reference)))



                    .map(row => ({



                        id: row.reference || row.id,



                        supabaseId: row.id,



                        reference: row.reference || row.id,



                        date: row.created_at ? new Date(row.created_at).toLocaleString("fr-FR") : new Date().toLocaleString("fr-FR"),



                        clientName: row.customer_name || "Client",



                        clientEmail: row.customer_email || "",



                        clientPhone: row.customer_phone || "",



                        clientAddress: row.shipping_address || "Dakar, Sénégal",



                        notes: row.notes || "",



                        items: Array.isArray(row.items) ? row.items : (typeof row.items === "string" ? JSON.parse(row.items) : []),



                        total: Number(row.total_amount) || 0,



                        subtotal: Number(row.total_amount) || 0,



                        shippingCost: Number(row.shipping_cost) || 0,



                        status: row.status || "Payée (En attente d'expédition)",



                        paymentMethod: (row.reference && row.reference.includes("CASH")) ? "CASH" : "MOBILE_MONEY"



                    }));







                // Fusion intelligente avec le cache local



                const mergedMap = new Map();



                formattedRemote.forEach(o => mergedMap.set(o.reference, o));



                orders.forEach(localOrder => {



                    const ref = localOrder.reference || localOrder.id;



                    const isDeleted = deletedOrders.includes(String(localOrder.id)) || 



                                      deletedOrders.includes(String(localOrder.reference)) || 



                                      (localOrder.supabaseId && deletedOrders.includes(String(localOrder.supabaseId)));



                    if (!isDeleted) {



                        if (mergedMap.has(ref)) {



                            const remote = mergedMap.get(ref);



                            mergedMap.set(ref, { ...remote, ...localOrder });



                        } else {



                            mergedMap.set(ref, localOrder);



                        }



                    }



                });







                orders = Array.from(mergedMap.values()).filter(o => 



                    !deletedOrders.includes(String(o.id)) && 



                    !deletedOrders.includes(String(o.reference)) &&



                    (!o.supabaseId || !deletedOrders.includes(String(o.supabaseId)))



                );



                localStorage.setItem("diaw_shoop_orders", JSON.stringify(orders));







                if (showNotification) {



                    showToast(`${orders.length} commande(s) synchronisée(s) avec succès !`);



                }



            } else if (showNotification) {



                showToast("Toutes les commandes sont à jour.");



            }



        }



    } catch (err) {



        console.error("Erreur chargement commandes Supabase :", err);



        if (showNotification) {



            showToast("Impossible de contacter Supabase pour les commandes.", "warning");



        }



    } finally {



        if (currentUser && currentUser.isAdmin) {



            renderAdminDashboard();



        }



    }



}



loadOrdersFromSupabase();







// Category Filters Click Events



elements.categoryTabs.querySelectorAll(".tab-btn").forEach(btn => {



    btn.addEventListener("click", function () {



        elements.categoryTabs.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));



        this.classList.add("active");



        activeCategory = this.getAttribute("data-category");



        renderProductList();



    });



});







// Search functionality (Safeguarded)



function handleSearch() {



    if (!elements.searchInput) return;



    searchFilter = elements.searchInput.value.trim();



    if (searchFilter) {



        if (elements.activeFiltersInfo) elements.activeFiltersInfo.style.display = "flex";



        if (elements.searchQueryText) elements.searchQueryText.textContent = searchFilter;



    } else {



        if (elements.activeFiltersInfo) elements.activeFiltersInfo.style.display = "none";



    }



    renderProductList();



}



if (elements.searchBtn) {



    elements.searchBtn.addEventListener("click", handleSearch);



}



if (elements.searchInput) {



    elements.searchInput.addEventListener("input", handleSearch);



    elements.searchInput.addEventListener("keypress", (e) => {



        if (e.key === "Enter") {

            e.preventDefault();

            handleSearch();

        }



    });



}



if (elements.clearSearchBtn) {



    elements.clearSearchBtn.addEventListener("click", () => {



        if (elements.searchInput) elements.searchInput.value = "";



        searchFilter = "";



        if (elements.activeFiltersInfo) elements.activeFiltersInfo.style.display = "none";



        renderProductList();



    });



}







// Sorting Event



elements.sortSelect.addEventListener("change", function () {



    sortOrder = this.value;



    renderProductList();



});







// --- 7. DETAILED PRODUCT MODAL & WHATSAPP GENERATION ---



let currentDetailProduct = null;



let selectedSize = null;







function openProductDetail(id) {



    currentDetailProduct = products.find(p => p.id === id);



    if (!currentDetailProduct) return;







    selectedSize = null; // reset







    // Set media content (Image or Video)



    elements.modalMediaContainer.innerHTML = "";







    if (currentDetailProduct.videoUrl) {



        const vUrl = currentDetailProduct.videoUrl.trim();



        // Check if YouTube



        if (vUrl.includes("youtube.com") || vUrl.includes("youtu.be")) {



            let embedUrl = vUrl;



            if (vUrl.includes("watch?v=")) {



                const vid = vUrl.split("watch?v=")[1].split("&")[0];



                embedUrl = `https://www.youtube.com/embed/${vid}`;



            } else if (vUrl.includes("youtu.be/")) {



                const vid = vUrl.split("youtu.be/")[1].split("?")[0];



                embedUrl = `https://www.youtube.com/embed/${vid}`;



            }



            elements.modalMediaContainer.innerHTML = `



                <iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%; min-height:350px; border-radius:8px;"></iframe>



            `;



        } else {



            // Direct MP4 link



            elements.modalMediaContainer.innerHTML = `



                <video src="${escapeHTML(vUrl)}" controls autoplay muted loop style="width:100%; height:100%; min-height:350px; object-fit:cover; border-radius:8px;"></video>



            `;



        }



    } else {



        // Fallback to static image



        const img = document.createElement("img");



        img.src = currentDetailProduct.image;



        img.alt = currentDetailProduct.name;



        img.id = "modal-product-image";



        img.onerror = function () {



            this.src = `https://placehold.co/500x600?text=${encodeURIComponent(currentDetailProduct.name)}`;



        };



        elements.modalMediaContainer.appendChild(img);



    }







    elements.modalProductCategory.textContent = currentDetailProduct.category.toUpperCase();



    elements.modalProductTitle.textContent = currentDetailProduct.name;







    elements.modalProductPrice.innerHTML = `${Number(currentDetailProduct.price).toLocaleString("fr-FR")} FCFA`;







    elements.modalProductDesc.textContent = currentDetailProduct.description;







    // Sizing & Description Interface conditional by category and productRequiresSize



    const isCosmetic = currentDetailProduct.category === "beaute" || currentDetailProduct.category === "parfums";



    const sizeWrapper = document.getElementById("modal-size-selection-wrapper");



    const cosmeticBox = document.getElementById("modal-cosmetic-details");



    const cosmeticBenefitsEl = document.getElementById("modal-cosmetic-benefits");







    if (isCosmetic) {



        // COSMETICS / PERFUMES: Rich detailed descriptions, NO sizes



        if (sizeWrapper) sizeWrapper.style.display = "none";



        if (cosmeticBox) {



            cosmeticBox.style.display = "block";



            if (cosmeticBenefitsEl) {



                cosmeticBenefitsEl.textContent = currentDetailProduct.description || "Formule enrichie aux actifs précieux bio et naturels pour sublimer votre bien-être et révéler tout votre éclat.";



            }



        }



        selectedSize = "U";



        const totalStock = currentDetailProduct.stocks ? (currentDetailProduct.stocks.total || currentDetailProduct.stocks.S || 25) : 25;



        updateStockDisplay(totalStock);



    } else if (!productRequiresSize(currentDetailProduct)) {



        // CLOTHING TAILLE UNIQUE (Abayas, kimonos, voiles...)



        if (cosmeticBox) cosmeticBox.style.display = "none";



        if (sizeWrapper) {



            sizeWrapper.style.display = "block";



            const sizeHeader = sizeWrapper.querySelector(".size-header span");



            if (sizeHeader) sizeHeader.textContent = "Coupe de l'article :";



            elements.sizeOptionsContainer.innerHTML = `



                <div style="background: rgba(212, 175, 55, 0.12); border: 1.5px solid var(--accent); border-radius: 8px; padding: 10px 14px; display: inline-flex; align-items: center; gap: 8px; font-size: 0.88rem; font-weight: 600; color: var(--accent-dark);">



                    <i class="fa-solid fa-gem text-accent"></i>



                    <span>Taille Unique (Coupe fluide adaptée à toutes les morphologies)</span>



                </div>



            `;



        }



        selectedSize = "U";



        const totalStock = currentDetailProduct.stocks ? (currentDetailProduct.stocks.total || currentDetailProduct.stocks.S || 25) : 25;



        updateStockDisplay(totalStock);



    } else {



        // CLOTHING MULTIPLE SIZES: Size selector active (XS, S, M, L, XL, 2XL)



        if (cosmeticBox) cosmeticBox.style.display = "none";



        if (sizeWrapper) {



            sizeWrapper.style.display = "block";



            const sizeHeader = sizeWrapper.querySelector(".size-header span");



            if (sizeHeader) sizeHeader.textContent = "Sélectionner une taille :";



            elements.sizeOptionsContainer.innerHTML = "";



            const sizeKeys = ["XS", "S", "M", "L", "XL", "2XL"];







            sizeKeys.forEach(sz => {



                const stock = currentDetailProduct.stocks ? (currentDetailProduct.stocks[sz] ?? 10) : 10;



                const btn = document.createElement("button");



                btn.className = "size-btn";



                btn.textContent = sz;







                if (stock <= 0) {



                    btn.classList.add("disabled");



                    btn.title = "Rupture de stock";



                } else {



                    btn.addEventListener("click", () => {



                        document.querySelectorAll(".size-options .size-btn").forEach(b => b.classList.remove("active"));



                        btn.classList.add("active");



                        selectedSize = sz;



                        updateStockDisplay(stock);



                    });



                }



                elements.sizeOptionsContainer.appendChild(btn);



            });



            elements.modalStockStatus.textContent = "Sélectionnez une taille pour voir la disponibilité.";



            elements.modalStockStatus.style.color = "var(--text-muted)";



        }



        selectedSize = null;



    }







    renderProductReviews(id);







    elements.productDetailModal.classList.add("open");



}







function updateStockDisplay(qty) {



    if (qty > 5) {



        elements.modalStockStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> En Stock (${qty} disponibles)`;



        elements.modalStockStatus.style.color = "var(--success)";



    } else if (qty > 0) {



        elements.modalStockStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Stock Limité (Seulement ${qty} restants)`;



        elements.modalStockStatus.style.color = "var(--om-orange)";



    } else {



        elements.modalStockStatus.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Rupture de stock`;



        elements.modalStockStatus.style.color = "var(--free-red)";



    }



}







elements.btnCloseProductModal.addEventListener("click", () => {



    elements.productDetailModal.classList.remove("open");



});







// Add to Cart inside detail view



elements.modalBtnAddCart.addEventListener("click", () => {



    if (!currentDetailProduct) return;



    const reqSize = productRequiresSize(currentDetailProduct);







    if (reqSize && !selectedSize) {



        showToast("Veuillez sélectionner votre taille (XS, S, M, L, XL, 2XL) avant d'ajouter l'article.", "error");



        return;



    }







    addToCart(currentDetailProduct.id, selectedSize || "U");



    elements.productDetailModal.classList.remove("open");



});







// WhatsApp Direct Purchase order (Senegal specific conversion optimization)



elements.modalBtnWhatsapp.addEventListener("click", () => {



    if (!currentDetailProduct) return;



    const reqSize = productRequiresSize(currentDetailProduct);







    if (reqSize && !selectedSize) {



        showToast("Veuillez sélectionner une taille avant de commander via WhatsApp.", "error");



        return;



    }







    const shopSettings = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || { whatsapp: "221705476061", shopName: "DIAW SHOOP" };



    const currentShopName = shopSettings.shopName || "DIAW SHOOP";



    const sizeText = (selectedSize && selectedSize !== "U") ? `\n- *Taille* : ${selectedSize}` : (reqSize ? "" : "\n- *Taille* : Taille Unique");



    const promoNotice = "";



    const message = `Bonjour ${currentShopName} ! Je souhaite commander cet article :



- *Produit* : ${currentDetailProduct.name}${sizeText}



- *Prix* : ${currentDetailProduct.price.toLocaleString("fr-FR")} FCFA${promoNotice}







Merci de me confirmer sa disponibilité !`;







    const encoded = encodeURIComponent(message);



    const waUrl = `https://wa.me/${shopSettings.whatsapp}?text=${encoded}`;



    window.open(waUrl, "_blank");



});







// Quick Add to Cart helper (from the grid directly, picks first available size or asks to open detail)



function quickAddToCart(productId) {



    const prod = products.find(p => p.id === productId);



    if (!prod) return;







    // Si le produit est en taille unique (Abayas, voiles, soins, parfums...)



    if (!productRequiresSize(prod)) {



        addToCart(productId, "U");



        return;



    }







    // Trouver la première taille avec stock positif



    let sizeFound = null;



    const sizes = ["M", "S", "L", "XL", "XS", "2XL"];



    for (let s of sizes) {



        if (prod.stocks && prod.stocks[s] > 0) {



            sizeFound = s;



            break;



        }



    }







    if (sizeFound) {



        addToCart(productId, sizeFound);



    } else {



        openProductDetail(productId);



    }



}







// --- 8. SHOPPING CART MANAGEMENT ---



function addToCart(id, size, openDrawer = false) {



    const prod = products.find(p => p.id === id);



    if (!prod) return;







    // Normalize size: null for cosmetics/items without size



    const effectiveSize = (size && size !== "U" && size !== "none") ? size : null;







    // Check if item is already in cart



    const existing = cart.find(item => item.id === id && (item.size === effectiveSize || (!item.size && !effectiveSize)));







    // Check stock limit (fallback to standard stock)



    let currentStock = 99;



    if (prod.stocks) {



        if (effectiveSize && prod.stocks[effectiveSize] !== undefined) {



            currentStock = prod.stocks[effectiveSize];



        } else if (prod.stocks.S !== undefined) {



            currentStock = prod.stocks.S;



        } else if (prod.stocks.total !== undefined) {



            currentStock = prod.stocks.total;



        }



    }







    if (existing) {



        if (existing.qty >= currentStock) {



            const errorMsg = effectiveSize ? `Désolé, stock insuffisant pour la taille ${effectiveSize}.` : "Désolé, stock insuffisant pour cet article.";



            showToast(errorMsg, "error");



            return;



        }



        existing.qty += 1;



    } else {



        cart.push({



            id: prod.id,



            name: prod.name,



            price: prod.price,



            image: prod.image,



            size: effectiveSize,



            qty: 1



        });



    }







    saveCart();



    renderCart();



    if (openDrawer) {



        elements.cartSidebar.classList.add("open");



        elements.sidebarOverlay.classList.add("open");



    }



    const displayLabel = effectiveSize ? `${prod.name} (${effectiveSize})` : prod.name;



    showToast(`"${displayLabel}" ajouté au panier !`, "success");



}







function saveCart() {



    localStorage.setItem("diaw_shoop_cart", JSON.stringify(cart));



}







function renderCart() {



    // 1. Update Badge counts



    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);



    elements.cartBadge.textContent = totalItems;







    if (cart.length === 0) {



        elements.cartSidebarBody.innerHTML = `



            <div class="empty-cart-message">



                <i class="fa-solid fa-bag-shopping empty-icon"></i>



                <p>Votre panier est vide.</p>



                <button class="btn btn-primary" id="btn-cart-continue">Commencer vos achats</button>



            </div>



        `;



        // Re-attach close dynamic listener inside guest body



        const btnContinue = document.getElementById("btn-cart-continue");



        if (btnContinue) {



            btnContinue.addEventListener("click", () => {



                elements.cartSidebar.classList.remove("open");



                elements.sidebarOverlay.classList.remove("open");



            });



        }



        elements.cartSidebarFooter.style.display = "none";



        return;



    }







    elements.cartSidebarFooter.style.display = "block";



    elements.cartSidebarBody.innerHTML = "";







    // Render list items



    cart.forEach(item => {



        const itemEl = document.createElement("div");



        itemEl.className = "cart-item";



        itemEl.innerHTML = `



            <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" class="cart-item-image">



            <div class="cart-item-info">



                <h4 class="cart-item-title">${escapeHTML(item.name)}</h4>



                <span class="cart-item-size" style="${(!item.size || item.size === 'U' || item.size === 'none') ? 'display:none;' : ''}">Taille : ${escapeHTML(item.size || '')}</span>



                <span class="cart-item-price">${(item.price * item.qty).toLocaleString("fr-FR")} F</span>



                <div class="cart-item-qty">



                    <button class="qty-btn" onclick="updateCartQty('${item.id}', '${item.size || ''}', -1)"><i class="fa-solid fa-minus"></i></button>



                    <span class="qty-val">${item.qty}</span>



                    <button class="qty-btn" onclick="updateCartQty('${item.id}', '${item.size || ''}', 1)"><i class="fa-solid fa-plus"></i></button>



                </div>



            </div>



            <button class="remove-item-btn" onclick="removeFromCart('${item.id}', '${item.size || ''}')"><i class="fa-solid fa-trash-can"></i></button>



        `;



        elements.cartSidebarBody.appendChild(itemEl);



    });







    calculateCartTotals();



}







function updateCartQty(id, size, change) {



    const targetSize = (size && size !== "undefined" && size !== "null" && size !== "") ? size : null;



    const item = cart.find(i => i.id === id && ((!i.size && !targetSize) || i.size === targetSize));



    if (!item) return;







    const prod = products.find(p => p.id === id);



    let stockLimit = 99;



    if (prod && prod.stocks) {



        if (targetSize && prod.stocks[targetSize] !== undefined) {



            stockLimit = prod.stocks[targetSize];



        } else if (prod.stocks.S !== undefined) {



            stockLimit = prod.stocks.S;



        } else if (prod.stocks.total !== undefined) {



            stockLimit = prod.stocks.total;



        }



    }







    if (change > 0 && item.qty >= stockLimit) {



        showToast("Impossible d'ajouter plus d'articles. Stock maximum atteint.", "error");



        return;



    }







    item.qty += change;



    if (item.qty <= 0) {



        removeFromCart(id, size);



        return;



    }







    saveCart();



    renderCart();



}







function removeFromCart(id, size) {



    const targetSize = (size && size !== "undefined" && size !== "null" && size !== "") ? size : null;



    cart = cart.filter(item => !(item.id === id && ((!item.size && !targetSize) || item.size === targetSize)));



    saveCart();



    renderCart();



    showToast("Article retiré du panier.", "info");



}







function updateDeliveryZoneSelect() {



    const select = document.getElementById("cart-delivery-zone");



    if (!select) return;







    const settings = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || {};



    const delivery = settings.deliveryPricing || {



        dakarCentre: 1500,



        banlieue: 2500,



        regions: 4000,



        regionsEnabled: true,



        pickupEnabled: true,



        freeShippingThreshold: 35000



    };







    const currentVal = select.value;



    select.innerHTML = "";







    // Retrait Showroom (Gratuit)



    if (delivery.pickupEnabled !== false) {



        const optPickup = document.createElement("option");



        optPickup.value = "pickup";



        optPickup.textContent = "Retrait Showroom (Liberté 6) - Gratuit (0 F)";



        select.appendChild(optPickup);



    }







    // Dakar Centre



    const optDakar = document.createElement("option");



    optDakar.value = "dakar-centre";



    optDakar.textContent = `Dakar Centre (Plateau, Mermoz...) - ${Number(delivery.dakarCentre || 1500).toLocaleString("fr-FR")} F`;



    select.appendChild(optDakar);







    // Dakar Banlieue



    const optBanlieue = document.createElement("option");



    optBanlieue.value = "dakar-banlieue";



    optBanlieue.textContent = `Banlieue (Pikine, Rufisque...) - ${Number(delivery.banlieue || 2500).toLocaleString("fr-FR")} F`;



    select.appendChild(optBanlieue);







    // Régions du Sénégal (si activé)



    if (delivery.regionsEnabled !== false) {



        const optReg = document.createElement("option");



        optReg.value = "regions";



        optReg.textContent = `Régions du Sénégal - ${Number(delivery.regions || 4000).toLocaleString("fr-FR")} F`;



        select.appendChild(optReg);



    }







    const availableValues = Array.from(select.options).map(o => o.value);



    if (availableValues.includes(currentVal)) {



        select.value = currentVal;



    } else {



        select.value = availableValues.includes("dakar-centre") ? "dakar-centre" : availableValues[0];



    }



}







function calculateCartTotals() {



    const subtotal = (typeof cart !== "undefined" && Array.isArray(cart))



        ? cart.reduce((sum, item) => sum + (item.price * item.qty), 0)



        : 0;







    const settings = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || {};



    const delivery = settings.deliveryPricing || {



        dakarCentre: 1500,



        banlieue: 2500,



        regions: 4000,



        regionsEnabled: true,



        pickupEnabled: true,



        freeShippingThreshold: 35000



    };







    const deliverySelect = (typeof elements !== "undefined" && elements && elements.cartDeliveryZone)



        ? elements.cartDeliveryZone



        : document.getElementById("cart-delivery-zone");



    const zone = deliverySelect ? deliverySelect.value : "dakar-centre";



    let shipping = Number(delivery.dakarCentre || 1500);







    if (zone === "pickup") {



        shipping = 0;



    } else if (zone === "dakar-banlieue") {



        shipping = Number(delivery.banlieue || 2500);



    } else if (zone === "regions") {



        shipping = Number(delivery.regions || 4000);



    }







    // Seuil de gratuité configuré par l'admin (applicable hors régions)



    const threshold = Number(delivery.freeShippingThreshold || 0);



    if (zone !== "pickup" && zone !== "regions" && threshold > 0 && subtotal >= threshold) {



        shipping = 0;



    }







    const total = subtotal + shipping;







    const subtotalEl = (typeof elements !== "undefined" && elements && elements.cartSubtotal) ? elements.cartSubtotal : document.getElementById("cart-subtotal");



    const shippingEl = (typeof elements !== "undefined" && elements && elements.cartShippingCost) ? elements.cartShippingCost : document.getElementById("cart-shipping-cost");



    const totalEl = (typeof elements !== "undefined" && elements && elements.cartTotal) ? elements.cartTotal : document.getElementById("cart-total");







    if (subtotalEl) subtotalEl.textContent = `${subtotal.toLocaleString("fr-FR")} FCFA`;



    if (shippingEl) shippingEl.textContent = shipping === 0 ? "GRATUIT" : `${shipping.toLocaleString("fr-FR")} FCFA`;



    if (totalEl) totalEl.textContent = `${total.toLocaleString("fr-FR")} FCFA`;







    // Save to global checkout state if available



    if (typeof checkoutDetails !== "undefined" && checkoutDetails) {



        checkoutDetails.subtotal = subtotal;



        checkoutDetails.shippingCost = shipping;



        checkoutDetails.total = total;



        checkoutDetails.deliveryZone = zone;



        if (typeof cart !== "undefined" && Array.isArray(cart)) {



            checkoutDetails.items = [...cart];



        }



    }



}







// Cart Drawer open/close events



elements.cartTriggerBtn.addEventListener("click", () => {



    elements.cartSidebar.classList.add("open");



    elements.sidebarOverlay.classList.add("open");



});







const closeCartHandler = () => {



    elements.cartSidebar.classList.remove("open");



    elements.sidebarOverlay.classList.remove("open");



};



elements.closeCartBtn.addEventListener("click", closeCartHandler);



elements.sidebarOverlay.addEventListener("click", closeCartHandler);



if (elements.cartDeliveryZone) {



    elements.cartDeliveryZone.addEventListener("change", calculateCartTotals);



}







// Initial Cart setup



updateDeliveryZoneSelect();



renderCart();







// Trigger Checkout (Seamless support for both guests and authenticated clients)



elements.btnCheckoutTrigger.addEventListener("click", () => {



    if (cart.length === 0) {



        showToast("Votre panier est vide.", "info");



        return;



    }







    // Populate form with logged in user details if available, otherwise clear for guest entry



    const nameInput = document.getElementById("checkout-name");



    const emailInput = document.getElementById("checkout-email");



    if (nameInput) nameInput.value = currentUser ? (currentUser.name || "") : "";



    if (emailInput) emailInput.value = currentUser ? (currentUser.email || "") : "";







    // Update summary amount text



    elements.checkoutAmountSummary.textContent = `${checkoutDetails.total.toLocaleString("fr-FR")} FCFA`;







    // Open checkout modal



    elements.cartSidebar.classList.remove("open");



    elements.sidebarOverlay.classList.remove("open");







    // Reset steps UI



    setCheckoutStep(1);



    elements.checkoutModal.classList.add("open");



});







elements.btnCloseCheckoutModal.addEventListener("click", () => {



    elements.checkoutModal.classList.remove("open");



});







// --- 9. SECURED SENEGALESE MOBILE PAYMENT SIMULATION ---



function setCheckoutStep(stepNumber) {



    document.querySelectorAll(".checkout-step-content").forEach(el => el.classList.remove("active"));



    document.querySelectorAll(".checkout-steps .step").forEach((el, index) => {



        el.classList.remove("active", "completed");



        if (index + 1 === stepNumber) {



            el.classList.add("active");



        } else if (index + 1 < stepNumber) {



            el.classList.add("completed");



        }



    });







    document.getElementById(`checkout-step-${stepNumber}`).classList.add("active");



}







// STEP 1 Form submit



elements.shippingInfoForm.addEventListener("submit", (e) => {



    e.preventDefault();







    // Secure input validation and sanitation



    const name = document.getElementById("checkout-name").value.trim();



    const phone = document.getElementById("checkout-phone").value.trim();



    const email = document.getElementById("checkout-email").value.trim();



    const address = document.getElementById("checkout-address").value.trim();



    const notes = document.getElementById("checkout-notes").value.trim();







    // Validate Senegalese number formats (9 digits, starts with 77, 78, 76, 75, 70)



    const phoneCleaned = phone.replace(/\s+/g, '');



    const senegalPhoneRegex = /^(77|78|76|75|70)\d{7}$/;







    if (!senegalPhoneRegex.test(phoneCleaned)) {



        showToast("Numéro de téléphone invalide. Veuillez entrer un numéro à 9 chiffres valide au Sénégal (commençant par 77, 78, 76, 75 ou 70).", "error");



        return;



    }







    checkoutDetails.name = name;



    checkoutDetails.phone = phoneCleaned;



    // Fallback email if guest didn't supply one



    checkoutDetails.email = email || `${phoneCleaned}@client.diawshoop.sn`;



    checkoutDetails.address = address;



    checkoutDetails.notes = notes;







    setCheckoutStep(2);



});







elements.btnBackToStep1.addEventListener("click", () => setCheckoutStep(1));







// STEP 2 : Choix du mode de règlement (Paiement à la livraison / À l'arrivée)



let selectedPaymentMethod = "cash";



checkoutDetails.paymentMethod = "cash";







document.querySelectorAll(".payment-method-card").forEach(card => {



    card.addEventListener("click", function () {



        document.querySelectorAll(".payment-method-card").forEach(c => c.classList.remove("active"));



        this.classList.add("active");



        selectedPaymentMethod = "cash";



        checkoutDetails.paymentMethod = "cash";



    });



});







elements.btnBackToStep2.addEventListener("click", () => {



    document.querySelectorAll(".payment-wizard").forEach(w => w.style.display = "none");



    if (elements.simNavButtons) elements.simNavButtons.style.display = "flex";



    setCheckoutStep(2);



});







elements.btnProceedToSim.addEventListener("click", () => {



    selectedPaymentMethod = "cash";



    checkoutDetails.paymentMethod = "cash";







    setCheckoutStep(3);



    document.querySelectorAll(".payment-wizard").forEach(w => w.style.display = "none");







    const wizardCash = document.getElementById("wizard-cash");



    if (wizardCash) wizardCash.style.display = "block";



    const cashAmountConfirm = document.getElementById("cash-amount-confirm");



    if (cashAmountConfirm) {



        cashAmountConfirm.textContent = `${checkoutDetails.total.toLocaleString("fr-FR")} FCFA`;



    }



});







// --- SYSTÈME DE PAIEMENT LOCAL (Simulateur Mobile Money) ---



let paymentPollingInterval = null;







// Déclenche la création de commande et ouvre le portail simulé



const btnTriggerOnlinePayment = document.getElementById("btn-trigger-online-payment");



const btnCancelOnlinePolling = document.getElementById("btn-cancel-online-polling");







if (btnTriggerOnlinePayment) {



    btnTriggerOnlinePayment.addEventListener("click", () => {



        if (!checkoutDetails || !checkoutDetails.total) return;







        // Masquer l'assistant de paiement et afficher le loader



        document.getElementById("wizard-online-payment").style.display = "none";



        document.getElementById("wizard-online-pending").style.display = "block";



        elements.simNavButtons.style.display = "none";







        const settings = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || {};



        const payoutNumber = settings.payoutNumber || "770000000";



        const payoutCarrier = settings.payoutCarrier || "wave";







        fetch("/api/create-order", {



            method: "POST",



            headers: { "Content-Type": "application/json" },



            body: JSON.stringify({



                amount: checkoutDetails.total,



                customer_name: checkoutDetails.name,



                customer_phone: checkoutDetails.phone,



                customer_email: checkoutDetails.email,



                payout_number: payoutNumber,



                payout_carrier: payoutCarrier,



                items: checkoutDetails.items.map(it => ({ id: it.id, name: it.name, qty: it.qty, price: it.price, size: it.size }))



            })



        })



            .then(res => res.json())



            .then(data => {



                if (data.status === "success") {



                    const paymentUrl = data.payment_url;



                    const transactionId = data.transaction_id;







                    // Ouvrir le portail de paiement simulé dans un nouvel onglet



                    const win = window.open(paymentUrl, "_blank");



                    if (!win) {



                        showToast("Veuillez autoriser les pop-ups pour accéder au portail de paiement.", "info");



                    }







                    // Démarrer le polling de vérification



                    startPaymentPolling(transactionId);



                } else {



                    showToast(data.message || "Erreur lors de la création de la commande.", "error");



                    document.getElementById("wizard-online-payment").style.display = "block";



                    document.getElementById("wizard-online-pending").style.display = "none";



                    elements.simNavButtons.style.display = "flex";



                }



            })



            .catch(err => {



                console.error("Erreur création commande :", err);



                showToast("Erreur de connexion avec le serveur.", "error");



                document.getElementById("wizard-online-payment").style.display = "block";



                document.getElementById("wizard-online-pending").style.display = "none";



                elements.simNavButtons.style.display = "flex";



            });



    });



}







function startPaymentPolling(transactionId) {



    if (paymentPollingInterval) clearInterval(paymentPollingInterval);







    const titleEl = document.getElementById("online-pending-title");



    const descEl = document.getElementById("online-pending-desc");



    if (titleEl) titleEl.textContent = "Attente du paiement...";



    if (descEl) descEl.innerHTML = `Finalisez le paiement dans l'onglet ouvert.<br>La validation sera automatique dès confirmation.`;







    paymentPollingInterval = setInterval(() => {



        fetch(`/api/order-status/${transactionId}`)



            .then(res => res.json())



            .then(data => {



                if (data.status === "success" && data.payment_status === "ACCEPTED") {



                    clearInterval(paymentPollingInterval);



                    paymentPollingInterval = null;



                    showToast("Paiement reçu et validé avec succès !", "success");



                    finalizeOnlineOrder(transactionId, checkoutDetails.paymentMethod);



                } else if (data.payment_status === "REFUSED") {



                    clearInterval(paymentPollingInterval);



                    paymentPollingInterval = null;



                    showToast("Le paiement a été refusé ou annulé.", "error");



                    document.getElementById("wizard-online-payment").style.display = "block";



                    document.getElementById("wizard-online-pending").style.display = "none";



                    elements.simNavButtons.style.display = "flex";



                }



            })



            .catch(err => console.error("Erreur vérification statut commande :", err));



    }, 3500);



}







if (btnCancelOnlinePolling) {



    btnCancelOnlinePolling.addEventListener("click", () => {



        if (paymentPollingInterval) {



            clearInterval(paymentPollingInterval);



            paymentPollingInterval = null;



        }



        showToast("Transaction annulée par l'utilisateur.", "error");



        document.getElementById("wizard-online-payment").style.display = "block";



        document.getElementById("wizard-online-pending").style.display = "none";



        elements.simNavButtons.style.display = "flex";



    });



}







function finalizeOnlineOrder(transactionId, paymentMethodUsed) {



    // 1. Create order



    const orderDate = new Date().toLocaleString("fr-FR");



    const clientEmail = currentUser ? currentUser.email : (checkoutDetails.email || `${checkoutDetails.phone}@guest.diawshoop.sn`);



    const newOrder = {



        id: transactionId,



        date: orderDate,



        clientEmail: clientEmail,



        clientName: checkoutDetails.name,



        clientPhone: checkoutDetails.phone,



        clientAddress: checkoutDetails.address,



        notes: checkoutDetails.notes,



        items: checkoutDetails.items,



        subtotal: checkoutDetails.subtotal,



        shippingCost: checkoutDetails.shippingCost,



        total: checkoutDetails.total,



        paymentMethod: paymentMethodUsed.toUpperCase(),



        reference: transactionId,



        status: "Payée (En attente d'expédition)"



    };







    activeCompletedOrder = newOrder;







    // 2. Decrement physical stock



    checkoutDetails.items.forEach(cartItem => {



        const p = products.find(prod => prod.id === cartItem.id);



        const targetSize = (cartItem.size && cartItem.size !== "U" && cartItem.size !== "none") ? cartItem.size : "S";



        if (p && p.stocks && p.stocks[targetSize]) {



            p.stocks[targetSize] = Math.max(0, p.stocks[targetSize] - cartItem.qty);



        }



    });



    localStorage.setItem("diaw_shoop_products", JSON.stringify(products));



    renderProductList();







    // 3. Save order locally & to Supabase



    orders.unshift(newOrder);



    localStorage.setItem("diaw_shoop_orders", JSON.stringify(orders));



    if (supabaseClient) {



        db.createOrder({



            reference: newOrder.reference || newOrder.id,



            customer_name: newOrder.clientName,



            customer_email: newOrder.clientEmail,



            customer_phone: newOrder.clientPhone,



            total_amount: newOrder.total,



            status: newOrder.status,



            items: newOrder.items,



            shipping_address: newOrder.clientAddress



        });



    }







    // 4. Generate ticket invoice



    renderInvoiceTicket(newOrder);







    // 5. Clear cart



    cart = [];



    saveCart();



    renderCart();







    // 6. Go to final receipt step



    setCheckoutStep(4);







    // Show guest signup prompt if customer is not logged in



    const guestPrompt = document.getElementById("guest-signup-prompt");



    if (guestPrompt) {



        guestPrompt.style.display = !currentUser ? "block" : "none";



    }







    // Refresh admin dashboard if open



    if (currentUser && currentUser.isAdmin) {



        renderAdminDashboard();



    }



}







// CASH ON DELIVERY WIZARD CONTROLLER



const btnCashConfirmOrder = document.getElementById("btn-cash-confirm-order");



if (btnCashConfirmOrder) {



    btnCashConfirmOrder.addEventListener("click", () => {



        executeSimulatedTransaction("CASH_COD_" + Math.random().toString(36).substr(2, 6).toUpperCase());



    });



}







// RUN TRANSACTION PROCESSOR



function executeSimulatedTransaction(referenceCode) {



    // Hide wizard options and actions



    document.querySelectorAll(".payment-wizard").forEach(w => w.style.display = "none");



    elements.simNavButtons.style.display = "none";



    elements.transactionLoader.style.display = "flex";







    // Simulate transaction delay



    setTimeout(() => {



        elements.transactionLoader.style.display = "none";







        // 1. Create Order object



        const orderId = "DS-" + Math.floor(100000 + Math.random() * 900000);



        const orderDate = new Date().toLocaleString("fr-FR");



        const clientEmail = currentUser ? currentUser.email : (checkoutDetails.email || `${checkoutDetails.phone}@guest.diawshoop.sn`);







        const newOrder = {



            id: orderId,



            date: orderDate,



            clientEmail: clientEmail,



            clientName: checkoutDetails.name,



            clientPhone: checkoutDetails.phone,



            clientAddress: checkoutDetails.address,



            notes: checkoutDetails.notes,



            items: checkoutDetails.items,



            subtotal: checkoutDetails.subtotal,



            shippingCost: checkoutDetails.shippingCost,



            total: checkoutDetails.total,



            paymentMethod: "Paiement à la livraison",



            reference: referenceCode,



            status: "Reçue (Paiement à la livraison)"



        };







        activeCompletedOrder = newOrder;







        // 2. Decrement physical inventory stock



        checkoutDetails.items.forEach(cartItem => {



            const p = products.find(prod => prod.id === cartItem.id);



            const targetSize = (cartItem.size && cartItem.size !== "U" && cartItem.size !== "none") ? cartItem.size : "S";



            if (p && p.stocks && p.stocks[targetSize]) {



                p.stocks[targetSize] = Math.max(0, p.stocks[targetSize] - cartItem.qty);



            }



        });



        localStorage.setItem("diaw_shoop_products", JSON.stringify(products));



        renderProductList(); // Refresh main view







        // 3. Save order locally & in Supabase



        orders.unshift(newOrder);



        localStorage.setItem("diaw_shoop_orders", JSON.stringify(orders));



        if (supabaseClient) {



            db.createOrder({



                reference: newOrder.reference || newOrder.id,



                customer_name: newOrder.clientName,



                customer_email: newOrder.clientEmail,



                customer_phone: newOrder.clientPhone,



                total_amount: newOrder.total,



                status: newOrder.status,



                items: newOrder.items,



                shipping_address: newOrder.clientAddress



            });



        }







        // 4. Generate invoice receipt ticket



        renderInvoiceTicket(newOrder);







        // 5. Clear cart



        cart = [];



        saveCart();



        renderCart();







        // 6. Go to final receipt step



        setCheckoutStep(4);



        showToast("Votre commande a été validée avec succès !");







        // Show guest signup prompt if customer is not logged in



        const guestPrompt = document.getElementById("guest-signup-prompt");



        if (guestPrompt) {



            guestPrompt.style.display = !currentUser ? "block" : "none";



        }







        // Refresh admin if logged in



        if (currentUser && currentUser.isAdmin) {



            renderAdminDashboard();



        }



    }, 2500);



}







function renderInvoiceTicket(order) {



    let itemsRowsHtml = "";



    order.items.forEach(it => {



        const displaySize = it.size === "U" ? "" : ` (${it.size})`;



        itemsRowsHtml += `



            <div class="invoice-row">



                <span>${escapeHTML(it.name)}${displaySize} x${it.qty}</span>



                <span>${(it.price * it.qty).toLocaleString("fr-FR")} F</span>



            </div>



        `;



    });







    elements.invoiceReceiptDetails.innerHTML = `



        <div class="invoice-title">TICKET DE COMMANDE</div>



        <div class="invoice-row">



            <span><strong>N° Commande :</strong></span>



            <span>${order.id}</span>



        </div>



        <div class="invoice-row">



            <span><strong>Date :</strong></span>



            <span>${order.date}</span>



        </div>



        <div class="invoice-row divider">



            <span><strong>Transaction :</strong></span>



            <span style="color: var(--accent-dark); font-weight:bold;">${order.reference}</span>



        </div>



        



        <div class="invoice-row">



            <span><strong>Destinataire :</strong></span>



            <span>${escapeHTML(order.clientName)}</span>



        </div>



        <div class="invoice-row">



            <span><strong>Téléphone :</strong></span>



            <span>+221 ${escapeHTML(order.clientPhone)}</span>



        </div>



        <div class="invoice-row divider">



            <span><strong>Adresse :</strong></span>



            <span>${escapeHTML(order.clientAddress)}</span>



        </div>



        



        ${itemsRowsHtml}



        



        <div class="invoice-row divider" style="margin-top: 10px;">



            <span>Frais de livraison (${order.shippingCost === 0 ? 'Offert' : 'Standard'}) :</span>



            <span>${order.shippingCost.toLocaleString("fr-FR")} F</span>



        </div>



        <div class="invoice-row total">



            <span>TOTAL À RÉGLER À LA LIVRAISON :</span>



            <span>${order.total.toLocaleString("fr-FR")} FCFA</span>



        </div>



        <div class="invoice-row" style="margin-top: 10px; font-size: 0.75rem; color: var(--text-muted);">



            <span>Règlement : ${order.paymentMethod}</span>



            <span>Statut : ${order.status}</span>



        </div>



    `;



}







elements.btnCheckoutCloseComplete.addEventListener("click", () => {



    elements.checkoutModal.classList.remove("open");



});







let activeCompletedOrder = null;







function downloadOrderReceiptPdf(order) {



    if (!order) {



        showToast("Aucun reçu disponible.", "warning");



        return;



    }







    // 1. Déclencher un vrai téléchargement de fichier texte/reçu sur l'ordinateur



    try {



        const textContent = `================================================



DIAW SHOOP - REÇU DE COMMANDE OFFICIEL



Mode Féminine, Robes & Abayas Sénégal



================================================



N° COMMANDE : #${order.id}



DATE        : ${order.date}



TRANSACTION : ${order.reference || order.id}



STATUT      : ${order.status}



PAIEMENT    : ${order.paymentMethod}







CLIENT



Nom       : ${order.clientName}



Téléphone : +221 ${order.clientPhone}



Adresse   : ${order.clientAddress}



${order.notes ? 'Notes     : ' + order.notes + '\n' : ''}



ARTICLES COMMANDÉS



${(order.items || []).map(it => `- ${it.name} ${it.size && it.size !== 'U' ? '(' + it.size + ')' : ''} x${it.qty} = ${(it.price * it.qty).toLocaleString('fr-FR')} FCFA`).join('\n')}







DÉTAILS FINANCIERS



Sous-total : ${(order.subtotal || order.total).toLocaleString('fr-FR')} FCFA



Livraison  : ${(order.shippingCost || 0) === 0 ? 'Offerte (Gratuite)' : (order.shippingCost || 0).toLocaleString('fr-FR') + ' FCFA'}



------------------------------------------------



TOTAL À RÉGLER : ${order.total.toLocaleString('fr-FR')} FCFA



================================================



Service Client DIAW SHOOP : +221 78 594 64 27



Merci de votre achat chez DIAW SHOOP !



`;



        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });



        const downloadUrl = URL.createObjectURL(blob);



        const dlLink = document.createElement("a");



        dlLink.href = downloadUrl;



        dlLink.download = `Recu_Commande_${order.id}.txt`;



        document.body.appendChild(dlLink);



        dlLink.click();



        document.body.removeChild(dlLink);



        URL.revokeObjectURL(downloadUrl);



    } catch (e) {



        console.warn("Fichier texte fallback:", e);



    }







    // 2. Ouvrir la fenêtre d'impression haute définition pour impression / enregistrement PDF Windows



    const printWin = window.open("", "_blank", "width=650,height=850");



    if (printWin) {



        let itemsHtml = (order.items || []).map(it => `



            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px;">



                <span>${escapeHTML(it.name)} ${it.size && it.size !== 'U' ? '(' + it.size + ')' : ''} <strong>x${it.qty}</strong></span>



                <span>${(it.price * it.qty).toLocaleString('fr-FR')} F</span>



            </div>



        `).join("");







        printWin.document.open();



        printWin.document.write(`



            <!DOCTYPE html>



            <html lang="fr">



            <head>



                <meta charset="UTF-8">



                <title>Reçu Commande #${order.id} - DIAW SHOOP</title>



                <style>



                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; background: #fff; color: #1e293b; line-height: 1.5; }



                    .card { max-width: 500px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 30px; border-radius: 12px; }



                    .brand { text-align: center; border-bottom: 2px solid #b8860b; padding-bottom: 16px; margin-bottom: 20px; }



                    .brand h1 { margin: 0; font-size: 26px; letter-spacing: 2px; color: #0f172a; }



                    .brand p { margin: 4px 0 0; color: #b8860b; font-weight: bold; font-size: 13px; }



                    .title { text-align: center; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-bottom: 16px; }



                    .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }



                    .divider { border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; margin-bottom: 14px; }



                    .total { font-size: 18px; font-weight: 800; border-top: 2px solid #0f172a; padding-top: 14px; margin-top: 16px; color: #0f172a; }



                    .footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }



                    @media print {



                        body { padding: 0; }



                        .card { border: none; max-width: 100%; box-shadow: none; }



                    }



                </style>



            </head>



            <body>



                <div class="card">



                    <div class="brand">



                        <h1>DIAW SHOOP</h1>



                        <p>Robes, Abayas & Produits de Beauté Féminins Sénégal</p>



                    </div>



                    <div class="title">Bordereau / Reçu de Commande #${order.id}</div>



                    <div class="row"><span><strong>Date :</strong></span><span>${order.date}</span></div>



                    <div class="row"><span><strong>Client :</strong></span><span>${escapeHTML(order.clientName)}</span></div>



                    <div class="row"><span><strong>Téléphone :</strong></span><span>+221 ${escapeHTML(order.clientPhone)}</span></div>



                    <div class="row divider"><span><strong>Adresse :</strong></span><span>${escapeHTML(order.clientAddress)}</span></div>



                    



                    <div style="margin: 15px 0;">



                        <div style="font-weight:700; font-size:13px; color:#475569; margin-bottom:10px;">ARTICLES :</div>



                        ${itemsHtml}



                    </div>







                    <div class="row divider" style="margin-top:12px;">



                        <span>Livraison (${(order.shippingCost || 0) === 0 ? 'Offerte' : 'Standard'}) :</span>



                        <span>${(order.shippingCost || 0).toLocaleString('fr-FR')} F</span>



                    </div>







                    <div class="row total">



                        <span>TOTAL ${order.paymentMethod === 'CASH' ? 'À RÉGLER' : 'RÉGLÉ'} :</span>



                        <span>${order.total.toLocaleString('fr-FR')} FCFA</span>



                    </div>







                    <div class="row" style="margin-top:10px; font-size:13px; color:#475569;">



                        <span>Mode de règlement :</span>



                        <span><strong>${escapeHTML(order.paymentMethod)}</strong></span>



                    </div>







                    <div class="footer">



                        <p><strong>Merci pour votre confiance chez DIAW SHOOP !</strong></p>



                        <p>Paiement sécurisé à la livraison • WhatsApp : +221 78 594 64 27</p>



                    </div>



                </div>



                <script>



                    window.onload = function() {



                        setTimeout(function() {



                            window.print();



                        }, 300);



                    };



                <\/script>



            </body>



            </html>



        `);



        printWin.document.close();



    } else {



        window.print();



    }







    showToast("Reçu téléchargé et fenêtre d'impression/PDF prête !", "success");



}







elements.btnDownloadPdf.addEventListener("click", () => {



    const orderToPrint = activeCompletedOrder || orders[0];



    downloadOrderReceiptPdf(orderToPrint);



});







// Close checkout modal when finished



const btnCloseCheckoutComplete = document.getElementById("btn-close-checkout-complete");



if (btnCloseCheckoutComplete) {



    btnCloseCheckoutComplete.addEventListener("click", () => {



        elements.checkoutModal.classList.remove("open");



    });



}







// Guest follow-up actions: convert guest order to account smoothly



const btnGuestCreateAccount = document.getElementById("btn-guest-create-account");



const btnGuestSkipAccount = document.getElementById("btn-guest-skip-account");







if (btnGuestCreateAccount) {



    btnGuestCreateAccount.addEventListener("click", () => {



        elements.checkoutModal.classList.remove("open");



        // Open Auth modal directly on Register tab



        if (elements.authModal) {



            elements.authModal.classList.add("open");



            const regTabBtn = document.querySelector(".auth-tab-btn[data-tab='register-tab']");



            if (regTabBtn) regTabBtn.click();



            // Pre-fill registered name/email from the completed order



            const regName = document.getElementById("register-name");



            const regEmail = document.getElementById("register-email");



            if (regName && activeCompletedOrder) regName.value = activeCompletedOrder.clientName || "";



            if (regEmail && activeCompletedOrder && !activeCompletedOrder.clientEmail.includes("@guest.")) {



                regEmail.value = activeCompletedOrder.clientEmail;



            }



        }



    });



}







if (btnGuestSkipAccount) {



    btnGuestSkipAccount.addEventListener("click", () => {



        const guestPrompt = document.getElementById("guest-signup-prompt");



        if (guestPrompt) guestPrompt.style.display = "none";



        showToast("Merci pour votre visite ! Vos informations de commande ont bien été conservées.");



    });



}







// --- 10. USER HISTORIQUE ORDER VIEW ---



elements.btnMyOrders.addEventListener("click", (e) => {



    e.preventDefault();



    if (!currentUser) return;







    const userEmail = (currentUser.email || "").toLowerCase();



    const userName = (currentUser.name || "").toLowerCase();



    const clientOrders = orders.filter(o => 



        (o.clientEmail && o.clientEmail.toLowerCase() === userEmail) ||



        (userName && o.clientName && o.clientName.toLowerCase() === userName)



    );



    elements.myOrdersList.innerHTML = "";







    if (clientOrders.length === 0) {



        elements.myOrdersList.innerHTML = `



            <div style="text-align:center; padding: 40px; color: var(--text-muted)">



                <i class="fa-solid fa-bag-shopping" style="font-size: 2.5rem; margin-bottom:15px; color: var(--accent);"></i>



                <p style="font-size: 1rem; margin-bottom: 8px;">Vous n'avez pas encore passé de commande sur notre boutique.</p>



                <p style="font-size: 0.85rem;">Parcourez notre collection et découvrez nos nouveautés !</p>



            </div>



        `;



    } else {



        clientOrders.forEach(o => {



            let itemDetails = o.items.map(it => it.size === "U" ? `${escapeHTML(it.name)} x${it.qty}` : `${escapeHTML(it.name)} (${it.size}) x${it.qty}`).join(", ");



            



            // Calcul de l'étape active dans la barre de progression (1: Confirmée, 2: Préparation, 3: En livraison, 4: Livrée)



            let currentStep = 1;



            if (o.status.includes("préparation")) currentStep = 2;



            else if (o.status.includes("livraison")) currentStep = 3;



            else if (o.status.includes("Livré")) currentStep = 4;







            const card = document.createElement("div");



            card.className = "customer-order-card";



            card.innerHTML = `



                <div class="customer-order-header">



                    <div>



                        <strong>Commande #${o.id}</strong>



                        <div class="text-muted" style="font-size:0.75rem;"><i class="fa-regular fa-calendar"></i> ${o.date}</div>



                    </div>



                    <span class="badge ${currentStep === 4 ? 'badge-success' : (currentStep >= 2 ? 'badge-accent' : 'badge-primary')}">${escapeHTML(o.status)}</span>



                </div>







                <!-- Timeline stepper -->



                <div class="order-timeline">



                    <div class="timeline-step ${currentStep >= 1 ? (currentStep > 1 ? 'completed' : 'current') : ''}">



                        <div class="step-bubble">${currentStep > 1 ? '<i class="fa-solid fa-check"></i>' : '1'}</div>



                        <span class="step-name">Confirmée</span>



                    </div>



                    <div class="timeline-step ${currentStep >= 2 ? (currentStep > 2 ? 'completed' : 'current') : ''}">



                        <div class="step-bubble">${currentStep > 2 ? '<i class="fa-solid fa-check"></i>' : '2'}</div>



                        <span class="step-name">Préparation</span>



                    </div>



                    <div class="timeline-step ${currentStep >= 3 ? (currentStep > 3 ? 'completed' : 'current') : ''}">



                        <div class="step-bubble">${currentStep > 3 ? '<i class="fa-solid fa-check"></i>' : '3'}</div>



                        <span class="step-name">En livraison</span>



                    </div>



                    <div class="timeline-step ${currentStep >= 4 ? 'completed current' : ''}">



                        <div class="step-bubble">${currentStep >= 4 ? '<i class="fa-solid fa-check"></i>' : '4'}</div>



                        <span class="step-name">Livrée</span>



                    </div>



                </div>







                <div style="font-size: 0.85rem; color: var(--text-muted); background: var(--bg-input); padding: 10px; border-radius: 6px; margin-bottom: 12px;">



                    <p style="margin-bottom: 4px;"><strong>Articles :</strong> ${itemDetails}</p>



                    <p style="margin-bottom: 0;"><strong>Adresse :</strong> ${escapeHTML(o.clientAddress)}</p>



                </div>







                <div class="order-card-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">



                    <div>



                        <span class="text-muted" style="font-size:0.8rem;">Total réglé :</span>



                        <strong style="color:var(--primary); font-size:1.1rem; margin-left: 6px;">${o.total.toLocaleString("fr-FR")} F</strong>



                    </div>



                    <div style="display:flex; gap:8px;">



                        <button type="button" class="btn btn-sm btn-secondary" onclick="viewOrderInvoiceModal('${o.id}')"><i class="fa-solid fa-receipt"></i> Voir le reçu</button>



                        <a href="https://wa.me/${SELLER_WHATSAPP}?text=${encodeURIComponent('Bonjour Diaw Shoop, je me renseigne sur ma commande #' + o.id)}" target="_blank" class="btn btn-sm" style="background:#25d366; color:white;"><i class="fa-brands fa-whatsapp"></i> Aide</a>



                    </div>



                </div>



            `;



            elements.myOrdersList.appendChild(card);



        });



    }







    elements.myOrdersModal.classList.add("open");



});







const closeOrdersModal = () => elements.myOrdersModal.classList.remove("open");



if (elements.btnCloseMyOrders) elements.btnCloseMyOrders.addEventListener("click", closeOrdersModal);



if (elements.btnCloseMyOrdersBtn) elements.btnCloseMyOrdersBtn.addEventListener("click", closeOrdersModal);







// Invoice Modal Close handlers



if (elements.btnCloseInvoiceModal) {



    elements.btnCloseInvoiceModal.addEventListener("click", () => {



        if (elements.orderInvoiceModal) elements.orderInvoiceModal.classList.remove("open");



    });



}



if (elements.btnCloseInvoiceModalBtn) {



    elements.btnCloseInvoiceModalBtn.addEventListener("click", () => {



        if (elements.orderInvoiceModal) elements.orderInvoiceModal.classList.remove("open");



    });



}







// --- 11. SECURED ROLE-BASED ADMIN DASHBOARD CONTROLLERS ---



// Nav links to scroll/open admin



elements.navAdmin.addEventListener("click", (e) => {



    e.preventDefault();



    openAdminDashboard();



});



elements.dropdownAdminBtn.addEventListener("click", (e) => {



    e.preventDefault();



    openAdminDashboard();



});







function openAdminDashboard() {



    if (!currentUser || !currentUser.isAdmin) {



        showToast("Accès refusé. Autorisation administrateur requise.", "error");



        return;



    }







    // Hide client layout components



    const clientHeader = document.getElementById("main-header");



    const clientShopView = document.getElementById("client-shop-view");



    const clientFooter = document.querySelector(".main-footer");







    const contactSectionEl = document.getElementById("contact-section");







    if (clientHeader) clientHeader.style.display = "none";



    if (clientShopView) clientShopView.style.display = "none";



    if (clientFooter) clientFooter.style.display = "none";



    if (contactSectionEl) contactSectionEl.style.display = "none";







    // Show admin view



    elements.adminSection.style.display = "block";



    renderAdminDashboard();



    if (currentUser.isSuperAdmin) {



        applyStoreSettings();



    }







    window.scrollTo({



        top: 0,



        behavior: "instant"



    });



}







elements.btnCloseAdmin.addEventListener("click", () => {



    // Show client layout components



    const clientHeader = document.getElementById("main-header");



    const clientShopView = document.getElementById("client-shop-view");



    const clientFooter = document.querySelector(".main-footer");



    const contactSectionEl = document.getElementById("contact-section");







    if (clientHeader) clientHeader.style.display = "block";



    if (clientShopView) clientShopView.style.display = "block";



    if (clientFooter) clientFooter.style.display = "block";



    if (contactSectionEl) contactSectionEl.style.display = "none";







    elements.adminSection.style.display = "none";







    window.scrollTo({



        top: 0,



        behavior: "instant"



    });



});







const btnAdminLogout = document.getElementById("btn-admin-logout");



if (btnAdminLogout) {



    btnAdminLogout.addEventListener("click", () => {



        sessionStorage.removeItem("diaw_shoop_current_user");



        currentUser = null;







        // Show client layout components



        const clientHeader = document.getElementById("main-header");



        const clientShopView = document.getElementById("client-shop-view");



        const clientFooter = document.querySelector(".main-footer");







        if (clientHeader) clientHeader.style.display = "block";



        if (clientShopView) clientShopView.style.display = "block";



        if (clientFooter) clientFooter.style.display = "block";







        elements.adminSection.style.display = "none";







        updateUserUI();



        showToast("Vous avez été déconnecté.");







        window.scrollTo({



            top: 0,



            behavior: "instant"



        });



    });



}







// Admin Tab switcher



document.querySelectorAll(".admin-tab-btn").forEach(btn => {



    btn.addEventListener("click", function () {



        document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.remove("active"));



        this.classList.add("active");







        const target = this.getAttribute("data-target");



        document.querySelectorAll(".admin-tab-content").forEach(content => {



            content.classList.remove("active");



            content.style.display = "none";



        });



        const targetEl = document.getElementById(target);



        if (targetEl) {



            targetEl.classList.add("active");



            targetEl.style.display = "block";



        }



        if (target === "admin-settings-tab") {



            applyStoreSettings();



        } else if (target === "admin-roles-tab") {



            renderAdminRolesTable();



        } else if (target === "admin-support-tab") {



            renderAdminSupportMessages();



        }



    });



});







// Admin Orders Toolbar & Filters Listeners







if (elements.adminOrdersSearchInput) {



    elements.adminOrdersSearchInput.addEventListener("input", function (e) {



        orderSearchQuery = e.target.value.toLowerCase().trim();



        renderAdminDashboard();



    });



}







document.querySelectorAll(".order-filter-btn").forEach(btn => {



    btn.addEventListener("click", function () {



        document.querySelectorAll(".order-filter-btn").forEach(b => b.classList.remove("active"));



        this.classList.add("active");



        currentOrderFilter = this.getAttribute("data-status-filter") || "all";



        renderAdminDashboard();



    });



});







if (elements.btnRefreshOrders) {



    elements.btnRefreshOrders.addEventListener("click", async function () {



        const icon = this.querySelector("i");



        if (icon) icon.classList.add("fa-spin");



        await loadOrdersFromSupabase(true);



        if (icon) icon.classList.remove("fa-spin");



    });



}







// Preset selection behavior



elements.prodImagePresetSelect.addEventListener("change", function () {



    const customOptions = document.getElementById("custom-image-options");



    if (this.value === "custom") {



        if (customOptions) customOptions.style.display = "flex";



        if (elements.prodImageUrlInput) {



            elements.prodImageUrlInput.style.display = "block";



            elements.prodImageUrlInput.required = !customImageBase64;



        }



    } else {



        if (customOptions) customOptions.style.display = "none";



        if (elements.prodImageUrlInput) {



            elements.prodImageUrlInput.style.display = "none";



            elements.prodImageUrlInput.required = false;



            elements.prodImageUrlInput.value = "";



        }



        if (elements.prodImageFileInput) elements.prodImageFileInput.value = "";



        customImageBase64 = "";



    }



});







// Local file uploader handlers



if (elements.prodImageFileInput) {



    elements.prodImageFileInput.addEventListener("change", function (e) {



        const file = e.target.files[0];



        if (file) {



            if (file.size > 2 * 1024 * 1024) {



                showToast("Attention : L'image dépasse 2 Mo. Elle risque de ralentir le chargement.", "warning");



            }



            const reader = new FileReader();



            reader.onload = function (evt) {



                customImageBase64 = evt.target.result;



                if (elements.prodImageUrlInput) {



                    elements.prodImageUrlInput.value = ""; // Clear text URL if file selected



                    elements.prodImageUrlInput.required = false;



                }



            };



            reader.readAsDataURL(file);



        }



    });



}







if (elements.prodVideoFileInput) {



    elements.prodVideoFileInput.addEventListener("change", function (e) {



        const file = e.target.files[0];



        if (file) {



            if (file.size > 10 * 1024 * 1024) {



                showToast("Attention : La vidéo dépasse 10 Mo. Nous conseillons une vidéo plus courte pour le stockage.", "warning");



            }



            const reader = new FileReader();



            reader.onload = function (evt) {



                customVideoBase64 = evt.target.result;



                if (elements.prodVideoInput) {



                    elements.prodVideoInput.value = ""; // Clear text URL if file selected



                }



            };



            reader.readAsDataURL(file);



        }



    });



}







// Calculate statistics



function renderAdminDashboard() {



    if (!currentUser || !currentUser.isAdmin) return;







    // 1. Resolve active user permissions



    const isSuper = currentUser.isSuperAdmin === true;







    // In localstorage users list, secondary admins might have permissions updated by super admin



    let userPermissions = { canAddEdit: true, canDelete: true, canManageOrders: true };



    if (!isSuper) {



        const users = JSON.parse(localStorage.getItem("diaw_shoop_users")) || [];



        const found = users.find(u => u.email === currentUser.email);



        if (found && found.permissions) {



            userPermissions = found.permissions;



        } else {



            // default subadmin permissions



            userPermissions = currentUser.permissions || { canAddEdit: true, canDelete: false, canManageOrders: true };



        }



    }







    // 2. Display/Hide Super Admin specific items in DOM



    if (isSuper) {



        document.querySelectorAll(".superadmin-only").forEach(el => el.style.display = "block");



        // Show financial statistics card



        elements.adminStatRevenue.parentElement.parentElement.style.display = "flex";







        const revenue = orders.reduce((sum, o) => sum + o.total, 0);



        elements.adminStatRevenue.textContent = `${revenue.toLocaleString("fr-FR")} FCFA`;







        renderAdminRolesTable();



    } else {



        document.querySelectorAll(".superadmin-only").forEach(el => el.style.display = "none");



        // Hide financial statistics card



        elements.adminStatRevenue.parentElement.parentElement.style.display = "none";



    }







    // Update orders count and product count



    elements.adminStatOrders.textContent = orders.length;



    elements.adminStatProducts.textContent = products.length;







    // Update pending badge count



    const pendingOrdersCount = orders.filter(o => !o.status.includes("Livré")).length;



    if (pendingOrdersCount > 0) {



        elements.adminPendingBadge.style.display = "inline-block";



        elements.adminPendingBadge.textContent = pendingOrdersCount;



    } else {



        elements.adminPendingBadge.style.display = "none";



    }







    // Update support messages badge



    const supportMessages = JSON.parse(localStorage.getItem("diaw_shoop_support_messages")) || [];



    const newSupportCount = supportMessages.filter(m => m.status === "Nouveau").length;



    const adminSupportBadge = document.getElementById("admin-support-badge");



    if (adminSupportBadge) {



        if (newSupportCount > 0) {



            adminSupportBadge.style.display = "inline-block";



            adminSupportBadge.textContent = newSupportCount;



        } else {



            adminSupportBadge.style.display = "none";



        }



    }







    // 3. Render Products Table List



    elements.adminProductsTableBody.innerHTML = "";



    products.forEach(p => {



        const tr = document.createElement("tr");



        let stockQty = 0;



        if (p.stocks) {



            stockQty = p.stocks.total !== undefined ? p.stocks.total : (p.stocks.S || 0);



        } else {



            stockQty = 15;



        }



        const stockInfo = `${stockQty} en stock`;







        // Hide edit/delete actions if not allowed



        let actionButtons = "";



        if (isSuper || userPermissions.canAddEdit) {



            actionButtons += `<button class="btn-icon-only" onclick="editProductInAdmin('${p.id}')" title="Modifier"><i class="fa-solid fa-pen-to-square"></i></button>`;



        }



        if (isSuper || userPermissions.canDelete) {



            actionButtons += `<button class="btn-icon-only btn-delete" onclick="deleteProductFromAdmin('${p.id}')" title="Supprimer"><i class="fa-solid fa-trash-can"></i></button>`;



        }







        



        const sizeBadge = productRequiresSize(p) 



            ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.65rem; display:block; margin-top:3px;">Tailles multiples</span>`



            : `<span class="badge" style="background:#fef3c7; color:#92400e; font-size:0.65rem; display:block; margin-top:3px;">Taille Unique</span>`;







        tr.innerHTML = `



            <td><img src="${escapeHTML(p.image)}" alt="Img" onerror="this.src='https://placehold.co/100x120?text=${encodeURIComponent(p.name)}'"></td>



            <td><strong>${escapeHTML(p.name)}</strong>${sizeBadge}</td>



            <td><span class="badge">${escapeHTML(p.category)}</span></td>



            <td>${p.price.toLocaleString("fr-FR")} F</td>



            <td><code>${stockInfo}</code></td>



            <td>



                <div class="btn-action-group">



                    ${actionButtons || '<span class="text-muted" style="font-size:0.75rem;">Lecture seule</span>'}



                </div>



            </td>



        `;



        elements.adminProductsTableBody.appendChild(tr);



    });







    // Hide/disable Add Product form inputs if subadmin doesn't have add/edit rights



    const saveBtn = document.getElementById("btn-save-product");



    const cancelBtn = document.getElementById("btn-cancel-edit");



    if (!isSuper && !userPermissions.canAddEdit) {



        elements.productAdminForm.querySelectorAll("input, select, textarea, button").forEach(input => {



            input.disabled = true;



        });



        if (saveBtn) saveBtn.textContent = "Accès Restreint (Lecture)";



    } else {



        elements.productAdminForm.querySelectorAll("input, select, textarea, button").forEach(input => {



            input.disabled = false;



        });



        if (saveBtn) saveBtn.textContent = editingProductId ? "Sauvegarder les modifications" : "Créer le produit";



    }







    // 4. Update Orders Tab KPIs & Filter Counters



    const totalOrdersCount = orders.length;



    const kpiPendingCount = orders.filter(o => !o.status.includes("Livré") && !o.status.includes("livraison") && !o.status.includes("Annul")).length;



    const shippingOrdersCount = orders.filter(o => o.status.includes("livraison")).length;



    const deliveredOrdersCount = orders.filter(o => o.status.includes("Livré")).length;







    if (elements.kpiOrdersCount) elements.kpiOrdersCount.textContent = totalOrdersCount;



    if (elements.kpiOrdersPending) elements.kpiOrdersPending.textContent = kpiPendingCount;



    if (elements.kpiOrdersShipping) elements.kpiOrdersShipping.textContent = shippingOrdersCount;



    if (elements.kpiOrdersDelivered) elements.kpiOrdersDelivered.textContent = deliveredOrdersCount;







    if (elements.filterCountAll) elements.filterCountAll.textContent = totalOrdersCount;



    if (elements.filterCountPending) elements.filterCountPending.textContent = kpiPendingCount;



    if (elements.filterCountShipping) elements.filterCountShipping.textContent = shippingOrdersCount;



    if (elements.filterCountDelivered) elements.filterCountDelivered.textContent = deliveredOrdersCount;







    // Filter orders according to active tab and search query



    let filteredOrders = orders.filter(o => {



        if (currentOrderFilter === "pending") {



            if (o.status.includes("Livré") || o.status.includes("livraison") || o.status.includes("Annul")) return false;



        } else if (currentOrderFilter === "shipping") {



            if (!o.status.includes("livraison")) return false;



        } else if (currentOrderFilter === "delivered") {



            if (!o.status.includes("Livré")) return false;



        }







        if (orderSearchQuery && orderSearchQuery !== "") {



            const q = orderSearchQuery;



            const matchName = (o.clientName || "").toLowerCase().includes(q);



            const matchPhone = (o.clientPhone || "").toLowerCase().includes(q);



            const matchEmail = (o.clientEmail || "").toLowerCase().includes(q);



            const matchId = (o.id || "").toLowerCase().includes(q);



            const matchRef = (o.reference || "").toLowerCase().includes(q);



            const matchItems = (o.items || []).some(it => (it.name || "").toLowerCase().includes(q));



            if (!matchName && !matchPhone && !matchEmail && !matchId && !matchRef && !matchItems) return false;



        }







        return true;



    });







    // 5. Render Orders Cards Grid



    elements.adminOrdersGrid.innerHTML = "";



    if (filteredOrders.length === 0) {



        elements.adminOrdersGrid.innerHTML = `



            <div style="grid-column: 1 / -1; text-align:center; padding: 40px; color: var(--text-muted); background: var(--bg-card); border-radius: var(--border-radius); border: 1px solid var(--border-color)">



                <i class="fa-solid fa-inbox" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--accent);"></i>



                <p style="font-size: 1rem; margin-bottom: 6px;">Aucune commande trouvée.</p>



                <p style="font-size: 0.85rem;">${orders.length === 0 ? "Aucun achat n'a été effectué pour le moment." : "Modifiez vos filtres ou la recherche pour afficher d'autres résultats."}</p>



            </div>



        `;



    } else {



        filteredOrders.forEach(o => {



            const card = document.createElement("div");







            // Resolve status class



            let statusClass = "status-paid";



            let statusLabel = "Payée";



            if (o.status.includes("préparation")) {



                statusClass = "status-prep";



                statusLabel = "En préparation";



            } else if (o.status.includes("livraison")) {



                statusClass = "status-shipping";



                statusLabel = "En cours de livraison";



            } else if (o.status.includes("Livré")) {



                statusClass = "status-delivered";



                statusLabel = "Livré";



            } else if (o.status.includes("Payée")) {



                statusClass = "status-paid";



                statusLabel = "Payée";



            }







            card.className = `order-card ${statusClass}`;







            let itemsDetailsHtml = (o.items || []).map(it => {



                const displaySize = it.size === "U" ? "" : ` (${it.size})`;



                return `



                    <div class="item-row">



                        <span>${escapeHTML(it.name)}${displaySize}</span>



                        <strong>x${it.qty}</strong>



                    </div>



                `;



            }).join("");







            // Order status action dropdown (disable if no right)



            let statusSelect = "";



            if (isSuper || userPermissions.canManageOrders) {



                statusSelect = `



                    <select onchange="updateOrderStatus('${o.id}', this.value)" title="Changer le statut en direct">



                        <option value="Payée (En attente d'expédition)" ${o.status.includes("Payée") ? "selected" : ""}>Payée</option>



                        <option value="En cours de préparation" ${o.status.includes("préparation") ? "selected" : ""}>Préparation</option>



                        <option value="En cours de livraison" ${o.status.includes("livraison") ? "selected" : ""}>En cours de livraison</option>



                        <option value="Livré et validé" ${o.status.includes("Livré") ? "selected" : ""}>Livré</option>



                    </select>



                `;



            } else {



                statusSelect = `<span class="order-status-badge ${statusClass}">${escapeHTML(o.status)}</span>`;



            }







            // Clean phone number for WhatsApp link



            const whatsappPhone = (o.clientPhone || "").replace(/\D/g, "");



            const whatsappText = encodeURIComponent(`Bonjour ${o.clientName}, c'est DIAW SHOOP. Concernant votre commande #${o.id} d'un montant de ${o.total.toLocaleString("fr-FR")} F, nous vous contactons pour le suivi de votre livraison.`);







            // Can delete order button (for SuperAdmin or with canDelete permission)



            let deleteBtnHtml = "";



            if (isSuper || (userPermissions && userPermissions.canDelete)) {



                deleteBtnHtml = `



                    <button class="btn-quick" style="color: #ef4444;" onclick="deleteOrderFromAdmin('${o.id}')" title="Supprimer la commande">



                        <i class="fa-solid fa-trash-can"></i>



                    </button>



                `;



            }







            card.innerHTML = `



                <div class="order-card-header">



                    <div class="order-meta">



                        <span class="order-id">#${o.id}</span>



                        <span class="order-date"><i class="fa-regular fa-calendar"></i> ${o.date}</span>



                    </div>



                    <span class="order-status-badge ${statusClass}">${statusLabel}</span>



                </div>



                



                <div class="order-card-body">



                    <div class="client-info">



                        <h4><i class="fa-solid fa-user"></i> ${escapeHTML(o.clientName)}</h4>



                        ${o.clientEmail ? `<p><i class="fa-solid fa-envelope"></i> ${escapeHTML(o.clientEmail)}</p>` : ''}



                        <p><i class="fa-solid fa-phone"></i> +221 ${escapeHTML(o.clientPhone)}</p>



                        <p class="client-address"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(o.clientAddress)}</p>



                        ${o.notes ? `<p style="font-style: italic; color: var(--accent-dark);"><i class="fa-solid fa-comment-dots"></i> ${escapeHTML(o.notes)}</p>` : ''}



                    </div>



                    



                    <div class="order-items">



                        <h5>Articles commandés</h5>



                        <div class="items-list">



                            ${itemsDetailsHtml}



                        </div>



                    </div>



                    



                    <div class="order-payment">



                        <div class="payment-method">



                            <span class="payment-badge"><i class="fa-solid fa-wallet"></i> ${escapeHTML(o.paymentMethod || 'Espèces')}</span>



                            <code class="payment-ref">${o.reference || o.id}</code>



                        </div>



                        <div class="order-total">



                            <span>Total</span>



                            <strong>${o.total.toLocaleString("fr-FR")} F</strong>



                        </div>



                    </div>



                </div>



                



                <div class="order-card-actions">



                    ${statusSelect}



                    <div class="quick-actions">



                        <a href="https://wa.me/221${whatsappPhone}?text=${whatsappText}" 



                           target="_blank" class="btn-quick whatsapp" title="Contacter sur WhatsApp">



                            <i class="fa-brands fa-whatsapp"></i>



                        </a>



                        <button class="btn-quick copy" onclick="navigator.clipboard.writeText('${escapeHTML(o.clientName)} - +221 ${escapeHTML(o.clientPhone)} - ${escapeHTML(o.clientAddress)}'); showToast('Détails de livraison copiés !', 'info');" title="Copier les détails pour le livreur">



                            <i class="fa-solid fa-copy"></i>



                        </button>



                        <button class="btn-quick" onclick="viewOrderInvoiceModal('${o.id}')" title="Voir le reçu / Imprimer le bordereau">



                            <i class="fa-solid fa-file-invoice"></i>



                        </button>



                        ${deleteBtnHtml}



                    </div>



                </div>



            `;



            elements.adminOrdersGrid.appendChild(card);



        });



    }



}







function renderAdminRolesTable() {



    const users = JSON.parse(localStorage.getItem("diaw_shoop_users")) || [];



    



    // Mettre à jour l'affichage du profil Grand Admin



    const superAdmin = users.find(u => u.isSuperAdmin === true) || { email: "mamadoudiaw1105@gmail.com" };



    const grandAdminBadge = document.getElementById("grand-admin-current-email-badge");



    const grandAdminInput = document.getElementById("grand-admin-email-input");



    if (grandAdminBadge) grandAdminBadge.textContent = superAdmin.email;



    if (grandAdminInput && !grandAdminInput.value) grandAdminInput.value = superAdmin.email;







    // Filter out Grand Admin himself from being modified/deleted, but show secondary admins



    const admins = users.filter(u => u.isAdmin && !u.isSuperAdmin && u.email !== "mamadoudiaw1105@gmail.com" && u.email !== "mamadoudiaw2005@gmail.com");







    elements.adminRolesTableBody.innerHTML = "";



    if (admins.length === 0) {



        elements.adminRolesTableBody.innerHTML = `



            <tr>



                <td colspan="4" style="text-align:center; padding: 30px;">Aucun autre administrateur configuré.</td>



            </tr>



        `;



        return;



    }







    admins.forEach(admin => {



        const tr = document.createElement("tr");







        let roleBadge = "";



        let permissionsHtml = "";







        if (admin.isSuperAdmin) {



            roleBadge = `<span class="badge badge-accent">Grand Admin</span>`;



            permissionsHtml = `<span style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">Accès complet (Illimité)</span>`;



        } else {



            roleBadge = `<span class="badge badge-success">Admin Secondaire</span>`;



            const perms = admin.permissions || { canAddEdit: true, canDelete: false, canManageOrders: true };



            permissionsHtml = `



                <div style="display:flex; flex-direction:column; gap:8px;">



                    <div style="display:flex; align-items:center; gap:8px;">



                        <label class="switch">



                            <input type="checkbox" ${perms.canAddEdit ? 'checked' : ''} onchange="toggleSubAdminPermission('${admin.email}', 'canAddEdit', this.checked)">



                            <span class="slider round"></span>



                        </label>



                        <span style="font-size:0.75rem;">Ajout/Modif</span>



                    </div>



                    <div style="display:flex; align-items:center; gap:8px;">



                        <label class="switch">



                            <input type="checkbox" ${perms.canDelete ? 'checked' : ''} onchange="toggleSubAdminPermission('${admin.email}', 'canDelete', this.checked)">



                            <span class="slider round"></span>



                        </label>



                        <span style="font-size:0.75rem;">Suppression</span>



                    </div>



                    <div style="display:flex; align-items:center; gap:8px;">



                        <label class="switch">



                            <input type="checkbox" ${perms.canManageOrders ? 'checked' : ''} onchange="toggleSubAdminPermission('${admin.email}', 'canManageOrders', this.checked)">



                            <span class="slider round"></span>



                        </label>



                        <span style="font-size:0.75rem;">Commandes</span>



                    </div>



                </div>



            `;



        }







        tr.innerHTML = `



            <td style="padding: 16px 14px; vertical-align: middle; text-align: left;">



                <div style="font-weight:600;">${escapeHTML(admin.name)}</div>



                <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(admin.email)}</div>



            </td>



            <td style="padding: 16px 14px; vertical-align: middle; text-align: left;">



                ${roleBadge}



            </td>



            <td style="padding: 16px 14px; vertical-align: middle; text-align: left;">



                ${permissionsHtml}



            </td>



            <td style="padding: 16px 14px; vertical-align: middle; text-align: left;">



                <button class="btn btn-icon-only btn-delete" onclick="deleteAdminAccount('${admin.email}')" title="Supprimer le compte Admin">



                    <i class="fa-solid fa-trash"></i>



                </button>



            </td>



        `;



        elements.adminRolesTableBody.appendChild(tr);



    });







    // Synchronisation en tâche de fond avec Supabase Cloud pour afficher les admins ajoutés depuis d'autres appareils



    if (supabaseClient && !window._syncingAdmins) {



        window._syncingAdmins = true;



        db.getAdmins().then(cloudAdmins => {



            window._syncingAdmins = false;



            if (cloudAdmins && cloudAdmins.length > 0) {



                let localUsers = JSON.parse(localStorage.getItem("diaw_shoop_users")) || [];



                let hasChanges = false;



                cloudAdmins.forEach(ca => {



                    const existing = localUsers.find(u => u.email.toLowerCase() === ca.email.toLowerCase());



                    if (!existing) {



                        localUsers.push({



                            email: ca.email,



                            name: ca.name,



                            passwordHash: ca.password_hash,



                            isAdmin: true,



                            isSuperAdmin: ca.is_super_admin === true,



                            _saltVersion: 2,



                            permissions: ca.permissions,



                            avatar: ca.avatar



                        });



                        hasChanges = true;



                    }



                });



                if (hasChanges) {



                    localStorage.setItem("diaw_shoop_users", JSON.stringify(localUsers));



                    renderAdminRolesTable();



                }



            }



        }).catch(() => { window._syncingAdmins = false; });



    }



}







window.toggleSubAdminPermission = function (email, permissionKey, isChecked) {



    const users = JSON.parse(localStorage.getItem("diaw_shoop_users")) || [];



    const admin = users.find(u => u.email === email);



    if (admin) {



        if (!admin.permissions) admin.permissions = {};



        admin.permissions[permissionKey] = isChecked;



        localStorage.setItem("diaw_shoop_users", JSON.stringify(users));



        showToast(`Permission "${permissionKey}" mise à jour pour ${admin.name}.`);







        // Synchroniser immédiatement les permissions avec Supabase Cloud



        if (supabaseClient) {



            db.saveAdmin(admin).then(() => {



                console.log("Permission synchronisée sur Supabase Cloud :", email);



            }).catch(e => console.warn("Notice sync permission Cloud:", e));



        }







        // If current session is this user, update session as well



        if (currentUser && currentUser.email === email) {



            if (!currentUser.permissions) currentUser.permissions = {};



            currentUser.permissions[permissionKey] = isChecked;



            sessionStorage.setItem("diaw_shoop_current_user", JSON.stringify(currentUser));



        }



    }



};







// Update Order status action (Synchronisé avec Supabase)



window.updateOrderStatus = async function (orderId, newStatus) {



    if (!currentUser || !currentUser.isAdmin) return;







    const o = orders.find(ord => ord.id === orderId || ord.reference === orderId);



    if (o) {



        o.status = newStatus;



        localStorage.setItem("diaw_shoop_orders", JSON.stringify(orders));



        renderAdminDashboard();



        showToast(`Statut de la commande #${orderId} mis à jour : ${newStatus}`);







        // Mise à jour sur Supabase



        if (supabaseClient) {



            const refToUpdate = o.reference || o.id;



            try {



                const { error } = await db.updateOrderStatus(refToUpdate, newStatus);



                if (error) {



                    console.warn("Erreur mise à jour statut sur Supabase:", error);



                } else {



                    console.log(`Statut commande ${refToUpdate} synchronisé avec Supabase.`);



                }



            } catch (err) {



                console.error("Exception synchronisation commande Supabase:", err);



            }



        }



    }



};







// Suppression d'une commande (SuperAdmin ou avec permission de suppression)



window.deleteOrderFromAdmin = async function (orderId) {



    if (!currentUser || !currentUser.isAdmin) {



        showToast("Accès refusé : session administrateur requise.", "error");



        return;



    }



    const isSuper = currentUser.isSuperAdmin === true || currentUser.email === "mamadoudiaw1105@gmail.com";



    const userPerms = currentUser.permissions || { canAddEdit: true, canDelete: true, canManageOrders: true };



    if (!isSuper && !userPerms.canDelete) {



        showToast("Action refusée : permission de suppression manquante.", "warning");



        return;



    }







    const o = orders.find(ord => String(ord.id) === String(orderId) || String(ord.reference) === String(orderId));



    const refToDelete = o ? (o.reference || o.id) : orderId;







    const confirmed = await showAdminConfirmModal({



        title: "Supprimer la commande",



        message: `Êtes-vous certain de vouloir supprimer définitivement la commande #${refToDelete} ? Cette action est irréversible.`,



        confirmText: "Supprimer la commande"



    });







    if (!confirmed) return;







    // 1. Enregistrer dans les tombstones persistants



    addDeletedOrderId(orderId, o ? o.reference : "", o ? o.supabaseId : "");







    // 2. Mettre à jour en local immédiatement



    orders = orders.filter(ord => String(ord.id) !== String(orderId) && String(ord.reference) !== String(orderId));



    localStorage.setItem("diaw_shoop_orders", JSON.stringify(orders));



    renderAdminDashboard();



    showToast(`Commande #${refToDelete} supprimée avec succès.`);







    // 3. Supprimer de Supabase en arrière-plan (non-bloquant)



    if (supabaseClient) {



        db.deleteOrder(refToDelete)



            .then(res => console.log(`Commande ${refToDelete} supprimée de Supabase.`, res))



            .catch(err => console.error("Erreur suppression commande Supabase:", err));



    }



};







// Affichage et impression du reçu / bordereau de commande



window.viewOrderInvoiceModal = function (orderId) {



    const o = orders.find(ord => ord.id === orderId || ord.reference === orderId);



    if (!o) {



        showToast("Commande introuvable.", "warning");



        return;



    }







    const modalDetails = document.getElementById("admin-invoice-modal-details");



    const modal = document.getElementById("order-invoice-modal");



    if (!modalDetails || !modal) return;







    let itemsRowsHtml = "";



    (o.items || []).forEach(it => {



        const displaySize = it.size === "U" ? "" : ` (${it.size})`;



        itemsRowsHtml += `



            <div class="invoice-row">



                <span>${escapeHTML(it.name)}${displaySize} x${it.qty}</span>



                <span>${(Number(it.price) * it.qty).toLocaleString("fr-FR")} F</span>



            </div>



        `;



    });







    modalDetails.innerHTML = `



        <div class="invoice-title" style="letter-spacing:1px; margin-bottom:12px;">BORDEREAU DE LIVRAISON</div>



        <div class="invoice-row">



            <span><strong>N° Commande :</strong></span>



            <span>#${o.id}</span>



        </div>



        <div class="invoice-row">



            <span><strong>Date :</strong></span>



            <span>${o.date}</span>



        </div>



        <div class="invoice-row divider">



            <span><strong>Transaction :</strong></span>



            <span style="color: var(--accent-dark); font-weight:bold;">${o.reference || o.id}</span>



        </div>



        



        <div class="invoice-row">



            <span><strong>Destinataire :</strong></span>



            <span>${escapeHTML(o.clientName)}</span>



        </div>



        <div class="invoice-row">



            <span><strong>Téléphone :</strong></span>



            <span>+221 ${escapeHTML(o.clientPhone)}</span>



        </div>



        <div class="invoice-row divider">



            <span><strong>Adresse de Livraison :</strong></span>



            <span>${escapeHTML(o.clientAddress)}</span>



        </div>



        ${o.notes ? `



        <div class="invoice-row divider">



            <span><strong>Instructions :</strong></span>



            <span style="font-style: italic;">${escapeHTML(o.notes)}</span>



        </div>` : ''}



        



        ${itemsRowsHtml}



        



        <div class="invoice-row divider" style="margin-top: 10px;">



            <span>Frais de livraison (${(o.shippingCost || 0) === 0 ? 'Offert' : 'Standard'}) :</span>



            <span>${(o.shippingCost || 0).toLocaleString("fr-FR")} F</span>



        </div>



        <div class="invoice-row total">



            <span>TOTAL :</span>



            <span>${(Number(o.total) || 0).toLocaleString("fr-FR")} FCFA</span>



        </div>



        <div class="invoice-row" style="margin-top: 10px; font-size: 0.75rem; color: var(--text-muted);">



            <span>Mode : ${escapeHTML(o.paymentMethod || 'Espèces')}</span>



            <span>Statut actuel : ${escapeHTML(o.status)}</span>



        </div>



    `;







    modal.classList.add("open");



};







// Edit Product Form Trigger



window.editProductInAdmin = function (productId) {



    if (!currentUser || !currentUser.isAdmin) return;







    const prod = products.find(p => p.id === productId);



    if (!prod) return;







    editingProductId = productId;



    elements.editProductIdInput.value = productId;







    elements.prodNameInput.value = prod.name;



    elements.prodPriceInput.value = prod.price;



    elements.prodCategorySelect.value = prod.category;



    if (elements.prodDescTextarea) elements.prodDescTextarea.value = prod.description || "";







    // Reset uploader values



    customImageBase64 = "";



    customVideoBase64 = "";



    if (elements.prodImageFileInput) elements.prodImageFileInput.value = "";



    if (elements.prodVideoFileInput) elements.prodVideoFileInput.value = "";







    // Check if image is one of presets



    const presetOptions = Array.from(elements.prodImagePresetSelect.options).map(o => o.value);



    const customOptions = document.getElementById("custom-image-options");







    if (presetOptions.includes(prod.image)) {



        elements.prodImagePresetSelect.value = prod.image;



        if (customOptions) customOptions.style.display = "none";



        if (elements.prodImageUrlInput) elements.prodImageUrlInput.required = false;



    } else {



        elements.prodImagePresetSelect.value = "custom";



        if (customOptions) customOptions.style.display = "flex";



        if (prod.image && prod.image.startsWith("data:image")) {



            customImageBase64 = prod.image;



            if (elements.prodImageUrlInput) {



                elements.prodImageUrlInput.value = "";



                elements.prodImageUrlInput.required = false;



            }



        } else {



            if (elements.prodImageUrlInput) {



                elements.prodImageUrlInput.value = prod.image || "";



                elements.prodImageUrlInput.required = true;



            }



        }



    }







    // Populate description



    if (elements.prodDescTextarea) {



        elements.prodDescTextarea.value = prod.description || "";



    }







    // Populate simplified stock



    const stockQtyInput = document.getElementById("stock-qty");



    if (stockQtyInput) {



        let currentQty = 20;



        if (prod.stocks) {



            currentQty = prod.stocks.total !== undefined ? prod.stocks.total : (prod.stocks.S || 20);



        }



        stockQtyInput.value = currentQty;



    }







    // Populate Size Management type



    const sizeTypeSelect = document.getElementById("prod-size-type");



    if (sizeTypeSelect) {



        if (prod.hasSizes === false || prod.sizeType === "none") {



            sizeTypeSelect.value = "none";



        } else if (prod.hasSizes === true || prod.sizeType === "multiple") {



            sizeTypeSelect.value = "multiple";



        } else {



            sizeTypeSelect.value = productRequiresSize(prod) ? "multiple" : "none";



        }



    }
}

function resetAdminForm() {
    editingProductId = null;
    elements.editProductIdInput.value = "";
    elements.productAdminForm.reset();
    if (elements.prodDescTextarea) elements.prodDescTextarea.value = "";
    const sizeTypeSelect = document.getElementById("prod-size-type");
    if (sizeTypeSelect) sizeTypeSelect.value = "none";
    updateAdminCategorySizeNotice();
    const stockQtyInput = document.getElementById("stock-qty");



    if (stockQtyInput) stockQtyInput.value = "20";







    const customOptions = document.getElementById("custom-image-options");



    if (customOptions) customOptions.style.display = "none";



    if (elements.prodImageUrlInput) {



        elements.prodImageUrlInput.style.display = "none";



        elements.prodImageUrlInput.required = false;



    }







    customImageBase64 = "";



    customVideoBase64 = "";



    if (elements.prodImageFileInput) elements.prodImageFileInput.value = "";



    if (elements.prodVideoFileInput) elements.prodVideoFileInput.value = "";







    elements.productFormTitle.textContent = "Ajouter un nouveau produit";



    elements.btnSaveProduct.textContent = "Créer le produit";



    elements.btnCancelEdit.style.display = "none";



}







function updateAdminCategorySizeNotice() {



    const cat = elements.prodCategorySelect ? elements.prodCategorySelect.value : "vetements";



    const sizeTypeSelect = document.getElementById("prod-size-type");



    const noticeEl = document.getElementById("admin-size-info-text");







    // Suggest default size type for category when creating a new product



    if (sizeTypeSelect && !editingProductId) {



        if (cat === "beaute" || cat === "parfums") {



            sizeTypeSelect.value = "none";



        } else if (cat === "robes") {



            sizeTypeSelect.value = "multiple";



        }



    }







    const currentType = sizeTypeSelect ? sizeTypeSelect.value : "none";



    if (noticeEl) {



        if (currentType === "none") {



            noticeEl.textContent = "Taille Unique sélectionnée : aucun choix de taille ne sera imposé à vos clientes (achat direct en 1 clic).";



        } else {



            noticeEl.textContent = "Tailles multiples sélectionnées : les clientes choisiront leur taille (XS, S, M, L, XL, 2XL) avant de commander.";



        }



    }



}



if (elements.prodCategorySelect) {



    elements.prodCategorySelect.addEventListener("change", updateAdminCategorySizeNotice);



}



const prodSizeTypeSelect = document.getElementById("prod-size-type");



if (prodSizeTypeSelect) {



    prodSizeTypeSelect.addEventListener("change", updateAdminCategorySizeNotice);



}











// Delete Product Action — Suppression directe dans diawshoop_products



window.deleteProductFromAdmin = async function (productId) {



    if (!currentUser || !currentUser.isAdmin) {



        showToast("Accès refusé : session administrateur requise.", "error");



        return;



    }







    const isSuper = currentUser.isSuperAdmin === true || 



                    currentUser.email === "mamadoudiaw2005@gmail.com" || 



                    currentUser.email === "mamadoudiaw1105@gmail.com";



    const userPerms = currentUser.permissions || { canAddEdit: true, canDelete: true, canManageOrders: true };



    if (!isSuper && !userPerms.canDelete) {



        showToast("Action refusée : permission de suppression manquante.", "warning");



        return;



    }







    const targetProd = products.find(p => String(p.id) === String(productId));



    const prodName = targetProd ? targetProd.name : "cet article";







    const confirmed = await showAdminConfirmModal({



        title: "Supprimer l'article",



        message: `Êtes-vous certain de vouloir supprimer définitivement "${prodName}" de la base Cloud de DIAW SHOOP ? Cette action est immédiate et irréversible pour tous les clients.`,



        confirmText: "Supprimer l'article"



    });







    if (!confirmed) return;







    // 1. Suppression directe et prioritaire dans Supabase diawshoop_products



    if (supabaseClient) {



        try {



            const res = await db.deleteProduct(productId, targetProd ? targetProd.name : "");



            if (res && res.error) {



                console.error("Erreur suppression Supabase :", res.error);



                showToast(`Erreur Supabase : ${res.error.message || 'Impossible de supprimer'}. Vérifiez vos accès.`, "error");



                return;



            }



            console.log("Suppression Supabase confirmée pour :", productId);



        } catch (err) {



            console.error("Erreur réseau Supabase :", err);



            showToast("Erreur de connexion avec la base Supabase.", "error");



            return;



        }



    }







    // 2. Mettre à jour en local immédiatement (DOM et LocalStorage)



    products = products.filter(p => String(p.id) !== String(productId));



    localStorage.setItem("diaw_shoop_products", JSON.stringify(products));







    // Retirer du panier si présent



    cart = cart.filter(item => String(item.id) !== String(productId));



    saveCart();



    renderCart();







    // Actualiser le catalogue et le tableau de bord



    renderProductList();



    renderAdminDashboard();







    if (editingProductId === productId) {



        resetAdminForm();



    }







    showToast(`Article "${prodName}" supprimé avec succès de la base de données !`);



};







// Form submit to Create/Update product



elements.productAdminForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser || !currentUser.isAdmin) return;

    // Loading state UI
    const originalBtnText = elements.btnSaveProduct.textContent;
    elements.btnSaveProduct.textContent = "Sauvegarde...";
    elements.btnSaveProduct.disabled = true;

    try {
        const name = elements.prodNameInput.value.trim();
        const price = parseInt(elements.prodPriceInput.value);
        const category = elements.prodCategorySelect.value;
        const description = (elements.prodDescTextarea ? elements.prodDescTextarea.value.trim() : "") || name;

        // Size type handling
        const sizeType = document.getElementById("prod-size-type") ? document.getElementById("prod-size-type").value : "none";
        const hasSizes = sizeType === "multiple";

        // Promotion handling (désactivé)
        const isPromo = false;
        const oldPrice = 0;

        // Resolve image
        let image = elements.prodImagePresetSelect.value;
        if (image === "custom") {
            image = customImageBase64 || (elements.prodImageUrlInput ? elements.prodImageUrlInput.value.trim() : "");
            if (!image) {
                showToast("Veuillez sélectionner un fichier image ou saisir une URL.", "error");
                elements.btnSaveProduct.textContent = originalBtnText;
                elements.btnSaveProduct.disabled = false;
                return;
            }
        }

        const finalVideoUrl = "";

        // Simplified Stocks
        const stockQtyEl = document.getElementById("stock-qty");
        const qtyVal = stockQtyEl ? (parseInt(stockQtyEl.value) || 20) : 20;
        const stocks = {
            total: qtyVal,
            S: qtyVal,
            M: qtyVal,
            L: qtyVal,
            XL: qtyVal
        };

        if (editingProductId) {
            // UPDATE Mode
            const updatePayload = {
                name, price, category, description, image, videoUrl: finalVideoUrl, stocks,
                hasSizes, sizeType, isPromo, oldPrice
            };

            if (supabaseClient) {
                try {
                    const { error } = await db.updateProduct(editingProductId, updatePayload);
                    if (error) {
                        console.error("Supabase updateProduct error:", error);
                        showToast(`Erreur Cloud Supabase : ${error.message || 'Mise à jour impossible sur le serveur'}.`, "error");
                        elements.btnSaveProduct.textContent = originalBtnText;
                        elements.btnSaveProduct.disabled = false;
                        return;
                    }
                    console.log("Produit mis à jour sur Supabase Cloud :", editingProductId);
                } catch (supErr) {
                    console.error("Supabase updateProduct exception:", supErr);
                    showToast("Erreur réseau : impossible de joindre Supabase Cloud.", "error");
                    elements.btnSaveProduct.textContent = originalBtnText;
                    elements.btnSaveProduct.disabled = false;
                    return;
                }
            }

            const prod = products.find(p => p.id === editingProductId);
            if (prod) {
                Object.assign(prod, updatePayload);
                showToast(`Article "${escapeHTML(name)}" mis à jour sur Supabase Cloud avec succès !`, "success");
            }
        } else {
            // CREATE Mode
            const fallbackId = "prod-" + Math.floor(1000 + Math.random() * 9000);
            const newProd = {
                id: fallbackId,
                name,
                price,
                category,
                description,
                image,
                videoUrl: finalVideoUrl,
                stocks,
                hasSizes,
                sizeType,
                isPromo,
                oldPrice
            };

            if (supabaseClient) {
                try {
                    const { data: createdRemote, error } = await db.addProduct(newProd);
                    if (error) {
                        console.error("Supabase addProduct error:", error);
                        showToast(`Erreur Cloud Supabase : ${error.message || 'Sauvegarde impossible sur le serveur'}. Exécutez le script SQL.`, "error");
                        elements.btnSaveProduct.textContent = originalBtnText;
                        elements.btnSaveProduct.disabled = false;
                        return;
                    } else if (createdRemote && createdRemote.id) {
                        newProd.id = String(createdRemote.id);
                        console.log("Produit enregistré avec succès dans Supabase diawshoop_products :", newProd.id);
                    }
                } catch (supErr) {
                    console.error("Supabase addProduct exception:", supErr);
                    showToast("Erreur réseau : impossible de joindre Supabase Cloud.", "error");
                    elements.btnSaveProduct.textContent = originalBtnText;
                    elements.btnSaveProduct.disabled = false;
                    return;
                }
            }

            products.push(newProd);
            showToast(`Article "${escapeHTML(name)}" publié et synchronisé sur Supabase Cloud avec succès !`, "success");
        }

        // Save, refresh tables, reset form
        localStorage.setItem("diaw_shoop_products", JSON.stringify(products));
        renderProductList();
        renderAdminDashboard();
        resetAdminForm();
    } catch (error) {
        console.error("Erreur enregistrement produit :", error);
        showToast("Une erreur inattendue est survenue.", "error");
    } finally {
        elements.btnSaveProduct.textContent = originalBtnText;
        elements.btnSaveProduct.disabled = false;
    }
});







// Dynamic Store Settings management



function applyStoreSettings() {



    const settings = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || {



        whatsapp: "221705476061",



        email: "mamadoudiaw1105@gmail.com",



        address: "Liberté 6 Extension, Dakar, Sénégal",



        hours: "Lun - Ven : 10h - 22h / Sam : 10h - 18h",



        instagram: "https://instagram.com/",



        facebook: "https://facebook.com/",



        tiktok: "https://tiktok.com/",



        googleClientId: "616654931328-e2qe49rge45fulu769pd21gemfhc2ovs.apps.googleusercontent.com",



        shopName: "DIAW SHOOP",



        shopLogo: "assets/logo_diaw_shoop.jpg",



        payoutNumber: "770000000",



        payoutCarrier: "wave"



    };







    // Update logo name and image across the entire site



    const logoName = (settings.shopName || "DIAW SHOOP").trim();



    const logoImgUrl = settings.shopLogo || "assets/logo_diaw_shoop.jpg";







    // Format stylized logo HTML (highlight first word in accent color if desired)



    const formatLogoHtml = (name) => {



        const parts = name.split(" ");



        if (parts.length > 1) {



            return `<span style="color: var(--accent);">${escapeHTML(parts[0])}</span> ${escapeHTML(parts.slice(1).join(" "))}`;



        }



        return `<span style="color: var(--accent);">${escapeHTML(name)}</span>`;



    };







    // Header Logo Text



    const logoHeaderText = document.getElementById("logo-header-text");



    if (logoHeaderText) {



        logoHeaderText.innerHTML = formatLogoHtml(logoName);



    }







    // Portal Logo Text (3-dots navigation menu)



    const logoPortalText = document.getElementById("logo-portal-text");



    if (logoPortalText) {



        logoPortalText.innerHTML = formatLogoHtml(logoName);



    }







    // Footer Logo Text



    const logoFooterText = document.getElementById("logo-footer-text");



    if (logoFooterText) {



        logoFooterText.innerHTML = formatLogoHtml(logoName);



    }







    // Browser Page Title



    document.title = `${logoName} | Robes, Abayas & Produits de Beauté Féminins Sénégal`;







    // Footer Copyright



    const footerCopyright = document.getElementById("footer-copyright");



    if (footerCopyright) {



        footerCopyright.innerHTML = `&copy; ${new Date().getFullYear()} ${escapeHTML(logoName)}. Tous droits réservés. Prêt-à-porter & Cosmétiques féminins au Sénégal.`;



    }







    // Google Popup Destination Display



    const googlePopupTitle = document.querySelector(".google-popup-body h3");



    if (googlePopupTitle) {



        googlePopupTitle.innerHTML = `Choisissez un compte pour continuer vers <strong>${escapeHTML(logoName)}</strong>`;



    }







    // Admin Dashboard Header



    const adminHeaderTitle = document.querySelector(".admin-header h2");



    if (adminHeaderTitle) {



        adminHeaderTitle.innerHTML = `<i class="fa-solid fa-lock text-accent"></i> ${escapeHTML(logoName)} Admin Dashboard`;



    }







    // Overwrite footer DOM references



    const footerPhone = document.getElementById("footer-phone-display");



    const footerAddress = document.getElementById("footer-address-display");



    const footerEmail = document.getElementById("footer-email-display");



    const footerHours = document.getElementById("footer-hours-display");



    const footerWaLink = document.getElementById("footer-link-whatsapp-icon");



    const footerIgLink = document.getElementById("footer-link-instagram");



    const footerFbLink = document.getElementById("footer-link-facebook");



    const footerTtLink = document.getElementById("footer-link-tiktok");







    if (footerPhone) footerPhone.textContent = `+221 ${settings.whatsapp.replace("221", "")}`;



    if (footerAddress) footerAddress.textContent = settings.address;



    if (footerEmail) footerEmail.textContent = settings.email;



    if (footerHours) footerHours.textContent = settings.hours;



    if (footerWaLink) footerWaLink.href = `https://wa.me/${settings.whatsapp}`;



    if (footerIgLink) footerIgLink.href = settings.instagram || "https://instagram.com/";



    if (footerFbLink) footerFbLink.href = settings.facebook || "https://facebook.com/";



    if (footerTtLink) footerTtLink.href = settings.tiktok || "https://tiktok.com/";







    // Update contact-section DOM elements



    const contactPhoneLink = document.getElementById("contact-phone-link");



    const contactWhatsappLink = document.getElementById("contact-whatsapp-link");



    const contactEmailLink = document.getElementById("contact-email-link");



    const contactAddressText = document.getElementById("contact-address-text");



    const contactHoursText = document.getElementById("contact-hours-text");



    const contactDirectWaBtn = document.getElementById("contact-direct-wa-btn");







    // Dynamic store name in contact section



    const contactShopNames = document.querySelectorAll(".contact-shop-name");



    contactShopNames.forEach(el => {



        el.textContent = logoName;



    });







    if (contactPhoneLink) {



        contactPhoneLink.textContent = `+221 ${settings.whatsapp.replace("221", "")}`;



        contactPhoneLink.href = `tel:+221${settings.whatsapp.replace("221", "")}`;



    }



    if (contactWhatsappLink) {



        contactWhatsappLink.textContent = `+221 ${settings.whatsapp.replace("221", "")}`;



        contactWhatsappLink.href = `https://wa.me/${settings.whatsapp}`;



    }



    if (contactEmailLink) {



        contactEmailLink.textContent = settings.email;



        contactEmailLink.href = `mailto:${settings.email}`;



    }



    if (contactAddressText) contactAddressText.textContent = settings.address;



    if (contactHoursText) contactHoursText.textContent = settings.hours;



    if (contactDirectWaBtn) {



        contactDirectWaBtn.href = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent('Bonjour ' + logoName + ", j'ai besoin d'aide pour une commande")}`;



    }







    // Update settings form input values



    const settingsWhatsappInput = document.getElementById("settings-whatsapp");



    const settingsEmailInput = document.getElementById("settings-email");



    const settingsAddressInput = document.getElementById("settings-address");



    const settingsHoursInput = document.getElementById("settings-hours");



    const settingsInstagramInput = document.getElementById("settings-instagram");



    const settingsFacebookInput = document.getElementById("settings-facebook");



    const settingsTiktokInput = document.getElementById("settings-tiktok");



    const settingsGoogleClientIdInput = document.getElementById("settings-google-client-id");



    const settingsShopNameInput = document.getElementById("settings-shop-name");



    const settingsShopLogoSelect = document.getElementById("settings-shop-logo-select");



    const settingsPayoutNumberInput = document.getElementById("settings-payout-number");



    const settingsPayoutCarrierInput = document.getElementById("settings-payout-carrier");







    // Promo Announcement Bar in client view



    const promoBar = document.getElementById("promo-announcement-bar");



    const promoText = document.getElementById("promo-announcement-text");



    if (promoBar) {



        if (settings.promotionsEnabled !== false && settings.promoBannerText) {



            promoBar.style.display = "block";



            if (promoText) {



                promoText.innerHTML = `<i class="fa-solid fa-bolt text-accent"></i> ${escapeHTML(settings.promoBannerText)}`;



            }



        } else {



            promoBar.style.display = "none";



        }



    }







    // Settings Promo Inputs



    const settingsPromoEnabledInput = document.getElementById("settings-promo-enabled");



    const settingsPromoBannerTextInput = document.getElementById("settings-promo-banner-text");



    if (settingsPromoEnabledInput) {



        settingsPromoEnabledInput.checked = settings.promotionsEnabled !== false;



    }



    if (settingsPromoBannerTextInput) {



        settingsPromoBannerTextInput.value = settings.promoBannerText || "🔥 OFFRES SPÉCIALES DIAW SHOOP : Jusqu'à -40% sur nos Robes & Abayas exclusives !";



    }







    // Settings Delivery Pricing Inputs



    const delivery = settings.deliveryPricing || {



        dakarCentre: 1500,



        banlieue: 2500,



        regions: 4000,



        regionsEnabled: true,



        pickupEnabled: true,



        freeShippingThreshold: 35000



    };



    const settingsShippingDakar = document.getElementById("settings-shipping-dakar");



    const settingsShippingBanlieue = document.getElementById("settings-shipping-banlieue");



    const settingsShippingRegions = document.getElementById("settings-shipping-regions");



    const settingsShippingRegionsEnabled = document.getElementById("settings-shipping-regions-enabled");



    const settingsShippingPickupEnabled = document.getElementById("settings-shipping-pickup-enabled");



    const settingsShippingFreeThreshold = document.getElementById("settings-shipping-free-threshold");







    if (settingsShippingDakar) settingsShippingDakar.value = delivery.dakarCentre ?? 1500;



    if (settingsShippingBanlieue) settingsShippingBanlieue.value = delivery.banlieue ?? 2500;



    if (settingsShippingRegions) settingsShippingRegions.value = delivery.regions ?? 4000;



    if (settingsShippingRegionsEnabled) settingsShippingRegionsEnabled.checked = delivery.regionsEnabled !== false;



    if (settingsShippingPickupEnabled) settingsShippingPickupEnabled.checked = delivery.pickupEnabled !== false;



    if (settingsShippingFreeThreshold) settingsShippingFreeThreshold.value = delivery.freeShippingThreshold ?? 35000;







    if (settingsWhatsappInput) settingsWhatsappInput.value = settings.whatsapp;



    if (settingsEmailInput) settingsEmailInput.value = settings.email;



    if (settingsAddressInput) settingsAddressInput.value = settings.address;



    if (settingsHoursInput) settingsHoursInput.value = settings.hours || "Lun - Ven : 10h - 22h / Sam : 10h - 18h";



    if (settingsInstagramInput) settingsInstagramInput.value = settings.instagram || "";



    if (settingsFacebookInput) settingsFacebookInput.value = settings.facebook || "";



    if (settingsTiktokInput) settingsTiktokInput.value = settings.tiktok || "";



    if (settingsGoogleClientIdInput) settingsGoogleClientIdInput.value = settings.googleClientId || "";



    if (settingsShopNameInput) settingsShopNameInput.value = settings.shopName || "DIAW SHOOP";



    if (settingsPayoutNumberInput) settingsPayoutNumberInput.value = settings.payoutNumber || "770000000";



    if (settingsPayoutCarrierInput) settingsPayoutCarrierInput.value = settings.payoutCarrier || "wave";



    if (settingsShopLogoSelect) {



        settingsShopLogoSelect.value = settings.shopLogo && settings.shopLogo.startsWith("data:") ? "custom" : "preset";



        const fileWrapper = document.getElementById("settings-shop-logo-file-wrapper");



        if (fileWrapper) {



            fileWrapper.style.display = settingsShopLogoSelect.value === "custom" ? "block" : "none";



        }



    }







    // Refresh delivery zones options & calculations



    if (typeof updateDeliveryZoneSelect === "function") {



        updateDeliveryZoneSelect();



    }



    if (typeof calculateCartTotals === "function") {



        calculateCartTotals();



    }



}







const shopSettingsForm = document.getElementById("shop-settings-form");



if (shopSettingsForm) {



    shopSettingsForm.addEventListener("submit", (e) => {



        e.preventDefault();







        if (!currentUser || !currentUser.isSuperAdmin) {



            showToast("Accès non autorisé.", "error");



            return;



        }







        const currentSettings = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || {};







        const whatsapp = document.getElementById("settings-whatsapp").value.trim().replace(/\+/g, '').replace(/\s+/g, '');



        const email = document.getElementById("settings-email").value.trim();



        const address = document.getElementById("settings-address").value.trim();



        const hours = document.getElementById("settings-hours").value.trim();



        const instagram = document.getElementById("settings-instagram").value.trim() || "https://instagram.com/";



        const facebook = document.getElementById("settings-facebook").value.trim() || "https://facebook.com/";



        const tiktok = document.getElementById("settings-tiktok").value.trim() || "https://tiktok.com/";



        const googleClientId = document.getElementById("settings-google-client-id").value.trim() || "616654931328-e2qe49rge45fulu769pd21gemfhc2ovs.apps.googleusercontent.com";



        const shopName = document.getElementById("settings-shop-name").value.trim() || "DIAW SHOOP";



        const payoutNumber = document.getElementById("settings-payout-number").value.trim() || "770000000";



        const payoutCarrier = document.getElementById("settings-payout-carrier").value || "wave";







        // Read Promotions settings



        const promotionsEnabled = false;
        const promoBannerText = "";







        // Read Delivery Pricing settings



        const deliveryPricing = {



            dakarCentre: parseInt(document.getElementById("settings-shipping-dakar")?.value) || 1500,



            banlieue: parseInt(document.getElementById("settings-shipping-banlieue")?.value) || 2500,



            regions: parseInt(document.getElementById("settings-shipping-regions")?.value) || 4000,



            regionsEnabled: document.getElementById("settings-shipping-regions-enabled") ? document.getElementById("settings-shipping-regions-enabled").checked : true,



            pickupEnabled: document.getElementById("settings-shipping-pickup-enabled") ? document.getElementById("settings-shipping-pickup-enabled").checked : true,



            freeShippingThreshold: parseInt(document.getElementById("settings-shipping-free-threshold")?.value) || 0



        };







        const logoSelect = document.getElementById("settings-shop-logo-select").value;



        let shopLogo = "assets/logo_diaw_shoop.jpg";



        if (logoSelect === "custom") {



            shopLogo = customLogoBase64 || currentSettings.shopLogo || "assets/logo_diaw_shoop.jpg";



        }







        const newSettings = {



            whatsapp, email, address, hours, instagram, facebook, tiktok,



            googleClientId, shopName, shopLogo, payoutNumber, payoutCarrier,



            promotionsEnabled, promoBannerText, deliveryPricing



        };



        localStorage.setItem("diaw_shoop_settings", JSON.stringify(newSettings));







        // Enregistrement Cloud immédiat pour tous les clients



        if (supabaseClient) {



            db.saveSettings(newSettings)



                .then(() => console.log("Réglages et promotions synchronisés sur Supabase Cloud."))



                .catch(err => console.warn("Notice sync réglages Cloud :", err));



        }







        applyStoreSettings();



        if (typeof updateDeliveryZoneSelect === "function") {



            updateDeliveryZoneSelect();



        }



        if (typeof calculateCartTotals === "function") {



            calculateCartTotals();



        }



        if (typeof renderProductList === "function") {



            renderProductList();



        }







        // Re-initialize Google Sign-in with the new Client ID



        if (typeof initializeGoogleSignIn === "function") {



            initializeGoogleSignIn();



        }



        showToast("Configuration de la boutique enregistrée avec succès !");



    });



}







// --- 12. LOGO & 3-DOTS NAVIGATION PORTAL ---



const brandLogo = document.getElementById("brand-logo");



const btnNavPortalTrigger = document.getElementById("btn-nav-portal-trigger");



const portalOverlay = document.getElementById("logo-portal-overlay");



const btnClosePortal = document.getElementById("btn-close-portal");







const openPortal = () => {



    if (portalOverlay) {



        // Sync user status in portal



        const portalAccountText = document.getElementById("portal-account-text");



        const portalBtnAdmin = document.getElementById("portal-btn-admin");



        if (portalAccountText) {



            portalAccountText.textContent = currentUser ? `Mon Profil (${currentUser.name})` : "Se connecter / Créer un compte";



        }



        if (portalBtnAdmin) {



            portalBtnAdmin.style.display = (currentUser && currentUser.isAdmin) ? "flex" : "none";



        }







        portalOverlay.style.display = "flex";



        setTimeout(() => portalOverlay.classList.add("open"), 10);



    }



};







// --- 12. SINGLE PAGE VIEW SWITCHER (ACCUEIL/BOUTIQUE vs. PAGE CONTACT SPÉCIALE) ---



const clientShopViewEl = document.getElementById("client-shop-view");



const contactSectionEl = document.getElementById("contact-section");



const adminSectionEl = document.getElementById("admin-section");



const btnBackToShop = document.getElementById("btn-back-to-shop");



const navContactEl = document.getElementById("nav-contact");



const navHomeEl = document.getElementById("nav-home");



const navShopEl = document.getElementById("nav-shop");







function showContactView() {



    if (clientShopViewEl) clientShopViewEl.style.display = "none";



    if (adminSectionEl) adminSectionEl.style.display = "none";



    if (contactSectionEl) contactSectionEl.style.display = "block";







    const clientHeader = document.getElementById("main-header");



    const clientFooter = document.querySelector(".main-footer");



    if (clientHeader) clientHeader.style.display = "block";



    if (clientFooter) clientFooter.style.display = "block";







    // Nav active link state



    if (navHomeEl) navHomeEl.classList.remove("active");



    if (navShopEl) navShopEl.classList.remove("active");



    if (navContactEl) navContactEl.classList.add("active");







    window.scrollTo({ top: 0, behavior: "smooth" });



}







function showHomeShopView(scrollToShop = false) {



    if (contactSectionEl) contactSectionEl.style.display = "none";



    if (adminSectionEl) adminSectionEl.style.display = "none";



    if (clientShopViewEl) clientShopViewEl.style.display = "block";







    const clientHeader = document.getElementById("main-header");



    const clientFooter = document.querySelector(".main-footer");



    if (clientHeader) clientHeader.style.display = "block";



    if (clientFooter) clientFooter.style.display = "block";







    // Nav active link state



    if (navContactEl) navContactEl.classList.remove("active");



    if (scrollToShop) {



        if (navHomeEl) navHomeEl.classList.remove("active");



        if (navShopEl) navShopEl.classList.add("active");



        const shopSection = document.getElementById("shop-section");



        if (shopSection) {



            shopSection.scrollIntoView({ behavior: "smooth" });



        }



    } else {



        if (navShopEl) navShopEl.classList.remove("active");



        if (navHomeEl) navHomeEl.classList.add("active");



        window.scrollTo({ top: 0, behavior: "smooth" });



    }



}







// Brand Logo: go to home view and scroll top



if (brandLogo) {



    brandLogo.addEventListener("click", (e) => {



        e.preventDefault();



        showHomeShopView(false);



    });



}







// Top Navigation Menu items



if (navContactEl) {



    navContactEl.addEventListener("click", (e) => {



        e.preventDefault();



        showContactView();



    });



}



if (navHomeEl) {



    navHomeEl.addEventListener("click", (e) => {



        e.preventDefault();



        showHomeShopView(false);



    });



}



if (navShopEl) {



    navShopEl.addEventListener("click", (e) => {



        e.preventDefault();



        showHomeShopView(true);



    });



}



if (btnBackToShop) {



    btnBackToShop.addEventListener("click", (e) => {



        e.preventDefault();



        showHomeShopView(false);



    });



}







// Footer links directing to Contact



document.querySelectorAll('a[href="#contact-section"]').forEach(link => {



    link.addEventListener("click", (e) => {



        e.preventDefault();



        showContactView();



    });



});







// Footer links directing to Shop or Home



document.querySelectorAll('a[href="#shop-section"]').forEach(link => {



    link.addEventListener("click", (e) => {



        e.preventDefault();



        showHomeShopView(true);



    });



});



document.querySelectorAll('a[href="#client-shop-view"]').forEach(link => {



    link.addEventListener("click", (e) => {



        e.preventDefault();



        showHomeShopView(false);



    });



});







// 3-Dots Navigation Menu Trigger Button



if (btnNavPortalTrigger) {



    btnNavPortalTrigger.addEventListener("click", (e) => {



        e.preventDefault();



        openPortal();



    });



}







const closePortal = () => {



    if (portalOverlay) {



        portalOverlay.classList.remove("open");



        setTimeout(() => portalOverlay.style.display = "none", 300);



    }



};







if (btnClosePortal) {



    btnClosePortal.addEventListener("click", closePortal);



}







// Nav buttons in portal



const portalBtnHome = document.getElementById("portal-btn-home");



const portalBtnShop = document.getElementById("portal-btn-shop");



const portalBtnContact = document.getElementById("portal-btn-contact");



const portalBtnOrders = document.getElementById("portal-btn-orders");



const portalBtnAccount = document.getElementById("portal-btn-account");



const portalBtnAdmin = document.getElementById("portal-btn-admin");







if (portalBtnHome) {



    portalBtnHome.addEventListener("click", () => {



        closePortal();



        showHomeShopView(false);



    });



}



if (portalBtnShop) {



    portalBtnShop.addEventListener("click", () => {



        closePortal();



        showHomeShopView(true);



    });



}



if (portalBtnContact) {



    portalBtnContact.addEventListener("click", () => {



        closePortal();



        showContactView();



    });



}



if (portalBtnOrders) {



    portalBtnOrders.addEventListener("click", () => {



        closePortal();



        setTimeout(() => {



            if (!currentUser) {



                showToast("Connectez-vous pour consulter l'historique complet de vos commandes.", "info");



                if (elements.authModal) elements.authModal.classList.add("open");



            } else {



                openUserOrdersModal();



            }



        }, 350);



    });



}



if (portalBtnAccount) {



    portalBtnAccount.addEventListener("click", () => {



        closePortal();



        setTimeout(() => {



            if (!currentUser) {



                if (elements.authModal) elements.authModal.classList.add("open");



            } else {



                showToast(`Connecté en tant que ${currentUser.name}`);



            }



        }, 350);



    });



}



if (portalBtnAdmin) {



    portalBtnAdmin.addEventListener("click", () => {



        closePortal();



        setTimeout(() => {



            if (currentUser && currentUser.isAdmin && elements.navAdmin) {



                elements.navAdmin.click();



            }



        }, 350);



    });



}







// --- 13. REAL GOOGLE OAUTH 2.0 INTEGRATION ---



function decodeJwtResponse(token) {



    const base64Url = token.split('.')[1];



    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');



    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {



        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);



    }).join(''));



    return JSON.parse(jsonPayload);



}







function handleGoogleCredentialResponse(response) {



    try {



        const payload = decodeJwtResponse(response.credential);



        const email = payload.email.toLowerCase();



        const name = payload.name;



        const avatar = payload.picture;







        const users = JSON.parse(localStorage.getItem("diaw_shoop_users")) || [];



        let user = users.find(u => u.email === email);







        if (!user) {



            // Register a new Client user dynamically on real Google Login



            user = {



                email,



                name,



                passwordHash: mockHashPassword("google123"),



                isAdmin: false,



                isSuperAdmin: false,



                avatar: avatar



            };



            users.push(user);



            localStorage.setItem("diaw_shoop_users", JSON.stringify(users));



        } else {



            // Update avatar image from Google



            user.avatar = avatar;



            localStorage.setItem("diaw_shoop_users", JSON.stringify(users));



        }







        sessionStorage.setItem("diaw_shoop_current_user", JSON.stringify(user));



        currentUser = user;



        updateUserUI();







        elements.authModal.classList.remove("open");



        showToast(`Connecté via Google : Bienvenue ${currentUser.name} !`);



    } catch (err) {



        console.error("Google Authentication error:", err);



        showToast("Erreur d'authentification avec votre compte Google.", "error");



    }



}







function initializeGoogleSignIn() {



    if (typeof google === 'undefined') {



        setTimeout(initializeGoogleSignIn, 300);



        return;



    }







    const settings = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || {};



    const clientId = settings.googleClientId || "616654931328-e2qe49rge45fulu769pd21gemfhc2ovs.apps.googleusercontent.com";







    try {



        google.accounts.id.initialize({



            client_id: clientId,



            callback: handleGoogleCredentialResponse,



            auto_select: false



        });







        const btnContainer = document.getElementById("google-signin-btn-container");



        if (btnContainer) {



            btnContainer.innerHTML = ""; // Clear



            google.accounts.id.renderButton(



                btnContainer,



                {



                    theme: "outline",



                    size: "large",



                    width: "280",



                    text: "continue_with",



                    shape: "rectangular",



                    logo_alignment: "left"



                }



            );



        }







        // Suggestion Google One-Tap discrète si non connecté



        if (!currentUser && typeof google.accounts.id.prompt === "function") {



            google.accounts.id.prompt();



        }



    } catch (gsiErr) {



        console.warn("GSI render notice (will use seamless Google selector):", gsiErr);



    }



}







// Initialize Google Sign-in on Startup



setTimeout(initializeGoogleSignIn, 500);







// --- 14. DYNAMIC LOGO & ADMIN MANAGEMENT ACTIONS ---



let customLogoBase64 = "";



const settingsShopLogoSelect = document.getElementById("settings-shop-logo-select");



const settingsShopLogoFileWrapper = document.getElementById("settings-shop-logo-file-wrapper");



const settingsShopLogoFile = document.getElementById("settings-shop-logo-file");







if (settingsShopLogoSelect && settingsShopLogoFileWrapper) {



    settingsShopLogoSelect.addEventListener("change", function () {



        if (this.value === "custom") {



            settingsShopLogoFileWrapper.style.display = "block";



        } else {



            settingsShopLogoFileWrapper.style.display = "none";



            customLogoBase64 = "";



        }



    });



}







if (settingsShopLogoFile) {



    settingsShopLogoFile.addEventListener("change", function (e) {



        const file = e.target.files[0];



        if (file) {



            const reader = new FileReader();



            reader.onload = function (evt) {



                customLogoBase64 = evt.target.result;



            };



            reader.readAsDataURL(file);



        }



    });



}







// Add Admin Form Submission Handler



const addAdminForm = document.getElementById("add-admin-form");

if (addAdminForm) {
    addAdminForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentUser || !currentUser.isSuperAdmin) {
            showToast("Accès non autorisé : seul le Grand Administrateur peut créer des comptes.", "error");
            return;
        }

        const name = document.getElementById("new-admin-name").value.trim();
        const email = document.getElementById("new-admin-email").value.trim().toLowerCase();
        const password = document.getElementById("new-admin-password").value;
        const role = document.getElementById("new-admin-role-select").value;

        if (!name || !email || !password) {
            showToast("Veuillez remplir tous les champs obligatoires.", "error");
            return;
        }

        if (password.length < 4) {
            showToast("Le mot de passe doit comporter au moins 4 caractères.", "error");
            return;
        }

        const users = JSON.parse(localStorage.getItem("diaw_shoop_users")) || [];
        if (users.some(u => u.email === email)) {
            showToast("Un utilisateur avec cette adresse email existe déjà.", "error");
            return;
        }

        const isSuper = role === "superadmin";

        const newAdmin = {
            email,
            name,
            passwordHash: mockHashPassword(password),
            isAdmin: true,
            isSuperAdmin: isSuper,
            _saltVersion: 2,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
            permissions: isSuper ? {
                canAddEdit: true,
                canDelete: true,
                canManageOrders: true
            } : {
                canAddEdit: true,
                canDelete: false,
                canManageOrders: true
            }
        };

        // 1. Enregistrement direct et obligatoire sur Supabase Cloud (table store_admins)
        if (supabaseClient) {
            try {
                const { error: cloudErr } = await db.saveAdmin(newAdmin);
                if (cloudErr) {
                    console.error("Erreur enregistrement admin Cloud :", cloudErr);
                    showToast(`Erreur Cloud Supabase : ${cloudErr.message || "Impossible d'enregistrer l'administrateur sur Supabase"}. Exécutez le script SQL.`, "error");
                    return;
                }
                console.log("Compte administrateur synchronisé sur Supabase Cloud :", email);
            } catch (err) {
                console.error("Exception synchronisation admin Cloud :", err);
                showToast("Erreur de connexion réseau avec Supabase Cloud.", "error");
                return;
            }
        }

        // 2. Mise à jour du cache local
        users.push(newAdmin);
        localStorage.setItem("diaw_shoop_users", JSON.stringify(users));

        showToast(`Le compte Administrateur pour ${name} a été créé et synchronisé sur Supabase Cloud !`, "success");

        // Réinitialisation des champs
        document.getElementById("new-admin-name").value = "";
        document.getElementById("new-admin-email").value = "";
        document.getElementById("new-admin-password").value = "";

        renderAdminRolesTable();
    });
}







// Grand Admin Personal Credentials Update Handler



const grandAdminForm = document.getElementById("grand-admin-credentials-form");



if (grandAdminForm) {



    grandAdminForm.addEventListener("submit", function (e) {



        e.preventDefault();







        if (!currentUser || !currentUser.isSuperAdmin) {



            showToast("Action réservée au Grand Administrateur.", "error");



            return;



        }







        const newEmail = document.getElementById("grand-admin-email-input").value.trim().toLowerCase();



        const newPass = document.getElementById("grand-admin-pass-input").value.trim();







        if (!newEmail || !newEmail.includes("@")) {



            showToast("Veuillez entrer une adresse e-mail valide.", "error");



            return;



        }







        let users = JSON.parse(localStorage.getItem("diaw_shoop_users")) || [];



        let superAdmin = users.find(u => u.isSuperAdmin === true);







        if (!superAdmin) {



            if (!newPass || newPass.length < 4) {



                showToast("Veuillez saisir un mot de passe sécurisé d'au moins 4 caractères.", "error");



                return;



            }



            superAdmin = {



                email: newEmail,



                passwordHash: mockHashPassword(newPass),



                name: "Mamadou Diaw (Grand Admin)",



                isAdmin: true,



                isSuperAdmin: true,



                _saltVersion: 2,



                permissions: { canAddEdit: true, canDelete: true, canManageOrders: true },



                avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100&h=100"



            };



            users.push(superAdmin);



        } else {



            superAdmin.email = newEmail;



            if (newPass) {



                if (newPass.length < 4) {



                    showToast("Le mot de passe doit comporter au moins 4 caractères.", "error");



                    return;



                }



                superAdmin.passwordHash = mockHashPassword(newPass);



            }



        }







        localStorage.setItem("diaw_shoop_users", JSON.stringify(users));







        // Mettre à jour la session courante



        currentUser.email = newEmail;



        sessionStorage.setItem("diaw_shoop_current_user", JSON.stringify(currentUser));







        // Réinitialiser tout verrouillage anti-brute-force



        resetLoginAttempts();







        // Mettre à jour les aperçus DOM



        const googleSuperEmail = document.querySelector(".google-account-item[data-account='superadmin'] .account-email");



        if (googleSuperEmail) googleSuperEmail.textContent = newEmail;







        const badge = document.getElementById("grand-admin-current-email-badge");



        if (badge) badge.textContent = newEmail;







        document.getElementById("grand-admin-pass-input").value = "";



        showToast(`Identifiants mis à jour ! Vous pouvez désormais vous connecter directement avec : ${newEmail}`);



        renderAdminRolesTable();



    });



}







// Global window action to delete admin



window.deleteAdminAccount = async function (email) {
    if (!currentUser || !currentUser.isSuperAdmin) {
        showToast("Seul le Grand Administrateur peut supprimer des comptes.", "error");
        return;
    }

    const usersCheck = JSON.parse(localStorage.getItem("diaw_shoop_users")) || [];
    const target = usersCheck.find(u => u.email === email);
    if (email === "mamadoudiaw1105@gmail.com" || email === "mamadoudiaw2005@gmail.com" || (target && target.isSuperAdmin)) {
        showToast("Vous ne pouvez pas supprimer le compte racine de Mamadou Diaw.", "error");
        return;
    }

    const confirmed = await showAdminConfirmModal({
        title: "Supprimer l'administrateur",
        message: `Êtes-vous certain de vouloir supprimer définitivement le compte administrateur "${email}" de Supabase Cloud ? Cette action est immédiate et irréversible.`,
        confirmText: "Supprimer le compte"
    });

    if (!confirmed) return;

    // 1. Suppression directe sur Supabase Cloud (table store_admins)
    if (supabaseClient) {
        try {
            const { error: delErr } = await db.deleteAdmin(email);
            if (delErr) {
                console.error("Erreur suppression admin Cloud :", delErr);
                showToast(`Erreur Supabase : ${delErr.message || 'Impossible de supprimer sur le Cloud'}`, "error");
                return;
            }
            console.log("Administrateur supprimé sur Supabase Cloud :", email);
        } catch (err) {
            console.error("Exception suppression admin Cloud :", err);
            showToast("Erreur de communication avec Supabase Cloud.", "error");
            return;
        }
    }

    // 2. Mise à jour du cache local
    let users = JSON.parse(localStorage.getItem("diaw_shoop_users")) || [];
    users = users.filter(u => u.email !== email);
    localStorage.setItem("diaw_shoop_users", JSON.stringify(users));

    showToast("Compte administrateur supprimé sur Supabase Cloud avec succès.", "success");
    renderAdminRolesTable();
};







// --- 15. CUSTOMER REVIEWS & RATINGS SYSTEM ---



function renderProductReviews(productId) {



    const prodReviews = reviews.filter(r => r.productId === productId);



    const count = prodReviews.length;







    const countEl = document.getElementById("modal-reviews-count");



    const avgEl = document.getElementById("modal-reviews-avg");



    const listEl = document.getElementById("modal-reviews-list");







    if (countEl) countEl.textContent = count;







    if (avgEl) {



        if (count > 0) {



            const avg = prodReviews.reduce((sum, r) => sum + r.rating, 0) / count;



            avgEl.innerHTML = `${avg.toFixed(1)} <i class="fa-solid fa-star"></i>`;



            avgEl.style.display = "inline-block";



        } else {



            avgEl.innerHTML = `0.0 <i class="fa-solid fa-star"></i>`;



        }



    }







    if (listEl) {



        listEl.innerHTML = "";



        if (count === 0) {



            listEl.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); font-style:italic; padding: 10px 0;">Aucun avis pour le moment. Soyez le premier à donner votre avis !</p>`;



        } else {



            // Sort reviews by date descending



            const sortedReviews = [...prodReviews].sort((a, b) => new Date(b.date) - new Date(a.date));



            sortedReviews.forEach(r => {



                const dateFormatted = new Date(r.date).toLocaleDateString("fr-FR", {



                    day: "numeric",



                    month: "long",



                    year: "numeric"



                });







                const starsHtml = Array.from({ length: 5 }, (_, i) => {



                    return `<i class="${i < r.rating ? 'fa-solid' : 'fa-regular'} fa-star"></i>`;



                }).join('');







                const div = document.createElement("div");



                div.className = "review-item";



                div.innerHTML = `



                    <div class="review-item-header">



                        <div class="review-item-author">



                            <img src="${r.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(r.author)}" class="review-item-avatar" alt="Avatar">



                            <span class="review-item-name">${escapeHTML(r.author)}</span>



                        </div>



                        <div class="review-item-stars">${starsHtml}</div>



                    </div>



                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">



                        <span class="review-item-date">Le ${dateFormatted}</span>



                    </div>



                    <p class="review-item-text">${escapeHTML(r.text)}</p>



                `;



                listEl.appendChild(div);



            });



        }



    }







    // Auto fill form name



    const reviewAuthorInput = document.getElementById("review-author-name");



    if (reviewAuthorInput) {



        reviewAuthorInput.value = currentUser ? currentUser.name : "";



    }







    // Reset star selector to 5 active



    const starSelectorContainer = document.getElementById("star-rating-selector");



    if (starSelectorContainer) {



        const stars = starSelectorContainer.querySelectorAll(".star-select");



        stars.forEach(s => s.classList.add("active"));



    }



    const ratingVal = document.getElementById("review-rating-value");



    if (ratingVal) ratingVal.value = "5";



}







// Stars rating selector interactivity



const starSelectorContainer = document.getElementById("star-rating-selector");



if (starSelectorContainer) {



    starSelectorContainer.addEventListener("click", (e) => {



        const star = e.target.closest(".star-select");



        if (!star) return;







        const rating = parseInt(star.getAttribute("data-rating"));



        const ratingVal = document.getElementById("review-rating-value");



        if (ratingVal) ratingVal.value = rating;







        const stars = starSelectorContainer.querySelectorAll(".star-select");



        stars.forEach(s => {



            const r = parseInt(s.getAttribute("data-rating"));



            if (r <= rating) {



                s.classList.add("active");



            } else {



                s.classList.remove("active");



            }



        });



    });



}







// Add Review form submit handler



const addReviewForm = document.getElementById("add-review-form");



if (addReviewForm) {



    addReviewForm.addEventListener("submit", (e) => {



        e.preventDefault();







        if (!currentDetailProduct) {



            showToast("Une erreur est survenue lors de la sélection du produit.", "error");



            return;



        }







        const author = document.getElementById("review-author-name").value.trim();



        const text = document.getElementById("review-text-content").value.trim();



        const rating = parseInt(document.getElementById("review-rating-value").value) || 5;







        if (!author || !text) {



            showToast("Veuillez remplir tous les champs du commentaire.", "error");



            return;



        }







        const newReview = {



            id: "rev-" + Date.now(),



            productId: currentDetailProduct.id,



            author: author,



            rating: rating,



            text: text,



            date: new Date().toISOString(),



            avatar: currentUser ? currentUser.avatar : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(author)}`



        };







        reviews.push(newReview);



        localStorage.setItem("diaw_shoop_reviews", JSON.stringify(reviews));







        showToast("Votre avis a été publié avec succès ! Merci de votre retour.");







        // Clear text field



        document.getElementById("review-text-content").value = "";







        // Refresh reviews and catalog views



        renderProductReviews(currentDetailProduct.id);



        renderProductList();



    });



}







// Dynamic adjustment of stock fields (Simplified)



function adjustAdminStockFields() {



    // Handled by single stock-qty input



}















document.addEventListener("DOMContentLoaded", () => {



    const mobileMenuBtn = document.getElementById("mobile-menu-btn");



    const navMenu = document.getElementById("nav-menu");



    if (mobileMenuBtn && navMenu) {



        mobileMenuBtn.addEventListener("click", () => {



            if (navMenu.style.display === "block") {



                navMenu.style.display = "none";



            } else {



                navMenu.style.display = "block";



                navMenu.style.position = "absolute";



                navMenu.style.top = "70px";



                navMenu.style.left = "0";



                navMenu.style.width = "100%";



                navMenu.style.background = "#fff";



                navMenu.style.boxShadow = "0 4px 10px rgba(0,0,0,0.1)";



                navMenu.style.padding = "20px";



                navMenu.style.zIndex = "1000";



            }



        });



    }



});







// --- 15. DEDICATED CUSTOMER ASSISTANCE & CONTACT SYSTEM ---



const customerSupportForm = document.getElementById("customer-support-form");



const btnSubmitSupportWhatsapp = document.getElementById("btn-submit-support-whatsapp");



const btnRefreshSupportMessages = document.getElementById("btn-refresh-support-messages");







function getContactFormData() {



    const name = (document.getElementById("support-client-name")?.value || "").trim();



    const phone = (document.getElementById("support-client-phone")?.value || "").trim();



    const email = (document.getElementById("support-client-email")?.value || "").trim().toLowerCase();



    const orderId = (document.getElementById("support-order-id")?.value || "").trim();



    const issueType = (document.getElementById("support-issue-type")?.value || "Demande générale").trim();



    const message = (document.getElementById("support-message")?.value || "").trim();



    return { name, phone, email, orderId, issueType, message };



}







function saveSupportMessage(data, channel = "Email") {



    const messages = JSON.parse(localStorage.getItem("diaw_shoop_support_messages")) || [];



    const newMsg = {



        id: "MSG-" + Date.now().toString().slice(-6),



        name: data.name,



        phone: data.phone,



        email: data.email,



        orderId: data.orderId || "Non spécifié",



        issueType: data.issueType,



        message: data.message,



        channel: channel,



        status: "Nouveau",



        createdAt: new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),



        timestamp: Date.now()



    };



    messages.unshift(newMsg);



    localStorage.setItem("diaw_shoop_support_messages", JSON.stringify(messages));



    return newMsg;



}







if (customerSupportForm) {



    customerSupportForm.addEventListener("submit", (e) => {



        e.preventDefault();



        const data = getContactFormData();



        if (!data.name || !data.phone || !data.email || !data.message) {



            showToast("Veuillez renseigner tous les champs obligatoires (*).", "error");



            return;



        }







        const settings = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || {};



        const adminEmail = settings.email || "mamadoudiaw1105@gmail.com";



        const shopName = settings.shopName || "DIAW SHOOP";







        // Enregistrer dans la base locale pour l'Admin



        saveSupportMessage(data, "Email");







        // Préparer le lien mailto officiel



        const subject = `[${shopName} Support] ${data.issueType} - ${data.name}${data.orderId ? ' (Cmd: ' + data.orderId + ')' : ''}`;



        const emailBody = `Bonjour à l'équipe Service Client de ${shopName},\n\nUn client vient de vous soumettre une demande d'assistance via la boutique :\n\n- Nom du client : ${data.name}\n- Téléphone : ${data.phone}\n- Adresse e-mail : ${data.email}\n- Numéro de commande : ${data.orderId || 'N/A'}\n- Motif : ${data.issueType}\n\n--- MESSAGE DU CLIENT ---\n${data.message}\n\n-------------------------\nMessage envoyé le ${new Date().toLocaleString('fr-FR')}`;







        const mailtoUrl = `mailto:${encodeURIComponent(adminEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;







        // Ouvrir le client de messagerie du client vers l'adresse du support



        window.location.href = mailtoUrl;







        showToast("Votre message est transmis au Service Client !", "success");



        customerSupportForm.reset();



        if (typeof renderAdminSupportMessages === "function") renderAdminSupportMessages();



    });



}







if (btnSubmitSupportWhatsapp) {



    btnSubmitSupportWhatsapp.addEventListener("click", () => {



        const data = getContactFormData();



        if (!data.name || !data.phone || !data.message) {



            showToast("Veuillez renseigner votre nom, téléphone et message pour WhatsApp.", "error");



            return;



        }







        const settings = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || {};



        const shopWhatsapp = settings.whatsapp || "221705476061";



        const shopName = settings.shopName || "DIAW SHOOP";







        saveSupportMessage(data, "WhatsApp");







        const text = `Bonjour au Service Client de ${shopName},\nJ'ai une demande d'assistance concernant ma commande :\n\n*Nom :* ${data.name}\n*Téléphone :* ${data.phone}\n*Email :* ${data.email || 'N/A'}\n*Commande :* ${data.orderId || 'N/A'}\n*Motif :* ${data.issueType}\n\n*Message :*\n${data.message}`;







        window.open(`https://wa.me/${shopWhatsapp}?text=${encodeURIComponent(text)}`, "_blank");



        showToast("Ouverture de WhatsApp pour joindre le Service Client...", "success");



        customerSupportForm.reset();



        if (typeof renderAdminSupportMessages === "function") renderAdminSupportMessages();



    });



}







// Rendu des messages clients dans le panneau Admin



function renderAdminSupportMessages() {



    const listEl = document.getElementById("admin-support-messages-list");



    const badgeEl = document.getElementById("admin-support-badge");



    if (!listEl) return;







    const messages = JSON.parse(localStorage.getItem("diaw_shoop_support_messages")) || [];







    const newCount = messages.filter(m => m.status === "Nouveau").length;



    if (badgeEl) {



        badgeEl.style.display = newCount > 0 ? "inline-block" : "none";



        badgeEl.textContent = newCount;



    }







    if (messages.length === 0) {



        listEl.innerHTML = `



            <div class="loading-spinner-wrapper" style="padding: 30px; text-align: center;">



                <i class="fa-solid fa-inbox" style="font-size: 2.5rem; color: var(--border-color); margin-bottom: 10px;"></i>



                <p class="text-muted">Aucun message ni réclamation client pour le moment.</p>



            </div>



        `;



        return;



    }







    const settings = JSON.parse(localStorage.getItem("diaw_shoop_settings")) || {};



    const currentShopName = settings.shopName || "DIAW SHOOP";







    listEl.innerHTML = "";



    messages.forEach(msg => {



        const item = document.createElement("div");



        item.className = "admin-support-item";



        const isNew = msg.status === "Nouveau";



        const badgeColor = isNew ? "badge-accent" : "badge-success";







        item.innerHTML = `



            <div class="admin-support-header">



                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">



                    <strong style="font-size: 1rem; color: var(--primary);">${escapeHTML(msg.name)}</strong>



                    <span class="badge ${badgeColor}">${escapeHTML(msg.status)}</span>



                    <span class="badge" style="background: rgba(24,24,27,0.06); font-size: 0.75rem;">${escapeHTML(msg.issueType)}</span>



                    <span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-regular fa-clock"></i> ${escapeHTML(msg.createdAt)}</span>



                </div>



                <div style="font-size: 0.8rem; font-weight: 600; color: var(--accent-dark);">



                    Réf: ${escapeHTML(msg.id)}



                </div>



            </div>







            <div class="admin-support-client-info">



                <span><i class="fa-solid fa-phone text-muted"></i> <strong>${escapeHTML(msg.phone)}</strong></span>



                <span><i class="fa-solid fa-envelope text-muted"></i> <strong>${escapeHTML(msg.email)}</strong></span>



                <span><i class="fa-solid fa-box text-muted"></i> Commande : <strong>${escapeHTML(msg.orderId)}</strong></span>



                <span><i class="fa-solid fa-share-nodes text-muted"></i> Canal : ${escapeHTML(msg.channel)}</span>



            </div>







            <div class="admin-support-body">



                ${escapeHTML(msg.message)}



            </div>







            <div class="admin-support-actions">



                <a href="mailto:${escapeHTML(msg.email)}?subject=${encodeURIComponent('Réponse Service Client ' + currentShopName + ' - Demande ' + msg.id)}" class="btn btn-primary btn-sm" style="gap: 6px;">



                    <i class="fa-solid fa-reply"></i> Répondre par Email



                </a>



                <a href="https://wa.me/${escapeHTML(msg.phone.replace(/[^0-9]/g, ''))}?text=${encodeURIComponent('Bonjour ' + msg.name + ', c\'est le Service Client de ' + currentShopName + ' concernant votre demande :')}" target="_blank" class="btn btn-sm btn-success" style="gap: 6px;">



                    <i class="fa-brands fa-whatsapp"></i> Répondre sur WhatsApp



                </a>



                <button type="button" class="btn btn-secondary btn-sm" onclick="toggleSupportMessageStatus('${msg.id}')">



                    <i class="fa-solid fa-check"></i> ${isNew ? 'Marquer comme Traité' : 'Marquer comme Nouveau'}



                </button>



                <button type="button" class="btn btn-sm" style="color: #e11d48; background: #fee2e2;" onclick="deleteSupportMessage('${msg.id}')">



                    <i class="fa-solid fa-trash"></i> Supprimer



                </button>



            </div>



        `;



        listEl.appendChild(item);



    });



}







window.toggleSupportMessageStatus = function(msgId) {



    const messages = JSON.parse(localStorage.getItem("diaw_shoop_support_messages")) || [];



    const target = messages.find(m => m.id === msgId);



    if (target) {



        target.status = target.status === "Nouveau" ? "Traité" : "Nouveau";



        localStorage.setItem("diaw_shoop_support_messages", JSON.stringify(messages));



        renderAdminSupportMessages();



        showToast(`Statut du message ${msgId} mis à jour.`);



    }



};







window.deleteSupportMessage = async function(msgId) {



    if (!currentUser || !currentUser.isAdmin) {



        showToast("Accès refusé : session administrateur requise.", "error");



        return;



    }







    const confirmed = await showAdminConfirmModal({



        title: "Supprimer le message",



        message: "Voulez-vous supprimer définitivement ce message client ? Cette action est irréversible.",



        confirmText: "Supprimer le message"



    });







    if (!confirmed) return;







    let messages = JSON.parse(localStorage.getItem("diaw_shoop_support_messages")) || [];



    messages = messages.filter(m => String(m.id) !== String(msgId));



    localStorage.setItem("diaw_shoop_support_messages", JSON.stringify(messages));



    renderAdminSupportMessages();



    showToast("Message supprimé avec succès.");



};







if (btnRefreshSupportMessages) {



    btnRefreshSupportMessages.addEventListener("click", () => {



        renderAdminSupportMessages();



        showToast("Liste des messages actualisée.");



    });



}








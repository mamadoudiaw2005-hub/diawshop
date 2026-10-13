import os
import time
import json
import logging
import secrets
import html
from flask import Flask, request, jsonify, send_from_directory, abort
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask App (static_folder=None to ensure all static file requests are routed through secure serve_static)
app = Flask(__name__, static_folder=None)

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────
FLASK_PORT = int(os.getenv("FLASK_PORT", 8080))
FLASK_ENV = os.getenv("FLASK_ENV", "production")

# Token secret interne pour le simulateur de paiement
MOCK_SECRET_TOKEN = os.getenv("MOCK_SECRET_TOKEN") or secrets.token_hex(32)

# Fichier de log des commandes côté serveur
ORDERS_LOG_FILE = "server_orders.json"

# Limites de montant (FCFA)
MIN_PAYMENT_AMOUNT = 100
MAX_PAYMENT_AMOUNT = 5_000_000

# ─────────────────────────────────────────────
# RATE LIMITING (optionnel)
# ─────────────────────────────────────────────
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=[],  # Ne jamais limiter les fichiers statiques CSS/JS/images
        storage_uri="memory://"
    )
    logger.info("Flask-Limiter actif (réservé aux API).")
except ImportError:
    class _FakeLimiter:
        def limit(self, *a, **kw):
            def d(f): return f
            return d
        def exempt(self, f):
            return f
    limiter = _FakeLimiter()
    logger.warning("Flask-Limiter non installé. Rate limiting désactivé.")


# ─────────────────────────────────────────────
# HEADERS DE SÉCURITÉ HTTP
# ─────────────────────────────────────────────
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://accounts.google.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
        "img-src 'self' data: https: blob:; "
        "connect-src 'self' https://flopepsxpsyrpmhadqkx.supabase.co; "
        "frame-ancestors 'none';"
    )
    return response


# ─────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────
def log_order_server_side(order_data):
    """Sauvegarde les commandes et changements de statut côté serveur (audit log)."""
    try:
        orders = []
        if os.path.exists(ORDERS_LOG_FILE):
            with open(ORDERS_LOG_FILE, "r", encoding="utf-8") as f:
                orders = json.load(f)

        idx = next((i for i, o in enumerate(orders) if o.get("id") == order_data.get("id")), None)
        if idx is not None:
            orders[idx].update(order_data)
        else:
            orders.append(order_data)

        with open(ORDERS_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(orders, f, indent=4, ensure_ascii=False)
        logger.info(f"Commande {order_data.get('id')} enregistrée.")
    except Exception as e:
        logger.error(f"Erreur log commande : {e}")


def internal_error(e, ctx=""):
    logger.exception(f"Erreur interne [{ctx}] : {e}")
    return jsonify({"status": "error", "message": "Une erreur interne est survenue."}), 500


# ─────────────────────────────────────────────
# FICHIERS STATIQUES — Whitelist
# ─────────────────────────────────────────────
ALLOWED_EXTENSIONS = {
    '.html', '.css', '.js', '.webp', '.jpg', '.jpeg',
    '.png', '.gif', '.svg', '.ico', '.woff', '.woff2',
    '.ttf', '.otf', '.mp4', '.webm'
}

BLOCKED_FILES = {
    ".env", "server.py", "server_orders.json",
    "requirements.txt", ".gitignore", "Procfile"
}


@app.route("/")
@limiter.exempt
def serve_index():
    return send_from_directory(".", "index.html")


@app.route("/<path:path>")
@limiter.exempt
def serve_static(path):
    if ".." in path or path.startswith("/") or path.startswith("\\"):
        abort(403)
    basename = os.path.basename(path).lower()
    _, ext = os.path.splitext(basename)
    if basename in BLOCKED_FILES or basename.startswith("."):
        return jsonify({"status": "error", "message": "Accès interdit"}), 403
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"status": "error", "message": "Type de fichier non autorisé"}), 403
    return send_from_directory(".", path)


# ─────────────────────────────────────────────
# API — CRÉATION DE COMMANDE LOCALE
# ─────────────────────────────────────────────
@app.route("/api/create-order", methods=["POST"])
@limiter.limit("10 per minute; 50 per hour")
def create_order():
    """Crée une nouvelle commande et renvoie un portail de paiement simulé."""
    try:
        data = request.json or {}
        raw_amount = data.get("amount")
        customer_name = data.get("customer_name", "Client")
        customer_phone = data.get("customer_phone", "")
        customer_email = data.get("customer_email", "")
        payout_number = data.get("payout_number", "")
        payout_carrier = data.get("payout_carrier", "wave")
        items = data.get("items", [])

        # Validation du montant
        try:
            amount = int(raw_amount)
        except (TypeError, ValueError):
            return jsonify({"status": "error", "message": "Montant invalide."}), 400

        if not (MIN_PAYMENT_AMOUNT <= amount <= MAX_PAYMENT_AMOUNT):
            return jsonify({
                "status": "error",
                "message": f"Montant hors limites ({MIN_PAYMENT_AMOUNT} – {MAX_PAYMENT_AMOUNT:,} FCFA)."
            }), 400

        # Génération d'un ID de transaction unique et sécurisé
        transaction_id = f"DS-{int(time.time())}{secrets.randbelow(90) + 10}"

        # Enregistrement de la commande côté serveur
        log_order_server_side({
            "id": transaction_id,
            "amount": amount,
            "clientName": customer_name,
            "clientPhone": customer_phone,
            "clientEmail": customer_email,
            "status": "En attente de paiement",
            "payout_number": payout_number,
            "payout_carrier": payout_carrier,
            "items": items,
            "date": time.strftime("%Y-%m-%d %H:%M:%S")
        })

        # URL du portail simulé sécurisé
        payment_url = (
            f"/mock-checkout/{transaction_id}"
            f"?amount={amount}&payout_number={payout_number}"
            f"&payout_carrier={payout_carrier}&token={MOCK_SECRET_TOKEN}"
        )

        logger.info(f"Commande créée : {transaction_id} | {amount} FCFA | {customer_name}")
        return jsonify({
            "status": "success",
            "transaction_id": transaction_id,
            "payment_url": payment_url
        })

    except Exception as e:
        return internal_error(e, "create-order")


# ─────────────────────────────────────────────
# API — STATUT DE COMMANDE
# ─────────────────────────────────────────────
@app.route("/api/order-status/<transaction_id>", methods=["GET"])
@limiter.limit("30 per minute")
def get_order_status(transaction_id):
    """Retourne le statut actuel d'une commande depuis le log serveur."""
    if not transaction_id.startswith("DS-") or len(transaction_id) > 30:
        return jsonify({"status": "error", "message": "ID de commande invalide."}), 400

    try:
        if os.path.exists(ORDERS_LOG_FILE):
            with open(ORDERS_LOG_FILE, "r", encoding="utf-8") as f:
                orders = json.load(f)
            order = next((o for o in orders if o.get("id") == transaction_id), None)
            if order:
                order_status = order.get("status", "PENDING")
                payment_status = "ACCEPTED" if "Payée" in order_status else \
                                 "REFUSED" if "REFUSED" in order_status else "PENDING"
                return jsonify({
                    "status": "success",
                    "payment_status": payment_status,
                    "order_status": order_status,
                    "amount": order.get("amount", 0)
                })

        return jsonify({"status": "pending", "payment_status": "PENDING"})

    except Exception as e:
        return internal_error(e, "order-status")


# ─────────────────────────────────────────────
# PORTAIL DE PAIEMENT SIMULÉ (Mode Offline)
# ─────────────────────────────────────────────
@app.route("/mock-checkout/<transaction_id>", methods=["GET"])
def mock_checkout(transaction_id):
    """Portail de simulation de paiement mobile money (Wave, Orange Money, Free)."""
    token = request.args.get("token", "")
    if not secrets.compare_digest(token, MOCK_SECRET_TOKEN):
        logger.warning(f"Accès non autorisé au portail simulé — transaction: {transaction_id}")
        abort(403)

    amount = request.args.get("amount", "0")
    method = request.args.get("method", "Wave")
    payout_number = request.args.get("payout_number", "")
    payout_carrier = request.args.get("payout_carrier", "wave")

    # Échappement HTML pour prévenir l'injection
    safe_id = html.escape(transaction_id)
    safe_amount = html.escape(str(amount))
    safe_method = html.escape(method)
    safe_pn = html.escape(payout_number)
    safe_pc = html.escape(payout_carrier)

    page = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portail de Paiement — DIAW SHOOP</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {{--bg:#f4f6f9;--card:#fff;--text:#1e293b;--primary:#fb923c;--accent:#2563eb;--success:#10b981;--danger:#ef4444;--border:#e2e8f0;}}
        *{{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',sans-serif;}}
        body{{background:var(--bg);color:var(--text);display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px;}}
        .card{{background:var(--card);border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,.08);width:100%;max-width:450px;overflow:hidden;border:1px solid var(--border);}}
        .header{{background:linear-gradient(135deg,#1e293b,#0f172a);color:#fff;padding:30px 20px;text-align:center;position:relative;}}
        .header h2{{font-size:1.4rem;font-weight:600;margin-top:10px;}}
        .subtitle{{font-size:.85rem;color:#94a3b8;margin-top:5px;}}
        .badge{{position:absolute;top:15px;right:15px;background:var(--primary);color:#fff;font-size:.7rem;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;}}
        .content{{padding:30px 20px;}}
        .box{{background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:15px 20px;margin-bottom:25px;}}
        .row{{display:flex;justify-content:space-between;margin-bottom:10px;font-size:.9rem;}}
        .row:last-child{{margin-bottom:0;}}
        .amount{{font-size:1.5rem;font-weight:700;color:#0f172a;}}
        .fg{{margin-bottom:20px;}}
        .fg label{{display:block;font-size:.85rem;font-weight:600;margin-bottom:8px;color:#64748b;}}
        .iw{{position:relative;}}
        .iw i{{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:#94a3b8;}}
        .iw input{{width:100%;padding:12px 15px 12px 45px;border:1px solid var(--border);border-radius:10px;font-size:1rem;outline:none;transition:border-color .2s;}}
        .iw input:focus{{border-color:var(--primary);}}
        .actions{{display:flex;flex-direction:column;gap:12px;}}
        .btn{{width:100%;padding:14px;border:none;border-radius:10px;font-size:.95rem;font-weight:600;cursor:pointer;transition:all .2s;display:flex;justify-content:center;align-items:center;gap:8px;}}
        .btn-success{{background:var(--success);color:#fff;}} .btn-success:hover{{background:#059669;}}
        .btn-danger{{background:var(--danger);color:#fff;}} .btn-danger:hover{{background:#dc2626;}}
        .note{{text-align:center;font-size:.75rem;color:#94a3b8;margin-top:25px;}}
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <span class="badge">Mode Simulation</span>
            <i class="fa-solid fa-shield-halved" style="font-size:2.5rem;color:var(--primary);"></i>
            <h2>DIAW SHOOP Pay Portal</h2>
            <div class="subtitle">Portail de paiement sécurisé</div>
        </div>
        <div class="content">
            <div class="box">
                <div class="row"><span style="color:#64748b;">ID Commande :</span><span style="font-weight:600;">{safe_id}</span></div>
                <div class="row"><span style="color:#64748b;">Moyen de paiement :</span><span style="font-weight:600;color:var(--accent);text-transform:uppercase;">{safe_method}</span></div>
                <div class="row" style="margin-top:8px;border-top:1px dashed var(--border);padding-top:8px;font-size:.85rem;">
                    <span style="color:#64748b;">Compte destinataire :</span>
                    <span style="font-weight:600;color:var(--primary);text-transform:uppercase;">{safe_pc} ({safe_pn})</span>
                </div>
                <div class="row" style="margin-top:15px;border-top:1px solid var(--border);padding-top:15px;">
                    <span style="font-weight:600;align-self:center;">Montant total :</span>
                    <span class="amount">{safe_amount} FCFA</span>
                </div>
            </div>
            <div class="fg">
                <label for="sim-phone">Numéro de téléphone de validation</label>
                <div class="iw">
                    <i class="fa-solid fa-phone"></i>
                    <input type="tel" id="sim-phone" value="770000000" placeholder="Ex: 77 123 45 67">
                </div>
            </div>
            <div class="actions">
                <button class="btn btn-success" id="btn-ok">
                    <i class="fa-solid fa-circle-check"></i> Simuler un paiement RÉUSSI
                </button>
                <button class="btn btn-danger" id="btn-ko">
                    <i class="fa-solid fa-circle-xmark"></i> Simuler un paiement ÉCHOUÉ
                </button>
            </div>
            <p class="note"><i class="fa-solid fa-lock"></i> Ce portail simule le transfert vers {safe_pc.upper()} ({safe_pn}).</p>
        </div>
    </div>
    <script>
        const TOKEN = {json.dumps(MOCK_SECRET_TOKEN)};
        const TID = {json.dumps(safe_id)};

        function send(status) {{
            fetch("/api/mock-update", {{
                method: "POST",
                headers: {{"Content-Type": "application/json", "X-Mock-Token": TOKEN}},
                body: JSON.stringify({{transaction_id: TID, status}})
            }})
            .then(r => r.json())
            .then(() => {{
                alert(status === "ACCEPTED"
                    ? "Paiement simulé avec succès ! Vous pouvez fermer cet onglet et revenir sur votre boutique."
                    : "Paiement simulé comme ÉCHOUÉ. Vous pouvez fermer cet onglet.");
                window.close();
            }})
            .catch(() => alert("Erreur lors de la simulation."));
        }}

        document.getElementById("btn-ok").addEventListener("click", () => send("ACCEPTED"));
        document.getElementById("btn-ko").addEventListener("click", () => send("REFUSED"));
    </script>
</body>
</html>"""
    return page


# ─────────────────────────────────────────────
# API — MISE À JOUR MOCK (Protégée par token)
# ─────────────────────────────────────────────
@app.route("/api/mock-update", methods=["POST"])
def mock_update():
    """Met à jour le statut d'une commande simulée. Protégé par token secret."""
    provided_token = request.headers.get("X-Mock-Token", "")
    if not secrets.compare_digest(provided_token, MOCK_SECRET_TOKEN):
        logger.warning(f"Tentative non autorisée sur /api/mock-update depuis {request.remote_addr}")
        return jsonify({"status": "error", "message": "Accès non autorisé."}), 403

    try:
        data = request.json or {}
        transaction_id = data.get("transaction_id", "")
        status = data.get("status", "")

        if not transaction_id or not status:
            return jsonify({"status": "error", "message": "Paramètres manquants."}), 400

        if not transaction_id.startswith("DS-") or len(transaction_id) > 30:
            return jsonify({"status": "error", "message": "ID de commande invalide."}), 400

        if status not in ("ACCEPTED", "REFUSED"):
            return jsonify({"status": "error", "message": "Statut invalide."}), 400

        orders = []
        if os.path.exists(ORDERS_LOG_FILE):
            with open(ORDERS_LOG_FILE, "r", encoding="utf-8") as f:
                orders = json.load(f)

        order = next((o for o in orders if o.get("id") == transaction_id), None)
        if not order:
            return jsonify({"status": "error", "message": "Commande introuvable."}), 404

        order["status"] = "Payée (En attente d'expédition)" if status == "ACCEPTED" else "REFUSED"

        with open(ORDERS_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(orders, f, indent=4, ensure_ascii=False)

        logger.info(f"Commande {transaction_id} mise à jour : {status}")
        return jsonify({"status": "success", "message": "Statut mis à jour."})

    except Exception as e:
        return internal_error(e, "mock-update")


# ─────────────────────────────────────────────
# DÉMARRAGE
# ─────────────────────────────────────────────
if __name__ == "__main__":
    is_debug = FLASK_ENV == "development"
    logger.info(f"Demarrage DIAW SHOOP — port {FLASK_PORT} | debug={is_debug} | env={FLASK_ENV}")
    if is_debug:
        logger.warning("Mode DEBUG actif. Ne pas utiliser en production !")
    app.run(host="0.0.0.0", port=FLASK_PORT, debug=is_debug)

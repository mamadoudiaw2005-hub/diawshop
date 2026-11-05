-- =====================================================================
-- DIAW SHOOP — SCRIPT COMPLET & OFFICIEL SUPABASE CLOUD
-- =====================================================================
-- Ce script configure et synchronise en direct à 100% :
-- 1. diawshoop_products  : Catalogue connecté (synchronisé en temps réel multi-appareils)
-- 2. diawshoop_orders    : Archivage des commandes et livraisons clients
-- 3. store_admins        : Équipe d'administration Cloud (SuperAdmin & Admins secondaires)
-- 4. store_settings      : Paramètres de la boutique (WhatsApp, contact, livraisons)
-- 5. Politiques RLS      : Accès déverrouillé pour l'application (anon & authenticated)
-- 6. Données initiales   : Comptes administrateurs et catalogue initial
--
-- INSTRUCTIONS D'EXÉCUTION :
-- 1. Rendez-vous sur votre console Supabase :
--    https://supabase.com/dashboard/project/flopepsxpsyrpmhadqkx
-- 2. Dans le menu de gauche, cliquez sur "SQL Editor" puis "New query".
-- 3. Collez l'intégralité de ce script (Ctrl + A puis Ctrl + V).
-- 4. Cliquez sur le bouton vert "Run" (ou Ctrl + Enter).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLE : diawshoop_products (Catalogue centralisé Cloud)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.diawshoop_products (
    id text PRIMARY KEY,
    name text NOT NULL DEFAULT '',
    price numeric NOT NULL DEFAULT 0,
    old_price numeric DEFAULT 0,
    category text NOT NULL DEFAULT 'vetements',
    image_url text DEFAULT '',
    description text DEFAULT '',
    stock integer DEFAULT 20,
    is_active boolean DEFAULT true,
    has_sizes boolean DEFAULT true,
    size_type text DEFAULT 'multiple',
    video_url text DEFAULT '',
    stocks jsonb DEFAULT '{"S": 20, "M": 20, "L": 20, "XL": 20, "total": 20}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS old_price numeric DEFAULT 0;
ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'vetements';
ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';
ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS stock integer DEFAULT 20;
ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS has_sizes boolean DEFAULT true;
ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS size_type text DEFAULT 'multiple';
ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS video_url text DEFAULT '';
ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS stocks jsonb DEFAULT '{"S": 20, "M": 20, "L": 20, "XL": 20, "total": 20}'::jsonb;
ALTER TABLE public.diawshoop_products ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- ---------------------------------------------------------------------
-- 2. TABLE : diawshoop_orders (Commandes Clients)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.diawshoop_orders (
    id text PRIMARY KEY,
    reference text DEFAULT '',
    customer_name text NOT NULL DEFAULT 'Client',
    customer_email text DEFAULT '',
    customer_phone text NOT NULL DEFAULT '',
    items jsonb DEFAULT '[]'::jsonb,
    total_amount numeric NOT NULL DEFAULT 0,
    payment_method text DEFAULT 'Paiement à la livraison',
    status text DEFAULT 'Reçue (Paiement à la livraison)',
    shipping_address text DEFAULT '',
    shipping_cost numeric DEFAULT 0,
    notes text DEFAULT '',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.diawshoop_orders ADD COLUMN IF NOT EXISTS reference text DEFAULT '';
ALTER TABLE public.diawshoop_orders ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT 'Client';
ALTER TABLE public.diawshoop_orders ADD COLUMN IF NOT EXISTS customer_email text DEFAULT '';
ALTER TABLE public.diawshoop_orders ADD COLUMN IF NOT EXISTS customer_phone text NOT NULL DEFAULT '';
ALTER TABLE public.diawshoop_orders ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.diawshoop_orders ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.diawshoop_orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Paiement à la livraison';
ALTER TABLE public.diawshoop_orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'Reçue (Paiement à la livraison)';
ALTER TABLE public.diawshoop_orders ADD COLUMN IF NOT EXISTS shipping_address text DEFAULT '';
ALTER TABLE public.diawshoop_orders ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0;
ALTER TABLE public.diawshoop_orders ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE public.diawshoop_orders ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- ---------------------------------------------------------------------
-- 3. TABLE : store_admins (Comptes Administrateurs & Rôles Multi-appareils)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_admins (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email text UNIQUE NOT NULL,
    name text NOT NULL DEFAULT 'Administrateur',
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'admin',
    is_super_admin boolean DEFAULT false,
    permissions jsonb DEFAULT '{"canAddEdit": true, "canDelete": false, "canManageOrders": true}'::jsonb,
    avatar text DEFAULT '',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.store_admins ADD COLUMN IF NOT EXISTS email text UNIQUE;
ALTER TABLE public.store_admins ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Administrateur';
ALTER TABLE public.store_admins ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '';
ALTER TABLE public.store_admins ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';
ALTER TABLE public.store_admins ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;
ALTER TABLE public.store_admins ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{"canAddEdit": true, "canDelete": false, "canManageOrders": true}'::jsonb;
ALTER TABLE public.store_admins ADD COLUMN IF NOT EXISTS avatar text DEFAULT '';
ALTER TABLE public.store_admins ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- ---------------------------------------------------------------------
-- 4. TABLE : store_settings (Paramètres Boutique & Livraisons)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_settings (
    id text PRIMARY KEY DEFAULT 'current',
    shop_phone text DEFAULT '+221 70 547 60 61',
    shop_whatsapp text DEFAULT '221705476061',
    shop_address text DEFAULT 'Liberté 6 Extension, Dakar, Sénégal',
    shop_hours text DEFAULT 'Lun - Ven : 10h - 22h / Sam : 10h - 18h',
    instagram text DEFAULT 'https://instagram.com/',
    facebook text DEFAULT 'https://facebook.com/',
    tiktok text DEFAULT 'https://tiktok.com/',
    payout_number text DEFAULT '770000000',
    delivery_pricing jsonb DEFAULT '{"dakarCentre": 1500, "banlieue": 2500, "regions": 4000, "regionsEnabled": true, "pickupEnabled": true, "freeShippingThreshold": 35000}'::jsonb,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS shop_phone text DEFAULT '+221 70 547 60 61';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS shop_whatsapp text DEFAULT '221705476061';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS shop_address text DEFAULT 'Liberté 6 Extension, Dakar, Sénégal';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS shop_hours text DEFAULT 'Lun - Ven : 10h - 22h / Sam : 10h - 18h';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS instagram text DEFAULT 'https://instagram.com/';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS facebook text DEFAULT 'https://facebook.com/';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS tiktok text DEFAULT 'https://tiktok.com/';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS payout_number text DEFAULT '770000000';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS delivery_pricing jsonb DEFAULT '{"dakarCentre": 1500, "banlieue": 2500, "regions": 4000, "regionsEnabled": true, "pickupEnabled": true, "freeShippingThreshold": 35000}'::jsonb;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- ---------------------------------------------------------------------
-- 5. POLITIQUES DE SÉCURITÉ RLS (OUVERTURE COMPLÈTE POUR L'APP CLIENT/ADMIN)
-- ---------------------------------------------------------------------
ALTER TABLE public.diawshoop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diawshoop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Nettoyage des anciennes politiques
DROP POLICY IF EXISTS "Allow public read active products" ON public.diawshoop_products;
DROP POLICY IF EXISTS "Allow authenticated read all products" ON public.diawshoop_products;
DROP POLICY IF EXISTS "Allow authenticated insert products" ON public.diawshoop_products;
DROP POLICY IF EXISTS "Allow authenticated update products" ON public.diawshoop_products;
DROP POLICY IF EXISTS "Allow authenticated delete products" ON public.diawshoop_products;
DROP POLICY IF EXISTS "Allow all products" ON public.diawshoop_products;
DROP POLICY IF EXISTS "diawshoop_products_all" ON public.diawshoop_products;
DROP POLICY IF EXISTS "diawshoop_products_public_read" ON public.diawshoop_products;
DROP POLICY IF EXISTS "diawshoop_products_admin_all" ON public.diawshoop_products;

CREATE POLICY "diawshoop_products_all"
ON public.diawshoop_products
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Politiques diawshoop_orders
DROP POLICY IF EXISTS "Allow public insert orders" ON public.diawshoop_orders;
DROP POLICY IF EXISTS "Allow authenticated view orders" ON public.diawshoop_orders;
DROP POLICY IF EXISTS "Allow authenticated update orders" ON public.diawshoop_orders;
DROP POLICY IF EXISTS "Allow authenticated delete orders" ON public.diawshoop_orders;
DROP POLICY IF EXISTS "Allow all orders" ON public.diawshoop_orders;
DROP POLICY IF EXISTS "diawshoop_orders_all" ON public.diawshoop_orders;

CREATE POLICY "diawshoop_orders_all"
ON public.diawshoop_orders
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Politiques store_admins
DROP POLICY IF EXISTS "Allow all store_admins" ON public.store_admins;
DROP POLICY IF EXISTS "store_admins_all" ON public.store_admins;

CREATE POLICY "store_admins_all"
ON public.store_admins
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Politiques store_settings
DROP POLICY IF EXISTS "Allow all settings" ON public.store_settings;
DROP POLICY IF EXISTS "store_settings_all" ON public.store_settings;

CREATE POLICY "store_settings_all"
ON public.store_settings
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 6. DONNÉES INITIALES : COMPTES ADMINS PAR DÉFAUT
-- ---------------------------------------------------------------------
-- SuperAdmin : mamadoudiaw2005@gmail.com / Mot de passe : DIAW2005
INSERT INTO public.store_admins (email, name, password_hash, role, is_super_admin, permissions, avatar)
VALUES (
    'mamadoudiaw2005@gmail.com',
    'Mamadou Diaw (SuperAdmin)',
    '2e255bcc608685b2e62383639d0ee8d68d8f09221ad0365d5c3bc7597683f73f',
    'superadmin',
    true,
    '{"canAddEdit": true, "canDelete": true, "canManageOrders": true}'::jsonb,
    'https://api.dicebear.com/7.x/initials/svg?seed=Mamadou%20Diaw'
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = 'superadmin',
    is_super_admin = true,
    permissions = EXCLUDED.permissions;

-- Admin secondaire de référence : diarradiaw24@gmail.com / Mot de passe : diarra123
INSERT INTO public.store_admins (email, name, password_hash, role, is_super_admin, permissions, avatar)
VALUES (
    'diarradiaw24@gmail.com',
    'Diarra Diaw (Admin)',
    'fc4154ac9b53c6de2ebc7e302853b2750346520ab2ab0ca5e57e3aa1af98fcba',
    'admin',
    false,
    '{"canAddEdit": true, "canDelete": false, "canManageOrders": true}'::jsonb,
    'https://api.dicebear.com/7.x/initials/svg?seed=Diarra%20Diaw'
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = 'admin',
    is_super_admin = false,
    permissions = EXCLUDED.permissions;

-- ---------------------------------------------------------------------
-- 7. DONNÉES INITIALES : PARAMÈTRES BOUTIQUE
-- ---------------------------------------------------------------------
INSERT INTO public.store_settings (id, shop_phone, shop_whatsapp, shop_address, shop_hours, payout_number, delivery_pricing)
VALUES (
    'current',
    '+221 70 547 60 61',
    '221705476061',
    'Liberté 6 Extension, Dakar, Sénégal',
    'Lun - Ven : 10h - 22h / Sam : 10h - 18h',
    '770000000',
    '{"dakarCentre": 1500, "banlieue": 2500, "regions": 4000, "regionsEnabled": true, "pickupEnabled": true, "freeShippingThreshold": 35000}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 8. DONNÉES INITIALES : CATALOGUE DES 8 ARTICLES OFFICIELS
-- ---------------------------------------------------------------------
INSERT INTO public.diawshoop_products (id, name, price, old_price, category, image_url, description, stock, is_active, has_sizes, size_type, video_url, stocks)
VALUES
('prod-001', 'Abaya en Soie Premium Oud', 24500, 28000, 'vetements', 'assets/abaya_silk.webp', 'Robe abaya longue premium en soie de Médine fluide, coupe épurée et coutures dorées fines.', 20, true, true, 'multiple', '', '{"S": 5, "M": 5, "L": 5, "XL": 5, "total": 20}'::jsonb),
('prod-002', 'Robe Wax Évasée Reine Pokou', 18500, 22000, 'robes', 'assets/wax_dress.webp', 'Robe évasée en véritable tissu Wax hollandais aux motifs vibrants et coupe féminine ajustée.', 15, true, true, 'multiple', '', '{"S": 4, "M": 4, "L": 4, "XL": 3, "total": 15}'::jsonb),
('prod-003', 'Huile Éclat de Karité & Argan Bio', 8500, 11000, 'beaute', 'assets/cosmetic_oil.webp', 'Soin nourrissant visage et corps 100% naturel au beurre de karité bio du Sénégal et huile d''argan.', 35, true, false, 'none', '', '{"S": 35, "M": 35, "L": 35, "XL": 35, "total": 35}'::jsonb),
('prod-004', 'Parfum Mystère de Dakar 50ml', 16000, 19500, 'parfums', 'assets/perfume_gold.webp', 'Eau de parfum ambrée aux notes chaudes de vanille bourbon, musc blanc et encens traditionnel.', 25, true, false, 'none', '', '{"S": 25, "M": 25, "L": 25, "XL": 25, "total": 25}'::jsonb),
('prod-005', 'Kaftan Brodé Soirée Prestige', 32000, 38000, 'vetements', 'assets/kaftan_royal.webp', 'Kaftan d''apparat brodé main au fil de soie or, idéal pour cérémonies, mariages et soirées.', 10, true, true, 'multiple', '', '{"S": 2, "M": 3, "L": 3, "XL": 2, "total": 10}'::jsonb),
('prod-006', 'Sérum Régénérant Aloe & Hibiscus', 9500, 12000, 'beaute', 'assets/serum_rose.webp', 'Sérum tenseur hydratant enrichi en extraits de bissap (hibiscus) et gel d''aloe vera frais.', 30, true, false, 'none', '', '{"S": 30, "M": 30, "L": 30, "XL": 30, "total": 30}'::jsonb),
('prod-007', 'Ensemble Kimono & Jupe Plissée', 21500, 25000, 'vetements', 'assets/kimono_set.webp', 'Ensemble moderne chic 2 pièces : kimono fluide mi-long et jupe longue plissée assortie.', 18, true, true, 'multiple', '', '{"S": 5, "M": 5, "L": 4, "XL": 4, "total": 18}'::jsonb),
('prod-008', 'Encens Traditionnel Thiouraye Royal', 6500, 8500, 'parfums', 'assets/incense_pot.webp', 'Mélange aromatique d''écorces nobles macérées aux huiles essentielles rares pour parfumer la maison.', 40, true, false, 'none', '', '{"S": 40, "M": 40, "L": 40, "XL": 40, "total": 40}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    image_url = EXCLUDED.image_url,
    description = EXCLUDED.description;

-- =====================================================================

-- ---------------------------------------------------------------------
-- 9. PUBLICATION TEMPS REEL (Supabase Realtime)
-- ---------------------------------------------------------------------
DO $realtime$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.diawshoop_products;
EXCEPTION WHEN OTHERS THEN NULL;
END $realtime$;

DO $realtime$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.diawshoop_orders;
EXCEPTION WHEN OTHERS THEN NULL;
END $realtime$;

DO $realtime$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_admins;
EXCEPTION WHEN OTHERS THEN NULL;
END $realtime$;

DO $realtime$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
EXCEPTION WHEN OTHERS THEN NULL;
END $realtime$;

-- FIN DU SCRIPT — TOUT EST OPÉRATIONNEL À 100% SUR SUPABASE CLOUD
-- =====================================================================

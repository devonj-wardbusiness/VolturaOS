-- Add pricebook categories with Indoor / Outdoor Lighting hierarchy
-- Sub-categories use "Parent / Child" format (e.g. 'Indoor Lighting / Ceiling Fans')
-- Run in Supabase SQL Editor → volturaos database
-- Prices are starting points — adjust in Settings → Pricebook

INSERT INTO pricebook (name, description, unit_price, category) VALUES

-- ── Indoor Lighting / Fixtures ─────────────────────────────────────────────
('Light Fixture Installation', 'Install customer-supplied light fixture (existing wiring)', 125, 'Indoor Lighting / Fixtures'),
('Light Fixture Replacement', 'Swap existing fixture for new (customer-supplied)', 95, 'Indoor Lighting / Fixtures'),
('Chandelier Installation', 'Install chandelier up to 50 lbs (existing box)', 195, 'Indoor Lighting / Fixtures'),
('Under-Cabinet Lighting', 'Install under-cabinet LED strip or puck lights', 250, 'Indoor Lighting / Fixtures'),

-- ── Indoor Lighting / Ceiling Fans ────────────────────────────────────────
('Ceiling Fan Installation (existing box)', 'Install ceiling fan on existing rated box', 150, 'Indoor Lighting / Ceiling Fans'),
('Ceiling Fan Installation (new fan-rated box)', 'Install fan-rated box and ceiling fan', 250, 'Indoor Lighting / Ceiling Fans'),
('Ceiling Fan Replacement', 'Swap existing fan for new (customer-supplied)', 125, 'Indoor Lighting / Ceiling Fans'),
('Ceiling Fan with Remote Install', 'Install ceiling fan with wireless remote receiver', 175, 'Indoor Lighting / Ceiling Fans'),

-- ── Indoor Lighting / Recessed Cans ───────────────────────────────────────
('Recessed Can Installation (per can)', 'New construction or remodel recessed can, labor only', 185, 'Indoor Lighting / Recessed Cans'),
('Recessed Can Retrofit (per can)', 'Convert existing fixture to recessed can, labor only', 95, 'Indoor Lighting / Recessed Cans'),
('LED Recessed Can (per can)', 'Supply and install LED wafer/recessed can', 125, 'Indoor Lighting / Recessed Cans'),
('4" Recessed Can (per can)', 'Supply and install 4" LED recessed light', 115, 'Indoor Lighting / Recessed Cans'),
('6" Recessed Can (per can)', 'Supply and install 6" LED recessed light', 125, 'Indoor Lighting / Recessed Cans'),

-- ── Indoor Lighting / Surface Mount ──────────────────────────────────────
('Surface Mount Fixture Install', 'Install flush/semi-flush mount fixture (existing wiring)', 125, 'Indoor Lighting / Surface Mount'),
('Surface Mount Fixture Replacement', 'Replace existing surface mount fixture', 85, 'Indoor Lighting / Surface Mount'),
('Vanity Bar Install', 'Install bathroom vanity light bar', 125, 'Indoor Lighting / Surface Mount'),

-- ── Indoor Lighting / Bathroom Fans ──────────────────────────────────────
('Bathroom Fan Replacement', 'Replace existing bathroom exhaust fan (same location)', 195, 'Indoor Lighting / Bathroom Fans'),
('Bathroom Fan Installation (new)', 'Install new bath fan with new circuit and duct run', 425, 'Indoor Lighting / Bathroom Fans'),
('Bathroom Fan w/ Light Replacement', 'Replace combo bath fan/light unit', 225, 'Indoor Lighting / Bathroom Fans'),
('Bathroom Fan w/ Heat Lamp', 'Replace combo bath fan/heat lamp unit', 275, 'Indoor Lighting / Bathroom Fans'),

-- ── Outdoor Lighting / Exterior Fixtures ─────────────────────────────────
('Exterior Fixture Installation', 'Install exterior wall sconce or porch light', 150, 'Outdoor Lighting / Exterior Fixtures'),

-- ── Outdoor Lighting / Post Lights ───────────────────────────────────────
('Post Light Installation', 'Install post-mounted outdoor light (existing conduit)', 295, 'Outdoor Lighting / Post Lights'),

-- ── Outdoor Lighting / Soffit Lights ────────────────────────────────────
('Soffit Light Installation (per light)', 'Install soffit-mounted downlight', 165, 'Outdoor Lighting / Soffit Lights'),

-- ── Outdoor Lighting / Landscape Lighting ────────────────────────────────
('Landscape Lighting Circuit', 'Low-voltage landscape lighting circuit and transformer', 395, 'Outdoor Lighting / Landscape Lighting'),

-- ── Outdoor Lighting / Ring Floodlights ──────────────────────────────────
('Ring Floodlight Camera Install', 'Install Ring Floodlight Cam (customer-supplied)', 195, 'Outdoor Lighting / Ring Floodlights'),
('Ring Spotlight Camera Install', 'Install Ring Spotlight Cam (customer-supplied)', 175, 'Outdoor Lighting / Ring Floodlights'),
('Ring Floodlight (no camera)', 'Install Ring Floodlight without camera', 150, 'Outdoor Lighting / Ring Floodlights'),

-- ── Doorbells (standalone) ───────────────────────────────────────────────
('Doorbell Installation', 'Install wired doorbell button and chime', 125, 'Doorbells'),
('Doorbell Chime Replacement', 'Replace doorbell chime unit', 75, 'Doorbells'),
('Wireless Doorbell Installation', 'Install wireless doorbell kit (customer-supplied)', 65, 'Doorbells'),

-- ── Ring Doorbells (standalone) ──────────────────────────────────────────
('Ring Video Doorbell Installation', 'Install Ring Video Doorbell (hardwired, customer-supplied)', 150, 'Ring Doorbells'),
('Ring Video Doorbell Pro Install', 'Install Ring Pro (requires existing doorbell wiring)', 165, 'Ring Doorbells'),
('Ring Doorbell + Transformer', 'Install Ring doorbell and upgrade transformer', 225, 'Ring Doorbells'),

-- ── Transformers (standalone) ────────────────────────────────────────────
('Doorbell Transformer Replacement', 'Replace low-voltage doorbell transformer', 85, 'Transformers'),
('Low Voltage Transformer Install', 'Install new low-voltage transformer (landscape/doorbell)', 125, 'Transformers'),
('Irrigation Transformer Install', 'Install or replace irrigation system transformer', 145, 'Transformers'),

-- ── Junction Boxes (standalone) ──────────────────────────────────────────
('Junction Box Installation', 'Install new junction box and cover', 125, 'Junction Boxes'),
('Junction Box Replacement', 'Replace damaged or missing junction box', 85, 'Junction Boxes'),
('Weatherproof Box Install', 'Install weatherproof outdoor junction box', 145, 'Junction Boxes'),
('Junction Box Repair', 'Repair/secure loose or damaged junction box', 65, 'Junction Boxes'),

-- ── Disconnects (standalone) ─────────────────────────────────────────────
('AC Disconnect Installation', 'Install 60A non-fused AC disconnect', 295, 'Disconnects'),
('AC Disconnect Replacement', 'Replace existing AC disconnect', 250, 'Disconnects'),
('Fused Disconnect Installation', 'Install fused disconnect (60A)', 350, 'Disconnects'),
('Generator Disconnect', 'Install manual transfer disconnect for generator', 450, 'Disconnects'),
('Pool/Spa Disconnect', 'Install pool or spa safety disconnect', 325, 'Disconnects');

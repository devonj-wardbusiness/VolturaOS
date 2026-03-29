-- Voltura Power Group — Service Price Book
-- Source: Voltura_Service_PriceBook.xlsx (5% Loyalty Discount Applied)
-- Run this in your Supabase SQL editor to replace all pricebook entries.

TRUNCATE TABLE pricebook;

INSERT INTO pricebook (job_type, category, price_good, price_better, price_best, is_footage_item, per_foot_rate, active) VALUES

-- BREAKERS
('100-125 Amp Standard Stock Main Breaker',   'Breakers', 510.15, NULL, NULL, false, NULL, true),
('15-20 Amp 1-Pole',                           'Breakers', 209.00, NULL, NULL, false, NULL, true),
('15-20 Amp Single Pole AFCI/GFCI',            'Breakers', 383.80, NULL, NULL, false, NULL, true),
('15-20 Amp Tandem Breaker',                   'Breakers', 243.20, NULL, NULL, false, NULL, true),
('15-50 Amp Quad Breaker',                     'Breakers', 437.00, NULL, NULL, false, NULL, true),
('15-60 Amp 2-Pole',                           'Breakers', 226.10, NULL, NULL, false, NULL, true),
('150-200 Amp Standard Stock Main Breaker',    'Breakers', 1345.20, NULL, NULL, false, NULL, true),
('20-50 Amp 2-Pole AFCI/GFCI Breaker',        'Breakers', 478.80, NULL, NULL, false, NULL, true),
('70-100 Amp 2-Pole',                          'Breakers', 581.40, NULL, NULL, false, NULL, true),

-- CAR CHARGERS
('Install Car Charging Station - Level 1 (<5ft)',   'Car Chargers', 832.20,  NULL, NULL, false, NULL, true),
('Install Car Charging Station - Level 2 (<20ft)',  'Car Chargers', 1722.35, NULL, NULL, false, NULL, true),
('Install Car Charging Station - Level 3 (<50ft)',  'Car Chargers', 2480.45, NULL, NULL, false, NULL, true),

-- DEDICATED CIRCUITS (ROMEX)
('15-20 Amp Dedicated Up To 30 Ft.',           'Dedicated Circuits (Romex)', 1133.35, NULL, NULL, false, NULL, true),
('15-20 Amp Dedicated Up To 50 Ft.',           'Dedicated Circuits (Romex)', 1447.80, NULL, NULL, false, NULL, true),
('15-20 Amp Dedicated Up To 75 Ft.',           'Dedicated Circuits (Romex)', 1776.50, NULL, NULL, false, NULL, true),
('30 Amp Dedicated Up To 30 Ft.',              'Dedicated Circuits (Romex)', 1447.80, NULL, NULL, false, NULL, true),
('30 Amp Dedicated Up To 50 Ft.',              'Dedicated Circuits (Romex)', 1768.90, NULL, NULL, false, NULL, true),
('30 Amp Dedicated Up To 75 Ft.',              'Dedicated Circuits (Romex)', 2450.05, NULL, NULL, false, NULL, true),
('50 Amp Dedicated Up To 30 Ft.',              'Dedicated Circuits (Romex)', 2116.60, NULL, NULL, false, NULL, true),
('50 Amp Dedicated Up To 50 Ft.',              'Dedicated Circuits (Romex)', 2450.05, NULL, NULL, false, NULL, true),
('50 Amp Dedicated Up To 75 Ft.',              'Dedicated Circuits (Romex)', 2774.95, NULL, NULL, false, NULL, true),
('RV Outlet 30 Amp Dedicated Up To 50 Ft.',   'Dedicated Circuits (Romex)', 1957.95, NULL, NULL, false, NULL, true),
('RV Outlet 50 Amp Dedicated Up To 50 Ft.',   'Dedicated Circuits (Romex)', 2592.55, NULL, NULL, false, NULL, true),

-- DEDICATED CIRCUITS (CONDUIT/EMT)
('15-20 Amp Up To 25 Ft.',                     'Dedicated Circuits (Conduit/EMT)', 1053.55, NULL, NULL, false, NULL, true),
('15-20 Amp Up To 50 Ft.',                     'Dedicated Circuits (Conduit/EMT)', 1509.55, NULL, NULL, false, NULL, true),
('15-20 Amp Up To 75 Ft.',                     'Dedicated Circuits (Conduit/EMT)', 1720.45, NULL, NULL, false, NULL, true),
('30 Amp Up To 25 Ft.',                        'Dedicated Circuits (Conduit/EMT)', 1346.15, NULL, NULL, false, NULL, true),
('30 Amp Up To 50 Ft.',                        'Dedicated Circuits (Conduit/EMT)', 2046.30, NULL, NULL, false, NULL, true),
('30 Amp Up To 75 Ft.',                        'Dedicated Circuits (Conduit/EMT)', 2633.40, NULL, NULL, false, NULL, true),
('50-60 Amp Up To 25 Ft.',                     'Dedicated Circuits (Conduit/EMT)', 1768.90, NULL, NULL, false, NULL, true),
('50-60 Amp Up To 50 Ft.',                     'Dedicated Circuits (Conduit/EMT)', 2599.20, NULL, NULL, false, NULL, true),
('50-60 Amp Up To 75 Ft.',                     'Dedicated Circuits (Conduit/EMT)', 3127.40, NULL, NULL, false, NULL, true),

-- CIRCUIT EXTENSIONS
('15-20 Amp Up To 25 Ft. (Extension)',         'Circuit Extensions', 674.50,  NULL, NULL, false, NULL, true),
('15-20 Amp Up To 50 Ft. (Extension)',         'Circuit Extensions', 1120.05, NULL, NULL, false, NULL, true),
('15-20 Amp Up To 75 Ft. (Extension)',         'Circuit Extensions', 1566.55, NULL, NULL, false, NULL, true),
('30 Amp Up To 25 Ft. (Extension)',            'Circuit Extensions', 1236.90, NULL, NULL, false, NULL, true),
('30 Amp Up To 50 Ft. (Extension)',            'Circuit Extensions', 1539.95, NULL, NULL, false, NULL, true),
('30 Amp Up To 75 Ft. (Extension)',            'Circuit Extensions', 1848.70, NULL, NULL, false, NULL, true),
('50-60 Amp Up To 25 Ft. (Extension)',         'Circuit Extensions', 1653.00, NULL, NULL, false, NULL, true),
('50-60 Amp Up To 50 Ft. (Extension)',         'Circuit Extensions', 2022.55, NULL, NULL, false, NULL, true),
('50-60 Amp Up To 75 Ft. (Extension)',         'Circuit Extensions', 2130.85, NULL, NULL, false, NULL, true),

-- DEVICES — OUTLETS & SWITCHES
('120v/240v Cord Cap',                         'Devices', 261.25, NULL, NULL, false, NULL, true),
('Arc Fault Receptacle',                       'Devices', 206.15, NULL, NULL, false, NULL, true),
('Audible GFCI 120 Volt 15-20 Amp',           'Devices', 255.55, NULL, NULL, false, NULL, true),
('Caseta Dimmer Remote Switch Addition',       'Devices', 532.00, NULL, NULL, false, NULL, true),
('Digital Wall Switch Timer',                  'Devices', 534.85, NULL, NULL, false, NULL, true),
('GFCI with Bubble Cover',                     'Devices', 333.45, NULL, NULL, false, NULL, true),
('Install Premium Fan Speed/Light Control',    'Devices', 247.95, NULL, NULL, false, NULL, true),
('Install S/P or 3-Way 600w Premium Dimmer',  'Devices', 267.90, NULL, NULL, false, NULL, true),
('Low Volt Electronic Dimmer (24v Tape Light)','Devices', 565.25, NULL, NULL, false, NULL, true),
('Low Volt Magnetic Specialty Dimmer',         'Devices', 447.45, NULL, NULL, false, NULL, true),
('Motion Sensor Switch',                       'Devices', 315.40, NULL, NULL, false, NULL, true),
('Replace 15-20 Amp Receptacle or Switch',    'Devices', 110.20, NULL, NULL, false, NULL, true),
('Replace Dryer or Range Cord',                'Devices', 316.35, NULL, NULL, false, NULL, true),
('Replace Dryer Outlet Level 1',               'Devices', 247.95, NULL, NULL, false, NULL, true),
('Replace Dryer Outlet Level 2',               'Devices', 392.35, NULL, NULL, false, NULL, true),
('Replace GFCI 125 Volt 15-20 Amp',           'Devices', 229.90, NULL, NULL, false, NULL, true),
('Replace Range Outlet Level 1',               'Devices', 310.65, NULL, NULL, false, NULL, true),
('Replace Range Outlet Level 2',               'Devices', 392.35, NULL, NULL, false, NULL, true),
('Single Bubble Cover',                        'Devices', 148.20, NULL, NULL, false, NULL, true),
('Stacked Switch Specialty',                   'Devices', 285.95, NULL, NULL, false, NULL, true),
('Stacked Switch Standard',                    'Devices', 317.30, NULL, NULL, false, NULL, true),
('Surge Protected Outlet',                     'Devices', 225.15, NULL, NULL, false, NULL, true),
('Two Gang Bubble Cover',                      'Devices', 198.55, NULL, NULL, false, NULL, true),
('USB Receptacle',                             'Devices', 274.55, NULL, NULL, false, NULL, true),
('USB Receptacle/GFCI',                        'Devices', 473.10, NULL, NULL, false, NULL, true),

-- PANEL REJUVENATIONS
('20 Circuit Panel Rejuvenation',              'Panel Rejuvenations', 2336.05, NULL, NULL, false, NULL, true),
('42 Circuit Panel Rejuvenation',              'Panel Rejuvenations', 4208.50, NULL, NULL, false, NULL, true),
('42 Circuit Specialty Panel Rejuvenation',    'Panel Rejuvenations', 4435.55, NULL, NULL, false, NULL, true),
('Up to 10 Circuit Sub Panel Rejuvenation',    'Panel Rejuvenations', 1330.00, NULL, NULL, false, NULL, true),

-- TRENCHING (per-foot items)
('Install 20A/30A 120/240V PVC & Wire Per Ft.', 'Trenching', NULL, NULL, NULL, true, 44.65, true),
('Install 50/60A 240V PVC & Wire Per Ft.',      'Trenching', NULL, NULL, NULL, true, 47.50, true),
('Install 100/125A 240V PVC & Wire Per Ft.',    'Trenching', NULL, NULL, NULL, true, 64.60, true),
('Install 150A 240V PVC & Wire Per Ft.',        'Trenching', NULL, NULL, NULL, true, 84.55, true),
('Install 200A 240V PVC & Wire Per Ft.',        'Trenching', NULL, NULL, NULL, true, 95.00, true),
('Trencher Rental',                             'Trenching', 1098.20, NULL, NULL, false, NULL, true);

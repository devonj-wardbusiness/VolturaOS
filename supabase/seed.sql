-- supabase/seed.sql
insert into pricebook (job_type, description_good, description_better, description_best, price_good, price_better, price_best) values
('Panel upgrade 100A→200A', 'Standard 200A upgrade, code compliant', '200A upgrade with AFCI/GFCI and surge protection', 'Premium 200A upgrade, full permit, labeled panel, surge, warranty', 3200, 4200, 5800),
('Panel upgrade 200A→400A', 'Standard 400A upgrade, code compliant', '400A upgrade with AFCI/GFCI and surge protection', 'Premium 400A upgrade, full permit, labeled panel, surge, warranty', 5500, 7500, 9500),
('EV Charger L2 (circuit only)', 'Dedicated 50A circuit to garage', '50A circuit with conduit and junction box', 'Full conduit install, dedicated circuit, permit included', 850, 1200, 1650),
('EV Charger L2 (full install)', 'Circuit + Level 2 charger mounted', 'Circuit + smart charger + permit', 'Full install, permit, smart charger, warranty', 1200, 1600, 2100),
('New circuit 20A', 'Standard 20A circuit', '20A AFCI circuit with new outlet', '20A AFCI circuit, permit, dedicated run', 350, 500, 750),
('New circuit 240V dedicated', '240V dedicated circuit', '240V circuit with GFCI protection', '240V permit-ready circuit with warranty', 550, 750, 1100),
('Breaker replacement (standard)', 'Replace single standard breaker', 'Replace breaker + inspect panel', 'Replace breaker + panel inspection + report', 175, 250, 375),
('AFCI breaker replacement', 'Replace with AFCI breaker', 'Replace AFCI + test circuit', 'Replace AFCI + full circuit test + report', 225, 325, 450),
('GFCI outlet install', 'Install GFCI outlet', 'GFCI outlet + test downstream', 'GFCI outlet + test + label all protected outlets', 175, 250, 325),
('Standard outlet install', 'Install standard outlet', 'Outlet + box upgrade', 'Outlet + box + cover + test', 150, 200, 275),
('Ceiling fan (existing box)', 'Install fan on existing rated box', 'Fan + remote control', 'Fan + remote + brace + test', 175, 250, 325),
('Ceiling fan (new wiring)', 'Install fan with new wiring from panel', 'Fan + switch + new wiring', 'Fan + dimmer switch + new wiring + permit', 375, 500, 675),
('Service call / diagnostic', 'Diagnostic fee (applied to repair if approved)', null, null, 175, null, null),
('Smoke/CO detector', 'Install single detector', 'Install + test with existing system', 'Install + interconnect + test all', 125, 175, 225),
('Whole-home surge protector', 'Panel-mounted surge protector', 'Surge protector + warranty', 'Premium surge protector + permit + warranty', 350, 500, 650),
('Electrical inspection', 'Visual panel inspection + report', 'Panel inspection + load calculation', 'Full inspection + load calc + written report', 175, 250, 325),
('Subpanel install', 'Standard subpanel installation', 'Subpanel + AFCI/GFCI breakers', 'Full subpanel + permit + all AFCI/GFCI + warranty', 1800, 2500, 3800);
